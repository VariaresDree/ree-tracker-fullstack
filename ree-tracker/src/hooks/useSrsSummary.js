import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSrsSummary } from '../services/dbQueries';

// useSrsSummary — how many spaced-review questions are due, overdue, and when
// the next one falls due. Read by the Review setup screen and the dashboard.
//
// Coalesced like useForecast: overlapping mounts share one request, and the
// promise is released as soon as it settles, so refresh() always reaches the
// server. Not a cache.
let inFlight = null;

export function loadSrsSummaryOnce() {
  if (!inFlight) inFlight = fetchSrsSummary().finally(() => { inFlight = null; });
  return inFlight;
}

/** Test seam. */
export function __resetSrsSummaryInFlight() {
  inFlight = null;
}

export function useSrsSummary({ enabled = true } = {}) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadSrsSummaryOnce();
      if (mounted.current) setSummary(data || null);
    } catch {
      // Offline or the API is waking up: the queue simply isn't shown.
      if (mounted.current) setSummary(null);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (enabled) refresh();
    return () => { mounted.current = false; };
  }, [enabled, refresh]);

  return { summary, loading, refresh };
}
