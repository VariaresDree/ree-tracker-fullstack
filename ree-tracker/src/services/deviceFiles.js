// src/services/deviceFiles.js
//
// My files: PDFs, images, text and audio kept only on this device, by account. The
// bytes and the details are stored apart, so a list never reads a whole file. Nothing
// here can reach a server, which deviceFiles.isolation.test.js holds it to.
import { deviceDel, deviceEntries, deviceGet, deviceSet } from './deviceStore';
import { formatBytes } from '../utils/bytes';

export const MAX_FILE_BYTES = 200 * 1024 * 1024;

const owner = (uid) => uid || 'local';
const metaKey = (uid, id) => `${owner(uid)}:file:meta:${id}`;
const blobKey = (uid, id) => `${owner(uid)}:file:blob:${id}`;

const EXTENSION_KIND = { pdf: 'pdf', txt: 'text', md: 'text', csv: 'text', log: 'text' };

/** What the viewer treats it as, or null for a type it can't open. */
export function fileKind({ type = '', name = '' }) {
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('text/')) return 'text';
  return EXTENSION_KIND[name.split('.').pop()?.toLowerCase()] || null;
}

/** Refuses what can't fit, before anything is written. Passes if the browser won't say. */
export async function checkSpace(size) {
  if (size > MAX_FILE_BYTES) throw new Error(`That’s ${formatBytes(size)}. Files can be up to ${formatBytes(MAX_FILE_BYTES)}.`);
  await checkFreeSpace(size);
}

export async function checkFreeSpace(size) {
  try {
    const { usage = 0, quota } = await navigator.storage.estimate();
    if (quota !== undefined && quota - usage < size) {
      throw new Error(`This needs ${formatBytes(size)}, and this device has ${formatBytes(Math.max(0, quota - usage))} free for the app.`);
    }
  } catch (err) {
    if (err?.message?.startsWith('This needs')) throw err;
  }
}

/**
 * Keep a file on this device. The bytes go first, so a details row never points at
 * nothing; if the details can't be written, the bytes come back out.
 * @param blob    a File or Blob
 * @param details { name, kind, source? } `source` says what it came from, such as a handout.
 * @returns the saved details
 */
export async function addDeviceFile(uid, blob, { name, kind, source = null }) {
  await checkSpace(blob.size);
  const id = crypto.randomUUID();
  const meta = { id, name, kind, mime: blob.type || '', size: blob.size, addedAt: Date.now(), source };
  await deviceSet(blobKey(uid, id), blob);
  try {
    await deviceSet(metaKey(uid, id), meta);
  } catch (err) {
    await deviceDel(blobKey(uid, id));
    throw err;
  }
  return meta;
}

/** Put a file back from a backup, under its own id. One already here stays as it is. */
export async function restoreDeviceFile(uid, meta, blob) {
  if (await deviceGet(metaKey(uid, meta.id))) return false;
  await deviceSet(blobKey(uid, meta.id), blob);
  try {
    await deviceSet(metaKey(uid, meta.id), meta);
  } catch (err) {
    await deviceDel(blobKey(uid, meta.id));
    throw err;
  }
  return true;
}

/** Every file's details, newest first. Reads no file's bytes. */
export async function listDeviceFiles(uid) {
  const rows = await deviceEntries(metaKey(uid, ''));
  return rows.map(([, meta]) => meta).sort((a, b) => b.addedAt - a.addedAt);
}

export const getDeviceFileBlob = (uid, id) => deviceGet(blobKey(uid, id));

export async function renameDeviceFile(uid, id, name) {
  const meta = await deviceGet(metaKey(uid, id));
  if (!meta) return null;
  const next = { ...meta, name };
  await deviceSet(metaKey(uid, id), next);
  return next;
}

export async function deleteDeviceFile(uid, id) {
  await deviceDel(metaKey(uid, id));
  await deviceDel(blobKey(uid, id));
}
