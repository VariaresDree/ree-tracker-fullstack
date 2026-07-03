// src/utils/contentHash.js
// Content-derived idempotency keys. The old keys embedded the current minute
// (or were random per flush), so a retried batch looked like NEW data to the
// server and every replay double-wrote attempts and re-incremented session
// totals. These keys depend ONLY on what is being sent, so any retry of the
// same batch reuses the identical key for the server's whole dedupe window.

// Tiny non-crypto FNV-1a hash — enough to dedupe within the server's 10-min
// idempotency TTL.
export function fnv1a(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

// Stable key for a telemetry batch: same session + same attempt ids (in any
// order) → same key. No time component on purpose.
export function stableBatchKey(sessionId, attemptIds = []) {
  const ids = [...attemptIds].sort().join(',');
  return `c-${fnv1a(`${sessionId || 'nosession'}|${ids}`)}`;
}
