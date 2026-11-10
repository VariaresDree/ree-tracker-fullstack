// src/features/backup/backupFile.js
//
// A .reebak file: a ZIP holding a plain manifest, an index of what's inside, your
// account's rows, and your device files split into 8 MB pieces. With a passphrase, every
// entry but the manifest is sealed on its own with AES-GCM, so memory stays bounded
// and no file name or score can be read without it. A lost passphrase can't be recovered.
import { checkFreeSpace, getDeviceFileBlob, listDeviceFiles, listDeviceFolders, restoreDeviceFile, restoreDeviceFolders } from '../../services/deviceFiles';
import { deviceEntries } from '../../services/deviceStore';
import { getAttempts, getRun } from '../quiz-launcher/quizStore';
import { refreshQuizzes, restoreQuiz } from '../quiz-launcher/quizSession';
import { BackupError, ZipWriter, readZip } from './storedZip';

const FORMAT = 'ree-backup';
const VERSION = 1;
export const PBKDF2_ITERATIONS = 600_000;
const CHUNK_BYTES = 8 * 1024 * 1024;
const SETTINGS_KEYS = ['ree-theme', 'ree-texture', 'ree:units', 'ree:quiz-setup', 'ree:practice-builder', 'ree:offline-pack-size'];

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function makeKey(passphrase, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** The entry's name is bound in, so pieces can't be swapped around in the file. */
async function seal(key, name, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(name) }, key, bytes));
  const out = new Uint8Array(12 + sealed.length);
  out.set(iv);
  out.set(sealed, 12);
  return out;
}

const unseal = (key, name, bytes) => crypto.subtle.decrypt(
  { name: 'AES-GCM', iv: bytes.subarray(0, 12), additionalData: encoder.encode(name) },
  key,
  bytes.subarray(12),
).then((plain) => new Uint8Array(plain));

const piecesOf = (size) => Math.max(1, Math.ceil(size / CHUNK_BYTES));
const partName = (kind, id, n) => `data/${kind}/${id}/${n}`;

const readSettings = () => {
  const out = {};
  for (const key of SETTINGS_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) out[key] = value;
    } catch { /* not available here */ }
  }
  return out;
};

const quizRecords = async (uid) => (await deviceEntries(`${uid}:quiz:file:`)).map(([, quiz]) => quiz);

/** How much there is to back up, for the screen before it starts. */
export async function measureBackup(uid) {
  const [files, quizzes] = await Promise.all([listDeviceFiles(uid), quizRecords(uid)]);
  const handouts = files.filter((f) => f.source?.kind === 'handout');
  const own = files.filter((f) => f.source?.kind !== 'handout');
  const sum = (list) => list.reduce((n, f) => n + (f.size || 0), 0);
  return {
    ownCount: own.length,
    ownBytes: sum(own),
    handoutCount: handouts.length,
    handoutBytes: sum(handouts),
    quizCount: quizzes.length,
    quizBytes: quizzes.reduce((n, q) => n + (q.file?.size || 0), 0),
  };
}

/**
 * @param options.account  the rows from /api/user/export, or null when offline
 * @param options.onProgress  called with a sentence as it goes
 * @returns a Blob
 */
export async function buildBackup(uid, { email = null, passphrase = '', includeHandouts = false, account = null, onProgress = () => {}, iterations = PBKDF2_ITERATIONS, now = new Date() }) {
  const zip = new ZipWriter();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = passphrase ? await makeKey(passphrase, salt, iterations) : null;
  const put = async (name, bytes) => zip.add(name, key ? await seal(key, name, bytes) : bytes);
  const putBlob = async (kind, id, blob) => {
    const parts = piecesOf(blob.size);
    for (let n = 0; n < parts; n += 1) {
      await put(partName(kind, id, n), new Uint8Array(await blob.slice(n * CHUNK_BYTES, (n + 1) * CHUNK_BYTES).arrayBuffer()));
    }
    return parts;
  };

  zip.add('manifest.json', encoder.encode(JSON.stringify({
    format: FORMAT,
    version: VERSION,
    createdAt: now.toISOString(),
    encrypted: !!key,
    ...(key ? { kdf: { name: 'PBKDF2-SHA256', iterations, salt: toBase64(salt) }, cipher: 'AES-GCM' } : {}),
  }, null, 2)));

  // Folders ride in the index with no version bump: an older app ignores them, and
  // reading one from before them takes `index.folders ?? []`.
  const index = { createdAt: now.toISOString(), uid, email, settings: readSettings(), folders: await listDeviceFolders(uid), files: [], quizzes: [], hasAccount: !!account };

  const files = (await listDeviceFiles(uid)).filter((f) => includeHandouts || f.source?.kind !== 'handout');
  for (const [i, meta] of files.entries()) {
    onProgress(`Adding file ${i + 1} of ${files.length}…`);
    const blob = await getDeviceFileBlob(uid, meta.id);
    if (blob) index.files.push({ ...meta, parts: await putBlob('files', meta.id, blob) });
  }

  const quizzes = await quizRecords(uid);
  for (const [i, quiz] of quizzes.entries()) {
    onProgress(`Adding quiz ${i + 1} of ${quizzes.length}…`);
    if (!quiz.file) continue;
    index.quizzes.push({
      id: quiz.id,
      fileName: quiz.fileName,
      addedAt: quiz.addedAt,
      shared: quiz.shared || null,
      size: quiz.file.size,
      parts: await putBlob('quizzes', quiz.id, quiz.file),
      attempts: await getAttempts(uid, quiz.id),
      run: (await getRun(uid, quiz.id)) || null,
    });
  }

  if (account) await put('data/account.json', encoder.encode(JSON.stringify(account)));
  await put('data/index.json', encoder.encode(JSON.stringify(index)));
  onProgress('Finishing…');
  return zip.finish();
}

export const backupFileName = (now = new Date()) => `ree-backup-${now.toISOString().slice(0, 10)}.reebak`;

/** Open a file and check it's one of ours. Says whether it needs a passphrase. */
export async function openBackup(file) {
  const zip = await readZip(file);
  if (!zip.has('manifest.json')) throw new BackupError('not-backup', 'That isn’t a backup from this app.');
  let manifest;
  try {
    manifest = JSON.parse(decoder.decode(await zip.read('manifest.json')));
  } catch (err) {
    if (err instanceof BackupError) throw err;
    throw new BackupError('not-backup', 'That isn’t a backup from this app.');
  }
  if (manifest.format !== FORMAT) throw new BackupError('not-backup', 'That isn’t a backup from this app.');
  if (manifest.version > VERSION) throw new BackupError('newer', 'This backup was made by a newer version of the app. Reload the app, then try again.');
  return { zip, manifest };
}

/** Read the index, with the passphrase if it needs one. */
export async function unlockBackup({ zip, manifest }, passphrase = '') {
  let key = null;
  if (manifest.encrypted) {
    if (!passphrase) throw new BackupError('wrong-passphrase', 'This backup has a passphrase.');
    key = await makeKey(passphrase, fromBase64(manifest.kdf.salt), manifest.kdf.iterations);
  }
  const get = async (name) => {
    const bytes = await zip.read(name);
    if (!key) return bytes;
    try {
      return await unseal(key, name, bytes);
    } catch {
      throw new BackupError(name === 'data/index.json' ? 'wrong-passphrase' : 'corrupt', name === 'data/index.json' ? 'That passphrase isn’t right.' : 'This backup file is damaged, so it can’t be restored.');
    }
  };
  let index;
  try {
    index = JSON.parse(decoder.decode(await get('data/index.json')));
  } catch (err) {
    if (err instanceof BackupError) throw err;
    throw new BackupError('corrupt', 'This backup file is damaged, so it can’t be restored.');
  }
  const blobOf = async (kind, id, parts, type) => {
    const pieces = [];
    for (let n = 0; n < parts; n += 1) pieces.push(new Blob([await get(partName(kind, id, n))]));
    return new Blob(pieces, { type });
  };
  return {
    index,
    readAccount: async () => (index.hasAccount ? JSON.parse(decoder.decode(await get('data/account.json'))) : null),
    blobOf,
  };
}

/** What restoring would add to this device. Nothing already here is touched. */
export async function previewDevice(uid, { index }) {
  const [files, quizzes] = await Promise.all([listDeviceFiles(uid), quizRecords(uid)]);
  const haveFiles = new Set(files.map((f) => f.id));
  const haveQuizzes = new Set(quizzes.map((q) => q.id));
  const newFiles = index.files.filter((f) => !haveFiles.has(f.id));
  const newQuizzes = index.quizzes.filter((q) => !haveQuizzes.has(q.id));
  return {
    newFiles,
    newQuizzes,
    filesHere: index.files.length - newFiles.length,
    quizzesHere: index.quizzes.length - newQuizzes.length,
    bytes: newFiles.reduce((n, f) => n + f.size, 0) + newQuizzes.reduce((n, q) => n + q.size, 0),
  };
}

/** Add what's missing from this device. Scores on a quiz already here are merged. */
export async function restoreDevice(uid, handle, { onProgress = () => {} } = {}) {
  const { index, blobOf } = handle;
  const { newFiles, newQuizzes, bytes } = await previewDevice(uid, handle);
  await checkFreeSpace(bytes);
  // The folders first, so a restored file lands in its folder.
  await restoreDeviceFolders(uid, Array.isArray(index.folders) ? index.folders : []);
  for (const [i, file] of newFiles.entries()) {
    onProgress(`Restoring file ${i + 1} of ${newFiles.length}…`);
    const { parts, ...meta } = file;
    await restoreDeviceFile(uid, meta, await blobOf('files', meta.id, parts, meta.mime));
  }
  for (const [i, quiz] of index.quizzes.entries()) {
    onProgress(`Restoring quiz ${i + 1} of ${index.quizzes.length}…`);
    const blob = await blobOf('quizzes', quiz.id, quiz.parts, 'application/zip');
    await restoreQuiz(uid, { buffer: await blob.arrayBuffer(), fileName: quiz.fileName, addedAt: quiz.addedAt, shared: quiz.shared, attempts: quiz.attempts, run: quiz.run });
  }
  await refreshQuizzes(uid);
  let settings = 0;
  for (const [key, value] of Object.entries(index.settings || {})) {
    if (!SETTINGS_KEYS.includes(key)) continue;
    try {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, value);
        settings += 1;
      }
    } catch { /* not available here */ }
  }
  return { files: newFiles.length, quizzes: newQuizzes.length, settings };
}
