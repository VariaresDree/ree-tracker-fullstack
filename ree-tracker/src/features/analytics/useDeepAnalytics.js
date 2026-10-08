// src/features/analytics/useDeepAnalytics.js
//
// One deep-analytics endpoint (GET /api/analytics/deep/:type) for one section
// of Progress. These lived in a single tabbed AnalyticsDeepDive component;
// each section now sits in the Progress tab where a reviewer would look for
// it, so the fetch moved into a hook they share.
//
// Results are kept per account and endpoint for the session: switching
// Progress tabs shows the last result at once and refreshes it in the
// background when it is more than a couple of minutes old. A failure is not
// "no data": it reports status 'error', and only `retry()` asks again, so an
// offline page doesn't refetch in a loop.
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAnalyticsDeep } from '../../services/dbQueries';

const STALE_MS = 2 * 60 * 1000;
const cache = new Map(); // `${uid}:${type}` -> { data, at }

/** Test seam: forget every cached result. */
export function __resetDeepAnalyticsCache() {
  cache.clear();
}

/**
 * @param {string} type  e.g. 'weak-signals', 'time-analysis', 'study-time'
 * @returns {{ data: object|null, status: 'loading'|'loaded'|'error', retry: () => void }}
 */
export function useDeepAnalytics(type) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const key = `${uid || ''}:${type}`;
  const [attempt, setAttempt] = useState(0);
  // The latest settled request for this hook: { key, attempt, data } or
  // { key, attempt, error: true }. Loading is derived, never set in the effect.
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    const hit = cache.get(key);
    if (attempt === 0 && hit && Date.now() - hit.at < STALE_MS) return undefined;
    let live = true;
    fetchAnalyticsDeep(type)
      .then((data) => {
        // safeApiRequest resolves null when offline or timed out: that is a
        // failure, not an empty dataset (real empties are `{ items: [] }`).
        if (data == null) throw new Error('unreachable');
        cache.set(key, { data, at: Date.now() });
        if (live) setResult({ key, attempt, data });
      })
      .catch(() => { if (live) setResult({ key, attempt, error: true }); });
    return () => { live = false; };
  }, [uid, key, type, attempt]);

  const settled = result?.key === key && result.attempt === attempt ? result : null;
  const data = settled?.data ?? cache.get(key)?.data ?? null;
  const status = data ? 'loaded' : settled?.error ? 'error' : 'loading';
  return { data, status, retry: () => setAttempt((n) => n + 1) };
}
