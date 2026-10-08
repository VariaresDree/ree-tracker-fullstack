// src/services/writeOrQueue.js
//
// Send a write now, or queue it for the next reconnect. For per-user lists the
// learner edits by hand (outside scores, the syllabus checklist), where the
// screen has already shown the change: the write only has to land eventually,
// in order.
//
//   • Offline, or a failure worth retrying (timeout, 5xx, 429, a 409 from the
//     idempotency layer): the write joins the store's pending-write queue,
//     which replays it on reconnect with the same Idempotency-Key.
//   • A permanent rejection (400, 404…) throws: retrying can't fix it, so the
//     caller undoes its optimistic change and says why.
//   • Writes for the same list already waiting in the queue: this one queues
//     behind them instead of overtaking. An edit sent before its own offline
//     create would 404, and a delete could land before the create it undoes.
//     Only this account's writes count: another account's are quarantined on
//     replay, never sent, so they must not hold this one back.
import { auth } from '../config/firebaseDb';
import { useStore } from '../store/useStore';
import { apiRequest } from './dbQueries';
import { classifySyncError, SYNC_OUTCOME } from './syncPolicy';

/**
 * @param {string} endpoint
 * @param {'POST'|'PUT'|'PATCH'|'DELETE'} method
 * @param {object|null} body
 * @param {{ queueKey: string, supersede?: boolean }} options
 *   queueKey: the endpoint prefix shared by the list's writes (ordering).
 *   supersede: the body is the resource's full state (see queuePendingWrite).
 * @returns {Promise<{ status: 'sent', data: any } | { status: 'queued' }>}
 */
export async function writeOrQueue(endpoint, method, body, { queueKey, supersede = false } = {}) {
  const store = useStore.getState();
  const me = auth.currentUser?.uid || store.ownerUid || null;
  const waiting = (store.pendingWrites || []).some((w) => queueKey && w.endpoint.startsWith(queueKey)
    && (w.ownerUid ?? store.ownerUid ?? null) === me);

  if (!waiting) {
    try {
      return { status: 'sent', data: await apiRequest(endpoint, method, body) };
    } catch (err) {
      if (classifySyncError(err) === SYNC_OUTCOME.PERMANENT) throw err;
      // Offline or transient: fall through and queue it.
    }
  }

  store.queuePendingWrite(endpoint, method, body, { supersede });
  // Behind other writes but online: start draining now rather than at the
  // next reconnect. Its own errors go to Sync issues, as for every queued write.
  if (waiting && navigator.onLine) store.flushPendingWrites().catch(() => {});
  return { status: 'queued' };
}
