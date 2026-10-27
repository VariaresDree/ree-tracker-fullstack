// src/features/paper-sets/usePrintedSet.js
//
// One printed set, for the print preview: paints from memory, then this
// device, then the server, with this account's queued writes laid over it.
//
// Changes (an item edit, the paper size, "printed") show and are kept on this
// device at once. They are sent as one merged PATCH 600 ms after the last
// change, in order (one at a time), or queued when offline. When the page is
// hidden or closed the unsent change goes straight into the offline queue,
// which outlives the page, and the queue is asked to send it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../store/useStore';
import { SYNC_OUTCOME, classifySyncError } from '../../services/syncPolicy';
import { applySetPatch, effectiveDraw, mergeDelta, rememberPaper } from './printedSetModel';
import { isCreateQueued, overlaySet, queuedSetWrites, queuedSheetDelta, writesForSet } from './printedSetQueue';
import {
  deletePrintedSet, fetchPrintedSet, fetchSheets, forgetSet, patchPrintedSet, readLocalSet, readLocalSheets,
  recalledSet, rememberSet, setEndpoint, setFrom, writeLocalSheets,
} from './printedSetsApi';

export const SAVE_DELAY_MS = 600;

/**
 * @param {string} id  the set's print id
 * @returns {{
 *   set: object|null, draw: object|null,
 *   status: 'loading'|'ready'|'not-found'|'offline-missing'|'error',
 *   syncState: 'saved'|'saving'|'queued', createQueued: boolean, sheetCount: number, error: string|null,
 *   saveEdit: (n: number, edit: object|null) => void, setPrefs: (patch: object) => void,
 *   markPrinted: () => void, remove: () => Promise<object>, flush: () => Promise<void>,
 * }}
 */
export function usePrintedSet(id) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid || null;
  const pendingWrites = useStore((s) => s.pendingWrites);
  const ownerUid = useStore((s) => s.ownerUid);

  const [base, setBase] = useState(() => recalledSet(uid, id));
  const [loadStatus, setLoadStatus] = useState(() => (recalledSet(uid, id) ? 'ready' : 'loading'));
  const [serverSheets, setServerSheets] = useState(null);
  const [unsent, setUnsent] = useState(null);
  const [inflight, setInflight] = useState([]);
  const [error, setError] = useState(null);
  const [deleted, setDeleted] = useState(false);

  const unsentRef = useRef(null);
  const timer = useRef(null);
  const chain = useRef(Promise.resolve());
  // Bumped by every change: a set fetched while one was made predates it.
  const made = useRef(0);

  const mine = useMemo(
    () => writesForSet(queuedSetWrites(pendingWrites, uid, ownerUid), id),
    [pendingWrites, uid, ownerUid, id],
  );

  // Mounted, for the loads that finish after the screen has gone.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  /** The server's copy (queued changes sent first), and its sheet count. */
  const load = useCallback(async (local = null) => {
    const madeBefore = made.current;
    // Queued changes first, so the copy fetched includes them.
    if (navigator.onLine) await useStore.getState().flushPendingWrites().catch(() => {});
    try {
      const fresh = await fetchPrintedSet(id);
      if (!alive.current) return;
      if (fresh && made.current === madeBefore) setBase(fresh);
      setLoadStatus('ready');
    } catch (err) {
      if (!alive.current) return;
      const store = useStore.getState();
      const queuedCreate = isCreateQueued(queuedSetWrites(store.pendingWrites, uid, store.ownerUid), id);
      if (err?.status === 404 && !queuedCreate) {
        setBase(null);
        setLoadStatus('not-found');
        forgetSet(id);
        return;
      }
      if (local || queuedCreate) setLoadStatus('ready');
      else setLoadStatus((prev) => (prev === 'ready' ? prev : classifySyncError(err) === SYNC_OUTCOME.OFFLINE ? 'offline-missing' : 'error'));
    }
    try {
      const sheets = await fetchSheets(id);
      if (!alive.current) return;
      setServerSheets(sheets.length);
      writeLocalSheets(uid, id, sheets);
    } catch {
      const cached = await readLocalSheets(uid, id);
      if (alive.current && Array.isArray(cached)) setServerSheets(cached.length);
    }
  }, [uid, id]);

  useEffect(() => {
    if (!uid || !id) return undefined;
    let live = true;
    readLocalSet(uid, id).then((local) => {
      if (!live) return;
      if (local) {
        setBase((prev) => prev || local);
        setLoadStatus('ready');
      }
      load(local);
    });
    return () => { live = false; };
  }, [uid, id, load]);

  // Writes that left the queue were sent (the app reconnected and replayed
  // it): they now belong to the copy itself, until the server's copy, read
  // back here, replaces it.
  const lastQueued = useRef(mine);
  useEffect(() => {
    const before = lastQueued.current;
    lastQueued.current = mine;
    const now = new Set(mine.map((w) => w.id));
    const sent = before.filter((w) => !now.has(w.id));
    if (!sent.length) return;
    setBase((prev) => overlaySet(prev, id, sent));
    if (navigator.onLine) load(true);
  }, [mine, id, load]);

  const set = useMemo(() => {
    if (deleted) return null;
    let s = overlaySet(base, id, mine);
    for (const delta of inflight) s = applySetPatch(s, delta);
    return applySetPatch(s, unsent);
  }, [base, id, mine, inflight, unsent, deleted]);

  const setRef = useRef(set);
  useEffect(() => { setRef.current = set; });

  // This device keeps what the screen shows (queued changes included: they
  // apply again harmlessly).
  useEffect(() => {
    if (uid && set && !deleted) rememberSet(uid, set);
  }, [uid, set, deleted]);

  const send = useCallback((delta) => {
    setInflight((list) => [...list, delta]);
    const run = async () => {
      try {
        const res = await patchPrintedSet(id, delta);
        if (res.status === 'sent') {
          const saved = setFrom(res.data);
          setBase((prev) => (saved ? { ...prev, ...saved } : applySetPatch(prev, delta)));
        }
        setError(null);
      } catch (err) {
        // Refused outright: retrying can't fix it, so the change is dropped.
        setError(`That change wasn't saved. ${err?.message || 'Try again.'}`);
      } finally {
        setInflight((list) => list.filter((d) => d !== delta));
      }
    };
    chain.current = chain.current.then(run, run);
    return chain.current;
  }, [id]);

  /** Send what's unsent now ('queue': straight into the offline queue, for a page going away). */
  const flush = useCallback((mode = 'send') => {
    clearTimeout(timer.current);
    const delta = unsentRef.current;
    if (!delta) return Promise.resolve();
    unsentRef.current = null;
    setUnsent(null);
    if (mode === 'queue') {
      // The queue overlay shows it from here on.
      useStore.getState().queuePendingWrite(setEndpoint(id), 'PATCH', delta);
      useStore.getState().flushPendingWrites().catch(() => {});
      return Promise.resolve();
    }
    return send(delta);
  }, [id, send]);

  const change = useCallback((delta, { now = false } = {}) => {
    made.current += 1;
    unsentRef.current = mergeDelta(unsentRef.current, delta);
    setUnsent(unsentRef.current);
    clearTimeout(timer.current);
    if (now) flush();
    else timer.current = setTimeout(() => { flush(); }, SAVE_DELAY_MS);
  }, [flush]);

  useEffect(() => {
    const onHide = () => { flush('queue'); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush('queue'); };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
      // Leaving the preview inside the app: send what's left.
      flush();
    };
  }, [flush]);

  /** An item's edit, or null to go back to the question bank's wording. */
  const saveEdit = useCallback((n, edit) => change({ edits: { [String(n)]: edit ?? null } }), [change]);

  const setPrefs = useCallback((patch) => {
    const current = unsentRef.current?.prefs || setRef.current?.prefs || {};
    const prefs = { ...current, ...patch, docs: { ...(current.docs || {}), ...(patch.docs || {}) } };
    if (patch.paper) rememberPaper(patch.paper);
    change({ prefs });
  }, [change]);

  const markPrinted = useCallback(() => {
    if (setRef.current?.printedAt) return;
    change({ printed: true }, { now: true });
  }, [change]);

  const remove = useCallback(async () => {
    clearTimeout(timer.current);
    unsentRef.current = null;
    setUnsent(null);
    setDeleted(true);
    try {
      return await deletePrintedSet(id);
    } catch (err) {
      setDeleted(false);
      throw err;
    }
  }, [id]);

  const draw = useMemo(() => effectiveDraw(set), [set]);
  const status = set ? 'ready' : loadStatus === 'ready' ? 'not-found' : loadStatus;
  const syncState = unsent || inflight.length ? 'saving' : mine.length ? 'queued' : 'saved';
  const sheetCount = Math.max(0, (serverSheets ?? set?._count?.sheets ?? 0) + queuedSheetDelta(mine, id));

  return {
    set,
    draw,
    status,
    syncState,
    createQueued: isCreateQueued(mine, id),
    sheetCount,
    error,
    saveEdit,
    setPrefs,
    markPrinted,
    remove,
    flush,
  };
}
