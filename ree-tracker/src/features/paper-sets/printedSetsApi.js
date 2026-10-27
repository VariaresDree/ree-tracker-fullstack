// src/features/paper-sets/printedSetsApi.js
//
// Printed sets on the account (/api/user/printed-sets), offline first:
//   - a new set is drawn on the device (from the saved question pack when
//     offline), kept on this device at once, then sent, or queued when the
//     connection is down (services/writeOrQueue);
//   - edits, deletes and scanned sheets go through the same queue key, so
//     they replay in order and never before their set exists on the server.
// The set itself is cached per id (services/userCache) so the print preview
// opens without the network.
import { auth } from '../../config/firebaseDb';
import { useStore } from '../../store/useStore';
import { apiRequest } from '../../services/dbQueries';
import { writeOrQueue } from '../../services/writeOrQueue';
import {
  deleteUserCache, printedSetCacheName, printedSheetsCacheName, readUserCacheEntry, writeUserCache,
} from '../../services/userCache';
import { ExportError, drawExamPaper } from '../exam-export/drawExamPaper';
import { defaultPrefs, newPrintId, setSizeProblem, toPrintedSet } from './printedSetModel';
import { PRINTED_SETS_ENDPOINT } from './printedSetQueue';
import { effectiveItems, keyVersionOf } from '@ree/shared';

export { PRINTED_SETS_ENDPOINT };

const QUEUE = { queueKey: PRINTED_SETS_ENDPOINT };

export const setEndpoint = (id) => `${PRINTED_SETS_ENDPOINT}/${encodeURIComponent(id)}`;
export const sheetsEndpoint = (id) => `${setEndpoint(id)}/sheets`;
const sheetEndpoint = (id, sheetId) => `${sheetsEndpoint(id)}/${encodeURIComponent(sheetId)}`;

/** The signed-in account (or the device's owner while auth restores). */
export const currentUid = () => auth.currentUser?.uid || useStore.getState().ownerUid || null;

/** A set from a response: `{ item }`, or the row itself. */
export const setFrom = (res) => res?.item || res?.set || (res && typeof res === 'object' && res.id ? res : null);
/** The sheets from a response: `{ items }` or `{ sheets }`. */
export const sheetsFrom = (res) => (Array.isArray(res) ? res : res?.items || res?.sheets || []);

// id -> { uid, set }: the sets this session has open, for an instant repaint.
const memory = new Map();

/** Keep a set in memory and on this device (best effort). */
export function rememberSet(uid, set) {
  if (!uid || !set?.id) return Promise.resolve();
  memory.set(set.id, { uid, set });
  return writeUserCache(uid, printedSetCacheName(set.id), set);
}

/** The copy this session already has, or null. */
export function recalledSet(uid, id) {
  const m = memory.get(id);
  return m && m.uid === uid ? m.set : null;
}

/** Memory, then this device. */
export async function readLocalSet(uid, id) {
  const known = recalledSet(uid, id);
  if (known) return known;
  const entry = await readUserCacheEntry(uid, printedSetCacheName(id));
  if (entry?.value) memory.set(id, { uid, set: entry.value });
  return entry?.value || null;
}

/** Forget a set on this device (deleted, or gone from the account). */
export async function forgetSet(id) {
  memory.delete(id);
  await deleteUserCache(printedSetCacheName(id));
  await deleteUserCache(printedSheetsCacheName(id));
}

/** Test seam. */
export function __resetPrintedSetMemory() {
  memory.clear();
}

/**
 * Draw a paper from the setup screen's config and save it as a printed set.
 * @param {object} config  the setup screen's config
 * @param {{ draw?: object }} [deps]  passed to drawExamPaper (tests inject the bank)
 * @returns {Promise<{ set: object, status: 'sent'|'queued' }>}
 * @throws ExportError with a sentence to show (an AI mock, no questions, refused)
 */
export async function createPrintedSetFromConfig(config, deps = {}) {
  const draw = await drawExamPaper(config, deps.draw);
  const id = newPrintId();
  const body = toPrintedSet(draw, { id, config, prefs: defaultPrefs() });
  const problem = setSizeProblem(body);
  if (problem) throw new ExportError(problem, 'too-large');

  const uid = currentUid();
  const now = new Date().toISOString();
  const local = {
    ...body,
    itemCount: body.items.length,
    keyVersion: keyVersionOf(effectiveItems(body.items, {})),
    printedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await rememberSet(uid, local);

  let result;
  try {
    result = await writeOrQueue(PRINTED_SETS_ENDPOINT, 'POST', body, QUEUE);
  } catch (err) {
    // Refused outright (the account's limit, a rule): it isn't a set.
    await forgetSet(id);
    throw new ExportError(err?.message || "The paper couldn't be saved. Try again.", 'save');
  }
  const saved = result.status === 'sent' ? setFrom(result.data) : null;
  const set = saved ? { ...local, ...saved } : local;
  if (saved) await rememberSet(uid, set);
  return { set, status: result.status };
}

/** The set from the server (throws on 404 and when offline). */
export async function fetchPrintedSet(id) {
  return setFrom(await apiRequest(setEndpoint(id)));
}

/** Edits, prefs and "printed": a delta the server merges. */
export const patchPrintedSet = (id, delta) => writeOrQueue(setEndpoint(id), 'PATCH', delta, QUEUE);

/**
 * Delete a set (and its scanned sheets). `ifUnused` (Draw a new set): the
 * server deletes it only if it was never printed, edited or scanned, which
 * this device can't know for sure (it may have been printed or scanned
 * elsewhere), so this device keeps its copy until the server says.
 */
export async function deletePrintedSet(id, { ifUnused = false } = {}) {
  if (ifUnused) return writeOrQueue(`${setEndpoint(id)}?ifUnused=1`, 'DELETE', null, QUEUE);
  await forgetSet(id);
  return writeOrQueue(setEndpoint(id), 'DELETE', null, QUEUE);
}

export async function fetchSheets(id) {
  return sheetsFrom(await apiRequest(sheetsEndpoint(id)));
}

/** The sheets this device last saw for a set, or null. */
export async function readLocalSheets(uid, id) {
  return (await readUserCacheEntry(uid, printedSheetsCacheName(id)))?.value ?? null;
}

export const writeLocalSheets = (uid, id, sheets) => writeUserCache(uid, printedSheetsCacheName(id), sheets);

/** A scanned sheet: the server scores it. */
export const createSheet = (setId, sheet) => writeOrQueue(sheetsEndpoint(setId), 'POST', sheet, QUEUE);
export const patchSheet = (setId, sheetId, patch) => writeOrQueue(sheetEndpoint(setId, sheetId), 'PATCH', patch, QUEUE);
export const deleteSheet = (setId, sheetId) => writeOrQueue(sheetEndpoint(setId, sheetId), 'DELETE', null, QUEUE);
