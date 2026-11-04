// src/features/quiz-launcher/quizStore.js
//
// Imported quizzes on this device: the file, the unfinished run and the last few
// attempts, by account. Nothing here reaches a server, which the isolation test
// holds it to. If the browser won't store anything (a private window), they live
// in memory until the tab closes, and the caller is told so it can say.
import { deviceDel, deviceEntries, deviceGet, deviceSet } from '../../services/deviceStore';

const MAX_ATTEMPTS = 20;
const owner = (uid) => uid || 'local';
const key = (uid, kind, id) => `${owner(uid)}:quiz:${kind}:${id}`;

const memory = new Map();

/** Returns false when it could only be kept in memory. */
async function put(k, value) {
  try {
    await deviceSet(k, value);
    memory.delete(k);
    return true;
  } catch {
    memory.set(k, value);
    return false;
  }
}
const read = async (k) => (memory.has(k) ? memory.get(k) : deviceGet(k));
const remove = async (k) => {
  memory.delete(k);
  await deviceDel(k);
};

/** The same file imported twice is one quiz: its id comes from its bytes. */
export async function quizIdFor(buffer) {
  try {
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(hash)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return crypto.randomUUID();
  }
}

export const saveQuiz = (uid, quiz) => put(key(uid, 'file', quiz.id), quiz);
export const getQuiz = (uid, id) => read(key(uid, 'file', id));
export const saveRun = (uid, id, run) => put(key(uid, 'run', id), run);
export const getRun = (uid, id) => read(key(uid, 'run', id));
export const clearRun = (uid, id) => remove(key(uid, 'run', id));
export const getAttempts = async (uid, id) => (await read(key(uid, 'attempts', id))) || [];

export async function recordAttempt(uid, id, attempt) {
  const attempts = [...await getAttempts(uid, id), attempt].slice(-MAX_ATTEMPTS);
  await put(key(uid, 'attempts', id), attempts);
  return attempts;
}

/** A new version of a quiz keeps the old one's scores, oldest first. */
export async function carryAttempts(uid, fromId, toId) {
  const attempts = [...await getAttempts(uid, fromId), ...await getAttempts(uid, toId)]
    .sort((a, b) => (a.at || 0) - (b.at || 0))
    .slice(-MAX_ATTEMPTS);
  if (attempts.length > 0) await put(key(uid, 'attempts', toId), attempts);
}

/** Attempts from a backup, merged with any here. The same attempt isn't counted twice. */
export async function mergeAttempts(uid, id, incoming = []) {
  const here = await getAttempts(uid, id);
  const seen = new Set(here.map((a) => a.at));
  const attempts = [...here, ...incoming.filter((a) => !seen.has(a.at))]
    .sort((a, b) => (a.at || 0) - (b.at || 0))
    .slice(-MAX_ATTEMPTS);
  if (attempts.length > 0) await put(key(uid, 'attempts', id), attempts);
}

export async function deleteQuiz(uid, id) {
  await Promise.all(['file', 'run', 'attempts'].map((kind) => remove(key(uid, kind, id))));
}

/** Every saved quiz with its run and attempts, newest first. */
export async function listQuizzes(uid) {
  const prefix = key(uid, 'file', '');
  const saved = await deviceEntries(prefix);
  const held = [...memory.entries()].filter(([k]) => k.startsWith(prefix));
  const quizzes = [...new Map([...saved, ...held]).values()];
  const withState = await Promise.all(quizzes.map(async (quiz) => ({
    ...quiz,
    run: (await getRun(uid, quiz.id)) || null,
    attempts: await getAttempts(uid, quiz.id),
  })));
  return withState.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

/** Test seam. */
export function __clearQuizMemory() {
  memory.clear();
}
