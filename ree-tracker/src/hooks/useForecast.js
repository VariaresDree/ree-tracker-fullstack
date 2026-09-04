import { useCallback, useEffect, useState } from 'react';
import { fetchForecast, recomputeForecast } from '../services/dbQueries';

// useForecast — pulls the latest ForecastSnapshot for the signed-in user.
// Returns { snapshot, loading, error, recompute, refresh }.
//
// The snapshot shape mirrors src/engine/forecast.js (passProbability,
// topnotcherProbability, expectedRank, weakTopics, recommendedActions).
// In-flight coalescing. TWO components call this hook on the dashboard —
// PrescriptionPanel and TrajectoryCard — each with its own state, so each fired
// its own GET /api/forecast. A mobile trace caught the pair 0.6ms apart: not a
// refetch, just two mounts racing. Sharing the promise makes concurrent callers
// one request while leaving each component's local state untouched, so nothing
// else about the hook's contract changes.
//
// Deliberately NOT a cache: the promise is dropped as soon as it settles, so a
// later refresh() or recompute() still goes to the server. Coalescing only
// collapses requests that overlap in time.
let inFlightForecast = null;

export function loadForecastOnce() {
  if (!inFlightForecast) {
    inFlightForecast = fetchForecast().finally(() => { inFlightForecast = null; });
  }
  return inFlightForecast;
}

/** Test seam: drop any shared in-flight request between cases. */
export function __resetForecastInFlight() {
  inFlightForecast = null;
}

export function useForecast({ autoload = true } = {}) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(autoload);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadForecastOnce();
      setSnapshot(data?.snapshot ?? null);
    } catch (err) {
      // safeApiRequest returns null on failure, so an exception here means
      // a hard auth/circuit-breaker case — surface but don't crash callers.
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const recompute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await recomputeForecast();
      setSnapshot(data?.snapshot ?? null);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoload) refresh();
  }, [autoload, refresh]);

  return { snapshot, loading, error, refresh, recompute };
}
