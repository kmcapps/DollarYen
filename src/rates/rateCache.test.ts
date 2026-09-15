import { describe, expect, it } from "vitest";
import { RATE_CACHE_KEY, readFreshRate, writeRate } from "./rateCache";
import type { RateObservation, StoredRate } from "./types";

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

describe("writeRate", () => {
  it("stores a versioned rate observation under the rate cache key", () => {
    const calls: Array<[string, string]> = [];

    expect(
      writeRate(
        {
          setItem: (key, value) => calls.push([key, value]),
        },
        observation(),
      ),
    ).toBe(true);

    expect(calls).toEqual([
      [
        RATE_CACHE_KEY,
        JSON.stringify({
          version: 1,
          rate: 147.25,
          rateDate: "2026-09-15",
          fetchedAt: "2026-09-15T03:04:05.000Z",
          source: "Frankfurter",
        }),
      ],
    ]);
  });

  it("returns false when storage rejects the write", () => {
    expect(
      writeRate(
        {
          setItem: () => {
            throw new Error("quota");
          },
        },
        observation(),
      ),
    ).toBe(false);
  });
});

describe("readFreshRate", () => {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fetchedAtMs = Date.parse("2026-09-15T03:04:05.000Z");

  function read(value: unknown, nowMs = fetchedAtMs): RateObservation | null {
    return readFreshRate(
      {
        getItem: (key) => {
          expect(key).toBe(RATE_CACHE_KEY);
          return typeof value === "string" ? value : JSON.stringify(value);
        },
      },
      nowMs,
    );
  }

  it("returns null when no cached value exists", () => {
    expect(
      readFreshRate(
        {
          getItem: (key) => {
            expect(key).toBe(RATE_CACHE_KEY);
            return null;
          },
        },
        fetchedAtMs,
      ),
    ).toBeNull();
  });

  it("returns null when storage rejects the read", () => {
    expect(
      readFreshRate(
        {
          getItem: () => {
            throw new Error("storage is unavailable");
          },
        },
        fetchedAtMs,
      ),
    ).toBeNull();
  });

  it("returns a cached observation when it is exactly seven days old", () => {
    expect(read(stored(), fetchedAtMs + sevenDaysMs)).toEqual({
      rate: 147.25,
      rateDate: "2026-09-15",
      fetchedAt: "2026-09-15T03:04:05.000Z",
      source: "Frankfurter",
    });
  });

  it.each([
    ["JSON null", null],
    ["bad JSON", "{not-json"],
    ["unknown version", stored({ version: 2 as 1 })],
    ["wrong source", stored({ source: "Other" as "Frankfurter" })],
    ["invalid rate", stored({ rate: Number.NaN })],
    ["impossible rate date", stored({ rateDate: "2026-02-29" })],
    ["loose rate date", stored({ rateDate: "2026-9-15" })],
    ["invalid timestamp", stored({ fetchedAt: "2026-09-15 03:04:05Z" })],
    ["future fetchedAt", stored({ fetchedAt: "2026-09-15T03:04:06.000Z" })],
    ["expired fetchedAt", stored(), fetchedAtMs + sevenDaysMs + 1],
  ])("returns null for %s", (_name, value, nowMs = fetchedAtMs) => {
    expect(read(value, nowMs)).toBeNull();
  });

  it("does not use the calendar rate date for freshness", () => {
    expect(read(stored({ rateDate: "2026-09-08" }), fetchedAtMs + sevenDaysMs)).toEqual({
      rate: 147.25,
      rateDate: "2026-09-08",
      fetchedAt: "2026-09-15T03:04:05.000Z",
      source: "Frankfurter",
    });
  });
});
