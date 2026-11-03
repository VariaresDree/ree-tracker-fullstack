// src/services/appHealth.js
//
// The app reporting on itself, for Admin › App health: which version this
// device runs (once a day), and errors nothing else caught. It sits in the boot
// bundle, so it stays small, and it must never get in the learner's way: every
// failure here is silent, and what can't be sent waits for the next try.
import { APP_VERSION } from './appUpdate';

const MAX_PER_SESSION = 20;
const BATCH = 10;
const FLUSH_MS = 3000;
const START_DELAY_MS = 10_000; // after boot's own requests
// Longer than the default, so a slow reply on a sleeping server doesn't trip
// the circuit breaker for the learner's real requests (apiRequest).
const TIMEOUT_MS = 30_000;
const PING_KEY = 'ree:version-ping';

// Being offline, a chunk gone after a deploy (main.jsx reloads for that) and
// browser noise aren't bugs we can act on.
const NOISE = /\[OFFLINE\]|\[TIMEOUT\]|signed out|failed to fetch|networkerror|load failed|resizeobserver|importing a module script|aborterror|aborted/i;

let send = null;
let queue = [];
let timer = null;
const seen = new Set();

async function flush() {
  timer = null;
  if (!send || queue.length === 0) return;
  const batch = queue.slice(0, BATCH);
  try {
    await send('/api/user/client-errors', 'POST', { errors: batch }, { timeoutMs: TIMEOUT_MS });
    queue = queue.slice(batch.length);
    if (queue.length) schedule();
  } catch (err) {
    // Refused means it will always be refused (or the route isn't deployed yet).
    if (err?.status >= 400 && err?.status < 500) queue = queue.slice(batch.length);
  }
}

function schedule() {
  if (!timer) timer = setTimeout(flush, FLUSH_MS);
}

export function reportError(error) {
  if (!send) return;
  const isText = typeof error === 'string';
  if (!isText && !(error instanceof Error)) return; // "Script error." and bare rejections say nothing
  const message = (isText ? error : error.message).slice(0, 500);
  if (!message || NOISE.test(message) || seen.has(message) || seen.size >= MAX_PER_SESSION) return;
  seen.add(message);
  queue.push({
    message,
    stack: isText ? undefined : error.stack?.slice(0, 4000),
    route: window.location.pathname.slice(0, 200),
    version: APP_VERSION,
  });
  schedule();
}

async function pingVersion() {
  const stamp = `${APP_VERSION}|${new Date().toDateString()}`;
  try {
    if (localStorage.getItem(PING_KEY) === stamp) return;
    await send('/api/user/app-version', 'POST', { version: APP_VERSION }, { timeoutMs: TIMEOUT_MS });
    localStorage.setItem(PING_KEY, stamp);
  } catch { /* the next sign-in or app open tries again */ }
}

// `whenSignedIn(fn)` calls fn each time someone is signed in. Passed in, like
// `request`, so this file doesn't pull sign-in into everything that imports
// reportError. A dev build reports nothing: it can point at the real server.
export function startAppHealth({ request, whenSignedIn }) {
  if (APP_VERSION === 'dev') return;
  send = request;
  window.addEventListener('error', (event) => reportError(event.error));
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason));
  whenSignedIn(() => setTimeout(() => { pingVersion(); flush(); }, START_DELAY_MS));
}
