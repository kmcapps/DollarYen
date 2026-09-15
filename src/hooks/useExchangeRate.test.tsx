import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RateObservation, StoredRate } from "../rates/types";
import { RATE_CACHE_KEY } from "../rates/rateCache";
import { useExchangeRate } from "./useExchangeRate";

function observation(overrides: Partial<RateObservation> = {}): RateObservation {
  return {
    rate: 147.25,
    rateDate: "2026-09-15",
    fetchedAt: "2026-09-15T03:04:05.000Z",
    source: "Frankfurter",
    ...overrides,
  };
}

function stored(overrides: Partial<StoredRate> = {}): StoredRate {
  return {
    version: 1,
    ...observation(),
    ...overrides,
  };
}

function storageWith(value: unknown): Storage {
  const storedValue = typeof value === "string" ? value : JSON.stringify(value);

  return {
    getItem: (key: string) => {
      expect(key).toBe(RATE_CACHE_KEY);
      return storedValue;
    },
    setItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 1,
    removeItem: vi.fn(),
  };
}

function emptyStorage(): Storage {
  return {
    getItem: () => null,
    setItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
    removeItem: vi.fn(),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

describe("useExchangeRate", () => {
  const nowMs = () => Date.parse("2026-09-15T03:04:05.000Z");

  it("starts in loading with a fresh cached rate while the automatic fetch is pending", () => {
    const pending = deferred<RateObservation>();

    const { result } = renderHook(() =>
      useExchangeRate({
        fetchRate: () => pending.promise,
        storage: storageWith(stored()),
        nowMs,
      }),
    );

    expect(result.current.state).toEqual({ kind: "loading", rate: observation() });
  });

  it("starts in loading with null when no fresh cached rate exists", () => {
    const pending = deferred<RateObservation>();

    const { result } = renderHook(() =>
      useExchangeRate({
        fetchRate: () => pending.promise,
        storage: emptyStorage(),
        nowMs,
      }),
    );

    expect(result.current.state).toEqual({ kind: "loading", rate: null });
  });

  it("stores a successful automatic fetch and exposes it as online", async () => {
    const fetched = observation({ rate: 148.5, fetchedAt: "2026-09-15T04:00:00.000Z" });
    const setItem = vi.fn();

    const { result } = renderHook(() =>
      useExchangeRate({
        fetchRate: () => Promise.resolve(fetched),
        storage: { ...emptyStorage(), setItem },
        nowMs,
      }),
    );

    await waitFor(() => expect(result.current.state).toEqual({ kind: "online", rate: fetched }));
    expect(setItem).toHaveBeenCalledWith(RATE_CACHE_KEY, JSON.stringify({ version: 1, ...fetched }));
  });

  it("shares the initial StrictMode automatic fetch while the surviving mount reaches online", async () => {
    const fetched = observation({ rate: 148.5, fetchedAt: "2026-09-15T04:00:00.000Z" });
    const fetchRate = vi.fn<() => Promise<RateObservation>>(() => Promise.resolve(fetched));

    const { result } = renderHook(
      () =>
        useExchangeRate({
          fetchRate,
          storage: emptyStorage(),
          nowMs,
        }),
      { wrapper: StrictMode },
    );

    await waitFor(() => expect(result.current.state).toEqual({ kind: "online", rate: fetched }));
    expect(fetchRate).toHaveBeenCalledTimes(1);
  });

  it("falls back to the cached rate when the automatic fetch fails", async () => {
    const cached = observation({ rate: 146.75 });

    const { result } = renderHook(() =>
      useExchangeRate({
        fetchRate: () => Promise.reject(new Error("network down")),
        storage: storageWith(stored(cached)),
        nowMs,
      }),
    );

    await waitFor(() => expect(result.current.state).toEqual({ kind: "cached", rate: cached }));
  });

  it("becomes unavailable when the automatic fetch fails without a valid cached rate", async () => {
    const { result } = renderHook(() =>
      useExchangeRate({
        fetchRate: () => Promise.reject(new Error("network down")),
        storage: emptyStorage(),
        nowMs,
      }),
    );

    await waitFor(() => expect(result.current.state).toEqual({ kind: "unavailable", rate: null }));
  });

  it("keeps the current available rate during manual refresh and resolves after the attempt settles", async () => {
    const first = deferred<RateObservation>();
    const second = deferred<RateObservation>();
    const fetchRate = vi
      .fn<() => Promise<RateObservation>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const current = observation({ rate: 148.5, fetchedAt: "2026-09-15T04:00:00.000Z" });
    const refreshed = observation({ rate: 149.1, fetchedAt: "2026-09-15T05:00:00.000Z" });

    const { result } = renderHook(() =>
      useExchangeRate({
        fetchRate,
        storage: emptyStorage(),
        nowMs,
      }),
    );

    await act(async () => {
      first.resolve(current);
      await first.promise;
    });
    expect(result.current.state).toEqual({ kind: "online", rate: current });

    let settled = false;
    let refreshPromise!: Promise<void>;
    act(() => {
      refreshPromise = result.current.refresh().then(() => {
        settled = true;
      });
    });

    expect(result.current.state).toEqual({ kind: "loading", rate: current });
    expect(settled).toBe(false);

    await act(async () => {
      second.resolve(refreshed);
      await refreshPromise;
    });

    expect(settled).toBe(true);
    expect(result.current.state).toEqual({ kind: "online", rate: refreshed });
  });

  it("keeps the refresh function reference stable across rerenders", async () => {
    const pending = deferred<RateObservation>();

    const { result, rerender } = renderHook(() =>
      useExchangeRate({
        fetchRate: () => pending.promise,
        storage: emptyStorage(),
        nowMs,
      }),
    );
    const initialRefresh = result.current.refresh;

    rerender();

    expect(result.current.refresh).toBe(initialRefresh);
  });

  it("suppresses duplicate refreshes while a request is active", async () => {
    const first = deferred<RateObservation>();
    const refresh = deferred<RateObservation>();
    const fetchRate = vi
      .fn<() => Promise<RateObservation>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(refresh.promise);

    const { result } = renderHook(() =>
      useExchangeRate({
        fetchRate,
        storage: emptyStorage(),
        nowMs,
      }),
    );

    await act(async () => {
      first.resolve(observation());
      await first.promise;
    });

    let firstRefresh!: Promise<void>;
    let secondRefresh!: Promise<void>;
    act(() => {
      firstRefresh = result.current.refresh();
      secondRefresh = result.current.refresh();
    });

    expect(fetchRate).toHaveBeenCalledTimes(2);

    await act(async () => {
      refresh.resolve(observation({ rate: 148.5, fetchedAt: "2026-09-15T04:00:00.000Z" }));
      await Promise.all([firstRefresh, secondRefresh]);
    });

    expect(result.current.state).toEqual({
      kind: "online",
      rate: observation({ rate: 148.5, fetchedAt: "2026-09-15T04:00:00.000Z" }),
    });
  });

  it("does not let an obsolete automatic request overwrite a manual refresh result", async () => {
    const firstAutomatic = deferred<RateObservation>();
    const manualRefresh = deferred<RateObservation>();
    const fetchRate = vi
      .fn<() => Promise<RateObservation>>()
      .mockReturnValueOnce(firstAutomatic.promise)
      .mockReturnValueOnce(manualRefresh.promise);
    const oldRate = observation({ rate: 145.1, fetchedAt: "2026-09-15T02:00:00.000Z" });
    const newRate = observation({ rate: 149.9, fetchedAt: "2026-09-15T05:00:00.000Z" });

    const { result } = renderHook(() =>
      useExchangeRate({
        fetchRate,
        storage: emptyStorage(),
        nowMs,
      }),
    );

    let refreshPromise!: Promise<void>;
    act(() => {
      refreshPromise = result.current.refresh();
    });

    await act(async () => {
      manualRefresh.resolve(newRate);
      await refreshPromise;
    });

    expect(result.current.state).toEqual({ kind: "online", rate: newRate });

    await act(async () => {
      firstAutomatic.resolve(oldRate);
      await firstAutomatic.promise;
    });

    expect(result.current.state).toEqual({ kind: "online", rate: newRate });
  });

  it("does not update state after unmount", async () => {
    const pending = deferred<RateObservation>();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { unmount } = renderHook(() =>
      useExchangeRate({
        fetchRate: () => pending.promise,
        storage: emptyStorage(),
        nowMs,
      }),
    );

    unmount();

    await act(async () => {
      pending.resolve(observation());
      await pending.promise;
    });

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("ignores storage read and write failures", async () => {
    const fetched = observation({ rate: 150.25, fetchedAt: "2026-09-15T06:00:00.000Z" });
    const storage: Storage = {
      getItem: () => {
        throw new Error("read failed");
      },
      setItem: () => {
        throw new Error("write failed");
      },
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
      removeItem: vi.fn(),
    };

    const { result } = renderHook(() =>
      useExchangeRate({
        fetchRate: () => Promise.resolve(fetched),
        storage,
        nowMs,
      }),
    );

    expect(result.current.state).toEqual({ kind: "loading", rate: null });
    await waitFor(() => expect(result.current.state).toEqual({ kind: "online", rate: fetched }));
  });
});
