import { useCallback, useEffect, useRef, useState } from "react";
import { readFreshRate, writeRate } from "../rates/rateCache";
import { fetchUsdJpyRate } from "../rates/rateService";
import type { RateObservation } from "../rates/types";

export type ExchangeRateState =
  | { kind: "loading"; rate: RateObservation | null }
  | { kind: "online"; rate: RateObservation }
  | { kind: "cached"; rate: RateObservation }
  | { kind: "unavailable"; rate: null };

export interface ExchangeRateController {
  state: ExchangeRateState;
  refresh: () => Promise<void>;
}

type ExchangeRateDeps = {
  fetchRate?: () => Promise<RateObservation>;
  storage?: Storage;
  nowMs?: () => number;
};

const defaultFetchRate = () => fetchUsdJpyRate();
const defaultNowMs = () => Date.now();
const automaticFetches = new WeakMap<() => Promise<RateObservation>, Promise<RateObservation>>();

function getBrowserStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function getAvailableRate(state: ExchangeRateState): RateObservation | null {
  return state.rate;
}

function getFetchPromise(
  fetchRate: () => Promise<RateObservation>,
  source: "automatic" | "manual",
): Promise<RateObservation> {
  if (source === "manual") {
    return fetchRate();
  }

  const activeFetch = automaticFetches.get(fetchRate);
  if (activeFetch) {
    return activeFetch;
  }

  const fetchPromise = fetchRate().finally(() => {
    if (automaticFetches.get(fetchRate) === fetchPromise) {
      automaticFetches.delete(fetchRate);
    }
  });

  automaticFetches.set(fetchRate, fetchPromise);
  return fetchPromise;
}

export function useExchangeRate(deps: ExchangeRateDeps = {}): ExchangeRateController {
  const depsRef = useRef({
    fetchRate: deps.fetchRate ?? defaultFetchRate,
    storage: deps.storage ?? getBrowserStorage(),
    nowMs: deps.nowMs ?? defaultNowMs,
  });

  depsRef.current = {
    fetchRate: deps.fetchRate ?? defaultFetchRate,
    storage: deps.storage ?? getBrowserStorage(),
    nowMs: deps.nowMs ?? defaultNowMs,
  };

  const [state, setState] = useState<ExchangeRateState>(() => {
    const { storage, nowMs } = depsRef.current;
    const cached = storage ? readFreshRate(storage, nowMs()) : null;
    return { kind: "loading", rate: cached };
  });

  const mountedRef = useRef(false);
  const attemptIdRef = useRef(0);
  const activeRequestRef = useRef<{ promise: Promise<void>; source: "automatic" | "manual" } | null>(null);
  const latestRateRef = useRef<RateObservation | null>(getAvailableRate(state));

  const startRequest = useCallback((source: "automatic" | "manual"): Promise<void> => {
    if (activeRequestRef.current?.source === "manual") {
      return activeRequestRef.current.promise;
    }

    const attemptId = ++attemptIdRef.current;
    const preservedRate = latestRateRef.current;
    const { fetchRate, storage } = depsRef.current;

    if (mountedRef.current) {
      setState({ kind: "loading", rate: preservedRate });
    }

    const request = getFetchPromise(fetchRate, source)
      .then((rate) => {
        if (!mountedRef.current || attemptId !== attemptIdRef.current) {
          return;
        }

        if (storage) {
          writeRate(storage, rate);
        }

        latestRateRef.current = rate;
        setState({ kind: "online", rate });
      })
      .catch(() => {
        if (!mountedRef.current || attemptId !== attemptIdRef.current) {
          return;
        }

        const fallbackRate = latestRateRef.current;
        setState(fallbackRate ? { kind: "cached", rate: fallbackRate } : { kind: "unavailable", rate: null });
      })
      .finally(() => {
        if (activeRequestRef.current?.promise === request) {
          activeRequestRef.current = null;
        }
      });

    activeRequestRef.current = { promise: request, source };
    return request;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void startRequest("automatic");

    return () => {
      mountedRef.current = false;
      attemptIdRef.current += 1;
      activeRequestRef.current = null;
    };
  }, [startRequest]);

  const refresh = useCallback(() => startRequest("manual"), [startRequest]);

  return {
    state,
    refresh,
  };
}
