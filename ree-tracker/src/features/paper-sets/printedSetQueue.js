// src/features/paper-sets/printedSetQueue.js
//
// Printed-set writes waiting in the offline queue (the store's pendingWrites),
// laid over what the server or this device last had, so a set made or edited
// offline shows as it will be once the queue replays. Pure.
//
// Every printed-set write shares one queue key, the list endpoint: a sheet
// (nested under its set) or an edit can never be sent before the set's own
// create. Applying a queued write twice is harmless (edits replace per item,
// prefs replace, printedAt is set once), so a copy cached with the queue
// already applied can have it applied again.
import { applySetPatch, summaryOf } from './printedSetModel';

export const PRINTED_SETS_ENDPOINT = '/api/user/printed-sets';

/** { setId, sheets, sheetId } from a printed-set endpoint, or null for anything else. */
export function parseEndpoint(endpoint) {
  const path = String(endpoint || '');
  if (path !== PRINTED_SETS_ENDPOINT && !path.startsWith(`${PRINTED_SETS_ENDPOINT}/`)) return null;
  const parts = path.slice(PRINTED_SETS_ENDPOINT.length).split('/').filter(Boolean).map((p) => {
    try { return decodeURIComponent(p); } catch { return p; }
  });
  return { setId: parts[0] || null, sheets: parts[1] === 'sheets', sheetId: parts[2] || null };
}

/**
 * This account's queued printed-set writes, oldest first. Another account's
 * are left out (they are quarantined on replay, never sent); an unstamped
 * write belongs to the device's owner.
 */
export function queuedSetWrites(writes, uid, ownerUid = null) {
  return (writes || []).filter((w) => parseEndpoint(w.endpoint) && (w.ownerUid ?? ownerUid) === uid);
}

/** The set a queued write is about (a create names it in its body). */
const setIdOf = (w) => {
  const at = parseEndpoint(w.endpoint);
  if (!at) return null;
  return at.setId || (w.method === 'POST' ? w.body?.id || null : null);
};

/** The writes about one set: its create, its edits, its sheets, its delete. */
export const writesForSet = (writes, id) => (writes || []).filter((w) => setIdOf(w) === id);

/** Its create is still waiting to be sent. */
export const isCreateQueued = (writes, id) => (writes || [])
  .some((w) => w.method === 'POST' && w.endpoint === PRINTED_SETS_ENDPOINT && w.body?.id === id);

// A queued create as the set it will become.
const fromCreate = (w) => ({
  ...w.body,
  itemCount: (w.body.items || []).length,
  printedAt: null,
  createdAt: w.createdAt,
  updatedAt: w.createdAt,
});

/**
 * One set with its queued writes applied: the create (when there is no copy
 * yet), the edits, and a delete (null). Sheet writes don't change the set.
 */
export function overlaySet(base, id, writes) {
  let set = base;
  for (const w of writesForSet(writes, id)) {
    const at = parseEndpoint(w.endpoint);
    if (at.sheets) continue;
    if (w.method === 'POST' && !at.setId) set = set || fromCreate(w);
    else if (w.method === 'PATCH' && set) set = applySetPatch(set, w.body, w.createdAt);
    else if (w.method === 'DELETE') set = null;
  }
  return set;
}

/** Scanned sheets queued for a set: added minus deleted. */
export function queuedSheetDelta(writes, id) {
  return writesForSet(writes, id).reduce((n, w) => {
    const at = parseEndpoint(w.endpoint);
    if (!at.sheets) return n;
    if (w.method === 'POST' && !at.sheetId) return n + 1;
    if (w.method === 'DELETE' && at.sheetId) return n - 1;
    return n;
  }, 0);
}

const byNewest = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
const sheetsOf = (s) => s?._count?.sheets ?? s?.sheetCount ?? 0;
const withSheets = (s, n) => ({ ...s, _count: { ...(s._count || {}), sheets: Math.max(0, n) } });

/** The list (summaries) with one queued write applied. */
export function applyListWrite(list, w) {
  const at = parseEndpoint(w.endpoint);
  if (!at) return list;
  const id = setIdOf(w);
  const current = list.find((s) => s.id === id);
  if (at.sheets) {
    if (!current) return list;
    const delta = w.method === 'POST' && !at.sheetId ? 1 : w.method === 'DELETE' && at.sheetId ? -1 : 0;
    return delta ? list.map((s) => (s.id === id ? withSheets(s, sheetsOf(s) + delta) : s)) : list;
  }
  if (w.method === 'POST' && !at.setId) {
    if (current || !w.body?.id) return list;
    return [...list, withSheets(summaryOf(fromCreate(w)), 0)].sort(byNewest);
  }
  if (w.method === 'DELETE') return list.filter((s) => s.id !== id);
  if (w.method === 'PATCH' && current) {
    const edits = w.body?.edits ? Object.values(w.body.edits) : [];
    const next = applySetPatch(current, { prefs: w.body?.prefs, printed: w.body?.printed }, w.createdAt);
    return list.map((s) => (s.id === id ? { ...next, edited: s.edited || edits.some((e) => e != null) } : s));
  }
  return list;
}

/** The list with this account's queued writes applied, and how many apply. */
export function overlaySetList(list, writes, uid, ownerUid) {
  const queued = queuedSetWrites(writes, uid, ownerUid);
  return { value: list == null ? null : queued.reduce(applyListWrite, list), count: queued.length };
}
