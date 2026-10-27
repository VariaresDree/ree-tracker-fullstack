// src/features/paper-sets/useSetSheets.js
//
// One printed set's scanned sheets, for the scanner and the results page:
// this device's copy first, then the server's, with this account's queued
// sheet writes laid over it, so a sheet scanned offline shows at once.
//
// Adding, correcting and deleting a sheet show at once and are kept on this
// device; they are sent through the set's queue (printedSetsApi), or queued
// when offline. A refusal undoes that one change and is thrown for the
// caller to explain.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../store/useStore';
import { SYNC_OUTCOME, classifySyncError } from '../../services/syncPolicy';
import { overlaySheets, queuedSetWrites, writesForSet } from './printedSetQueue';
import {
  createSheet, deleteSheet, fetchSheets, patchSheet, readLocalSheets, writeLocalSheets,
} from './printedSetsApi';

const itemOf = (res) => res?.item || null;

/**
 * @param {string|null} setId
 * @returns {{
 *   sheets: object[]|null,   // null while nothing is known yet
 *   status: 'loading'|'ready'|'offline'|'unreachable'|'error'|'not-found',
 *   queuedCount: number,
 *   add: (sheet: object) => Promise<'sent'|'queued'>,
 *   patch: (sheetId: string, patch: object) => Promise<'sent'|'queued'>,
 *   remove: (sheetId: string) => Promise<'sent'|'queued'>,
 *   reload: () => Promise<void>,
 * }}
 */
export function useSetSheets(setId) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid || null;
  const pendingWrites = useStore((s) => s.pendingWrites);
  const ownerUid = useStore((s) => s.ownerUid);

  const [server, setServerState] = useState(null);
  const [status, setStatus] = useState('loading');
  const serverRef = useRef(null);
  // Bumped by every change: a list fetched while one was made predates it.
  const made = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  /** The copy, kept on this device too. */
  const setServer = useCallback((next) => {
    const value = typeof next === 'function' ? next(serverRef.current) : next;
    serverRef.current = value;
    setServerState(value);
    if (uid && setId && Array.isArray(value)) writeLocalSheets(uid, setId, value);
  }, [uid, setId]);

  const mine = useMemo(
    () => writesForSet(queuedSetWrites(pendingWrites, uid, ownerUid), setId).filter((w) => /\/sheets(\/|$)/.test(w.endpoint)),
    [pendingWrites, uid, ownerUid, setId],
  );

  const load = useCallback(async () => {
    if (!uid || !setId) return;
    const madeBefore = made.current;
    if (navigator.onLine) await useStore.getState().flushPendingWrites().catch(() => {});
    try {
      const fresh = await fetchSheets(setId);
      if (!alive.current) return;
      if (made.current === madeBefore) setServer(fresh);
      setStatus('ready');
    } catch (err) {
      if (!alive.current) return;
      const outcome = classifySyncError(err);
      setStatus(err?.status === 404 ? 'not-found' : outcome === SYNC_OUTCOME.OFFLINE ? 'offline' : outcome === SYNC_OUTCOME.TRANSIENT ? 'unreachable' : 'error');
      // Nothing on this device either: an empty list, with the status to say why.
      if (serverRef.current == null) setServer([]);
    }
  }, [uid, setId, setServer]);

  useEffect(() => {
    if (!uid || !setId) return undefined;
    let live = true;
    readLocalSheets(uid, setId).then((local) => {
      if (!live) return;
      if (Array.isArray(local) && serverRef.current == null) {
        serverRef.current = local;
        setServerState(local);
      }
      load();
    });
    return () => { live = false; };
  }, [uid, setId, load]);

  // Writes that left the queue were sent: read the server's copy back.
  const lastQueued = useRef(mine.length);
  useEffect(() => {
    const drained = lastQueued.current > mine.length;
    lastQueued.current = mine.length;
    if (drained && navigator.onLine) load();
  }, [mine.length, load]);

  const sheets = useMemo(() => overlaySheets(server, setId, mine), [server, setId, mine]);

  /** A new sheet: shown and kept at once; the server's copy (its score) replaces it once sent. */
  const add = useCallback(async (sheet) => {
    made.current += 1;
    const local = { ...sheet, createdAt: new Date().toISOString() };
    setServer((prev) => [local, ...(prev || []).filter((s) => s.id !== sheet.id)]);
    try {
      const res = await createSheet(setId, sheet);
      const saved = res.status === 'sent' ? itemOf(res.data) : null;
      if (saved) setServer((prev) => (prev || []).map((s) => (s.id === saved.id ? { ...s, ...saved } : s)));
      return res.status;
    } catch (err) {
      setServer((prev) => (prev || []).filter((s) => s.id !== sheet.id));
      throw err;
    }
  }, [setId, setServer]);

  /** A new name or corrected answers (the server scores it again). */
  const patch = useCallback(async (sheetId, delta) => {
    made.current += 1;
    const before = (serverRef.current || []).find((s) => s.id === sheetId) || null;
    setServer((prev) => (prev || []).map((s) => (s.id === sheetId ? { ...s, ...delta } : s)));
    try {
      const res = await patchSheet(setId, sheetId, delta);
      const saved = res.status === 'sent' ? itemOf(res.data) : null;
      if (saved) setServer((prev) => (prev || []).map((s) => (s.id === saved.id ? { ...s, ...saved } : s)));
      return res.status;
    } catch (err) {
      if (before) setServer((prev) => (prev || []).map((s) => (s.id === sheetId ? before : s)));
      throw err;
    }
  }, [setId, setServer]);

  const remove = useCallback(async (sheetId) => {
    made.current += 1;
    const list = serverRef.current || [];
    const at = list.findIndex((s) => s.id === sheetId);
    const before = at >= 0 ? list[at] : null;
    setServer((prev) => (prev || []).filter((s) => s.id !== sheetId));
    try {
      return (await deleteSheet(setId, sheetId)).status;
    } catch (err) {
      if (before) {
        setServer((prev) => {
          const next = (prev || []).filter((s) => s.id !== sheetId);
          next.splice(Math.min(at, next.length), 0, before);
          return next;
        });
      }
      throw err;
    }
  }, [setId, setServer]);

  return { sheets, status, queuedCount: mine.length, add, patch, remove, reload: load };
}
