export const RATE_API_URL = "https://api.frankfurter.dev/v2/rate/USD/JPY";

export interface RateObservation {
  rate: number;
  rateDate: string;
  fetchedAt: string;
  source: "Frankfurter";
}

export interface StoredRate extends RateObservation {
  version: 1;
}
