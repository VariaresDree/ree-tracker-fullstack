// src/hooks/useAiStatus.js
//
// Whether each AI feature is ok, slow, on a backup model, or down
// (GET /api/ai/status). One request serves every component on screen, and a
// result is reused for 30 seconds. Failing to read it is not an error to show:
// the feature itself will say what went wrong.
import { useCallback, useEffect, useState } from 'react';
import { fetchAiStatus } from '../services/geminiApi';

const TTL_MS = 30_000;
let cache = { data: null, at: 0, promise: null };
const listeners = new Set();

function load(force = false) {
  if (!force && cache.data && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.data);
  if (cache.promise) return cache.promise;
  cache.promise = fetchAiStatus()
    .then((data) => {
      cache = { data, at: Date.now(), promise: null };
      listeners.forEach((fn) => fn(data));
      return data;
    })
    .catch(() => {
      cache.promise = null;
      return cache.data;
    });
  return cache.promise;
}

/** Put a fresh status (e.g. from the admin probe) into the shared cache. */
export function setAiStatus(data) {
  if (!data) return;
  cache = { data, at: Date.now(), promise: null };
  listeners.forEach((fn) => fn(data));
}

export function useAiStatus() {
  const [data, setData] = useState(cache.data);
  useEffect(() => {
    listeners.add(setData);
    if (typeof navigator === 'undefined' || navigator.onLine) load();
    return () => listeners.delete(setData);
  }, []);
  const refresh = useCallback(() => load(true), []);
  return { status: data, refresh };
}

export function resetAiStatusCache() {
  cache = { data: null, at: 0, promise: null };
}
