import type { RateObservation, StoredRate } from "./types";

export const RATE_CACHE_KEY = "dollaryen:usd-jpy-rate:v1";

const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function isStrictCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isStrictIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }

  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === value;
}

function parseStoredRate(input: unknown): StoredRate | null {
  if (
    !isPlainObject(input) ||
    input.version !== 1 ||
    input.source !== "Frankfurter" ||
    typeof input.rate !== "number" ||
    !Number.isFinite(input.rate) ||
    input.rate <= 0 ||
    !isStrictCalendarDate(input.rateDate) ||
    !isStrictIsoTimestamp(input.fetchedAt)
  ) {
    return null;
  }

  return {
    version: 1,
    rate: input.rate,
    rateDate: input.rateDate,
    fetchedAt: input.fetchedAt,
    source: "Frankfurter",
  };
}

export function readFreshRate(storage: Pick<Storage, "getItem">, nowMs = Date.now()): RateObservation | null {
  let rawValue: string | null;
  try {
    rawValue = storage.getItem(RATE_CACHE_KEY);
  } catch {
    return null;
  }

  if (rawValue === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return null;
  }

  const stored = parseStoredRate(parsed);
  if (stored === null) {
    return null;
  }

  const elapsedMs = nowMs - Date.parse(stored.fetchedAt);
  if (elapsedMs < 0 || elapsedMs > MAX_CACHE_AGE_MS) {
    return null;
  }

  return {
    rate: stored.rate,
    rateDate: stored.rateDate,
    fetchedAt: stored.fetchedAt,
    source: stored.source,
  };
}

export function writeRate(storage: Pick<Storage, "setItem">, value: RateObservation): boolean {
  try {
    storage.setItem(RATE_CACHE_KEY, JSON.stringify({ version: 1, ...value }));
    return true;
  } catch {
    return false;
  }
}
