// src/features/shared-quizzes/quizFilesApi.js
//
// The server side of shared quiz files. It lives outside features/quiz-launcher,
// which must never reach the server (quizLauncher.isolation.test.js). A slow
// timeout, because Render's free tier can take most of a minute to wake.
import { apiRequest } from '../../services/dbQueries';

const SLOW = 60_000;
const queryOf = (meta) => new URLSearchParams(
  Object.entries(meta).filter(([, v]) => v !== null && v !== undefined && v !== ''),
).toString();

// The last list, for this visit, so switching tabs doesn't make the section jump.
let lastList = null;
export const lastQuizFiles = () => lastList;
/** Test seam. */
export function __resetQuizFileCache() {
  lastList = null;
}

export const listQuizFiles = async () => {
  lastList = (await apiRequest('/api/quiz-files', 'GET', null, { timeoutMs: SLOW })).items;
  return lastList;
};
export const downloadQuizFile = (id) => apiRequest(`/api/quiz-files/${encodeURIComponent(id)}/file`, 'GET', null, { timeoutMs: SLOW, asBuffer: true });

export const uploadQuizFile = async (meta, file) => (
  await apiRequest(`/api/admin/quiz-files?${queryOf(meta)}`, 'POST', null, { timeoutMs: SLOW, rawBody: file })
).item;
export const replaceQuizFile = async (id, meta, file) => (
  await apiRequest(`/api/admin/quiz-files/${encodeURIComponent(id)}/file?${queryOf(meta)}`, 'PUT', null, { timeoutMs: SLOW, rawBody: file })
).item;
export const updateQuizFile = async (id, patch) => (
  await apiRequest(`/api/admin/quiz-files/${encodeURIComponent(id)}`, 'PATCH', patch, { timeoutMs: SLOW })
).item;
export const deleteQuizFile = (id) => apiRequest(`/api/admin/quiz-files/${encodeURIComponent(id)}`, 'DELETE', null, { timeoutMs: SLOW });

/** apiRequest's sentinels in plain words. */
export function plainError(err) {
  if (err?.message === '[OFFLINE]') return 'You’re offline. Try again once you’re connected.';
  if (err?.message === '[TIMEOUT]') return 'The server took too long to answer. Try again.';
  return err?.message || 'Something went wrong. Try again.';
}
