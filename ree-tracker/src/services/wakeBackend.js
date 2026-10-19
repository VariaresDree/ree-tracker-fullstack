// src/services/wakeBackend.js
//
// The backend runs on Render's free tier, which stops it after about 15
// minutes without traffic; the next request waits tens of seconds while it
// boots. The keepalive workflow pings it through the study day, but GitHub
// runs scheduled workflows hours late, so a learner opening the app often
// meets a stopped server. This starts the boot the moment the app opens,
// while sign-in and the first screen are still loading, instead of on the
// first real request.
//
// GET /health answers without touching the database. The request is
// fire-and-forget: no-cors (the response is never read), and it never
// throws.

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/** Start waking the backend. Returns whether a request was sent. */
export function wakeBackend({ fetchImpl = globalThis.fetch, online = globalThis.navigator?.onLine } = {}) {
  if (online === false || typeof fetchImpl !== 'function') return false;
  try {
    Promise.resolve(fetchImpl(`${BACKEND_URL}/health`, { mode: 'no-cors', cache: 'no-store', credentials: 'omit' })).catch(() => {});
    return true;
  } catch {
    return false;
  }
}
