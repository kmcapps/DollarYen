import { describe, expect, it, vi } from "vitest";
import { fetchUsdJpyRate, parseRateResponse, RATE_API_URL } from "./rateService";

describe("parseRateResponse", () => {
  it("accepts a Frankfurter USD/JPY observation and attaches local fetch metadata", () => {
    expect(
      parseRateResponse(
        { date: "2026-09-15", base: "USD", quote: "JPY", rate: 147.25 },
        "2026-09-15T03:04:05.000Z",
      ),
    ).toEqual({
      rate: 147.25,
      rateDate: "2026-09-15",
      fetchedAt: "2026-09-15T03:04:05.000Z",
      source: "Frankfurter",
    });
  });

  it.each([
    ["null", null],
    ["array", []],
    ["wrong base", { date: "2026-09-15", base: "EUR", quote: "JPY", rate: 147.25 }],
    ["wrong quote", { date: "2026-09-15", base: "USD", quote: "EUR", rate: 147.25 }],
    ["zero rate", { date: "2026-09-15", base: "USD", quote: "JPY", rate: 0 }],
    ["negative rate", { date: "2026-09-15", base: "USD", quote: "JPY", rate: -1 }],
    ["nonfinite rate", { date: "2026-09-15", base: "USD", quote: "JPY", rate: Infinity }],
    ["impossible date", { date: "2026-02-29", base: "USD", quote: "JPY", rate: 147.25 }],
    ["loose date", { date: "2026-9-15", base: "USD", quote: "JPY", rate: 147.25 }],
    ["missing field", { date: "2026-09-15", base: "USD", rate: 147.25 }],
  ])("rejects malformed response: %s", (_name, input) => {
    expect(() => parseRateResponse(input, "2026-09-15T03:04:05.000Z")).toThrow(Error);
  });
});

describe("fetchUsdJpyRate", () => {
  const safeErrorMessage = "Unable to fetch exchange rate";

  it("fetches the exact Frankfurter URL with an abort signal and parses JSON using injected time", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ date: "2026-09-15", base: "USD", quote: "JPY", rate: 147.25 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      fetchUsdJpyRate({
        fetchImpl,
        now: () => new Date("2026-09-15T03:04:05.000Z"),
      }),
    ).resolves.toEqual({
      rate: 147.25,
      rateDate: "2026-09-15",
      fetchedAt: "2026-09-15T03:04:05.000Z",
      source: "Frankfurter",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(RATE_API_URL);
    expect(fetchImpl.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ["HTTP", async () => new Response("secret upstream body", { status: 500 }), "secret upstream body"],
    ["non-JSON", async () => new Response("not-json", { status: 200 })],
    [
      "schema",
      async () =>
        new Response(JSON.stringify({ date: "2026-09-15", base: "EUR", quote: "JPY", rate: 147.25 }), {
          status: 200,
        }),
    ],
  ])("translates %s failures to a safe generic error", async (_name, impl, leakedText?: string) => {
    try {
      await fetchUsdJpyRate({
        fetchImpl: impl,
        now: () => new Date("2026-09-15T03:04:05.000Z"),
      });
      throw new Error("expected fetchUsdJpyRate to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(safeErrorMessage);
      if (leakedText !== undefined) {
        expect((error as Error).message).not.toContain(leakedText);
      }
    }
  });

  it("aborts a slow request after the configured timeout and clears its timer", async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );

    const result = fetchUsdJpyRate({
      fetchImpl,
      now: () => new Date("2026-09-15T03:04:05.000Z"),
      timeoutMs: 25,
    });
    const rejection = expect(result).rejects.toThrow("Unable to fetch exchange rate");

    await vi.advanceTimersByTimeAsync(25);
    await rejection;
    expect(fetchImpl.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  it("uses the exact default 8000ms timeout when no timeout is provided", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );

    const result = fetchUsdJpyRate({
      fetchImpl,
      now: () => new Date("2026-09-15T03:04:05.000Z"),
    });
    const rejection = expect(result).rejects.toMatchObject({ message: safeErrorMessage });

    await vi.advanceTimersByTimeAsync(7999);
    expect(fetchImpl.mock.calls[0][1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await rejection;

    vi.useRealTimers();
  });
});
