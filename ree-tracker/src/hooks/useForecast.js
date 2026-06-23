import { useCallback, useEffect, useState } from 'react';
import { fetchForecast, recomputeForecast } from '../services/dbQueries';

// useForecast — pulls the latest ForecastSnapshot for the signed-in user.
// Returns { snapshot, loading, error, recompute, refresh }.
//
// The snapshot shape mirrors src/engine/forecast.js (passProbability,
// topnotcherProbability, expectedRank, weakTopics, recommendedActions).
export function useForecast({ autoload = true } = {}) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(autoload);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchForecast();
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
