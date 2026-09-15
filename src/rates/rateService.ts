import { RATE_API_URL, type RateObservation } from "./types";

export { RATE_API_URL };

const SAFE_RATE_ERROR = "Unable to fetch exchange rate";
const DEFAULT_TIMEOUT_MS = 8000;

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

export function parseRateResponse(input: unknown, fetchedAt: string): RateObservation {
  if (
    !isPlainObject(input) ||
    input.base !== "USD" ||
    input.quote !== "JPY" ||
    !isStrictCalendarDate(input.date) ||
    typeof input.rate !== "number" ||
    !Number.isFinite(input.rate) ||
    input.rate <= 0
  ) {
    throw new Error(SAFE_RATE_ERROR);
  }

  return {
    rate: input.rate,
    rateDate: input.date,
    fetchedAt,
    source: "Frankfurter",
  };
}

export async function fetchUsdJpyRate(
  deps: { fetchImpl?: typeof fetch; now?: () => Date; timeoutMs?: number } = {},
): Promise<RateObservation> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => new Date());
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(RATE_API_URL, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(SAFE_RATE_ERROR);
    }

    const data: unknown = await response.json();
    return parseRateResponse(data, now().toISOString());
  } catch {
    throw new Error(SAFE_RATE_ERROR);
  } finally {
    clearTimeout(timeoutId);
  }
}
