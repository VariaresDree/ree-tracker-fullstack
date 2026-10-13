// src/features/notebook/notesStore.js
//
// The learner's notes on questions and formula cards: one shared copy for
// every screen that shows them (a note button on each question card, "Your
// note" under a solution, Library › Notebook › My notes), so a note saved in
// one place shows everywhere at once. Each screen used to have nothing to
// note with.
//
//   • Paints from memory, then this device's cache, then the network (a
//     card's note button reads a copy up to five minutes old; My notes asks).
//   • A save shows at once, is sent as the note's whole text or queued when
//     offline (a newer queued text for the same note replaces the older one),
//     and queued notes are laid over the server's copy.
//   • A list fetched while a note was being saved may predate it: it is
//     dropped and fetched again.
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { normalizeNoteBody } from '@ree/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../store/useStore';
import { apiRequest } from '../../services/dbQueries';
import { readUserCache, writeUserCache } from '../../services/userCache';
import { writeOrQueue } from '../../services/writeOrQueue';

export const NOTES_ENDPOINT = '/api/user/notes';
const CACHE = 'notes';
const CARD_FRESH_MS = 5 * 60 * 1000;

export const noteKey = (type, id) => `${type}:${id}`;
export const noteEndpoint = (type, id) => `${NOTES_ENDPOINT}/${type}/${encodeURIComponent(id)}`;

let state = { uid: null, items: null, status: 'idle', at: 0 };
let inflight = null;
// Bumped when a save starts and ends: a list fetched across a save is stale.
let version = 0;
const listeners = new Set();
const setState = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;

/** The list with one note set (body) or removed (null), newest first. */
export function withNote(items, type, targetId, body, target = null) {
  const rest = (items || []).filter((n) => !(n.targetType === type && n.targetId === targetId));
  if (!body) return rest;
  const before = (items || []).find((n) => n.targetType === type && n.targetId === targetId);
  return [{ targetType: type, targetId, body, updatedAt: new Date().toISOString(), target: target || before?.target || null }, ...rest];
}

/** This account's queued note writes laid over the list (the newest per note). */
export function overlayQueuedNotes(items, writes, uid, ownerUid = null) {
  if (!items) return items;
  let out = items;
  for (const w of writes || []) {
    if (w.method !== 'PUT' || !w.endpoint.startsWith(`${NOTES_ENDPOINT}/`)) continue;
    if ((w.ownerUid ?? ownerUid) !== uid) continue;
    const [type, ...rest] = w.endpoint.slice(NOTES_ENDPOINT.length + 1).split('/');
    const targetId = decodeURIComponent(rest.join('/'));
    const body = normalizeNoteBody(w.body?.body);
    const current = out.find((n) => n.targetType === type && n.targetId === targetId);
    if ((current?.body ?? null) === body) continue;
    out = withNote(out, type, targetId, body);
  }
  return out;
}

async function load(uid, { maxAgeMs = 0 } = {}) {
  if (!uid) return;
  if (state.uid !== uid) setState({ uid, items: null, status: 'loading', at: 0 });
  if (state.items == null) {
    const cached = await readUserCache(uid, CACHE);
    if (cached && state.uid === uid && state.items == null) setState({ items: cached, status: 'ready' });
  }
  if (maxAgeMs && state.at && Date.now() - state.at < maxAgeMs) return;
  if (inflight?.uid === uid) return inflight.promise;
  const startedAt = version;
  const promise = apiRequest(NOTES_ENDPOINT)
    .then((res) => {
      if (state.uid !== uid) return;
      if (version !== startedAt) { inflight = null; load(uid); return; }
      const items = Array.isArray(res?.items) ? res.items : [];
      setState({ items, status: 'ready', at: Date.now() });
      writeUserCache(uid, CACHE, items);
    })
    .catch(() => {
      if (state.uid === uid && state.items == null) setState({ status: 'error' });
    })
    .finally(() => { if (inflight?.promise === promise) inflight = null; });
  inflight = { uid, promise };
  return promise;
}

/**
 * Save (or, when empty, delete) the note on a question or card. Resolves
 * 'sent' or 'queued'; rejects with the note put back when the server refuses.
 * `target` ({ subject, topic, title }) names what it's on, for My notes.
 */
export async function saveNote(type, targetId, body, target = null) {
  const uid = state.uid;
  const text = normalizeNoteBody(body);
  const before = (state.items || []).find((n) => n.targetType === type && n.targetId === targetId) || null;
  version += 1;
  setState({ items: withNote(state.items || [], type, targetId, text, target) });
  try {
    const result = await writeOrQueue(noteEndpoint(type, targetId), 'PUT', { body: text || '' }, { queueKey: NOTES_ENDPOINT, supersede: true });
    if (uid && state.uid === uid) writeUserCache(uid, CACHE, state.items);
    return result.status;
  } catch (err) {
    if (state.uid === uid) setState({ items: withNote(state.items || [], type, targetId, before?.body ?? null, before?.target) });
    throw err;
  } finally {
    version += 1;
  }
}

/**
 * @param {{ fresh?: boolean }} [options] fresh: always ask the server (My
 *   notes); otherwise a copy up to five minutes old is used (note buttons).
 */
export function useNotes({ fresh = false } = {}) {
  // Optional chaining: a note button can render outside the signed-in shell
  // (a test, a preview) and then simply has no notes.
  const uid = useAuth()?.currentUser?.uid || null;
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  const pendingWrites = useStore((s) => s.pendingWrites);
  const ownerUid = useStore((s) => s.ownerUid);

  useEffect(() => { load(uid, { maxAgeMs: fresh ? 0 : CARD_FRESH_MS }); }, [uid, fresh]);

  const mine = snap.uid === uid;
  const items = useMemo(
    () => (mine ? overlayQueuedNotes(snap.items, pendingWrites, uid, ownerUid) : null),
    [mine, snap.items, pendingWrites, uid, ownerUid],
  );
  const byKey = useMemo(() => new Map((items || []).map((n) => [noteKey(n.targetType, n.targetId), n])), [items]);

  return {
    items,
    status: mine ? snap.status : 'loading',
    noteFor: (type, id) => byKey.get(noteKey(type, id)) || null,
    saveNote,
    reload: () => load(uid),
  };
}

/** Test seam: forget the shared copy. */
export function __resetNotes() {
  state = { uid: null, items: null, status: 'idle', at: 0 };
  inflight = null;
  version = 0;
}
