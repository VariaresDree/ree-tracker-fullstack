// src/services/aiExplanations.js
//
// "Explain with AI" for any question, on every surface (Practice, the mock
// review, Bookmarks, a past sitting). Explanations are saved on this device,
// per account, keyed by question — so one already generated opens offline and
// isn't paid for twice.
//
// They used to be pushed to PUT /api/questions/:id/cache, which writes the
// question's official solution and is admin-only. Practice awaited it, so every
// learner's request ended in a 403 and the explanation was thrown away; the
// simulator and Bookmarks swallowed the 403 and never saved anything. An AI
// explanation is never written over the official solution now; admins curate
// those in Admin › Explanation review.
import { generateMasterExplanation } from './geminiApi';
import { readUserCache, writeUserCache } from './userCache';
import { fnv1a } from '../utils/contentHash';

export const AI_EXPLANATIONS_CACHE = 'aiExplanations';
// Newest kept first; an explanation is a few kB, so this stays well under 1 MB.
export const MAX_SAVED_EXPLANATIONS = 200;

/** The key an explanation is saved under: the question id, or its text. */
export function explanationKey(question) {
  if (!question) return null;
  if (question.id) return String(question.id);
  const text = question.text || question.question || question.content || '';
  return text ? `t:${fnv1a(text)}` : null;
}

/** Every saved explanation for this account, { [key]: { text, savedAt } }. */
export async function readSavedExplanations(uid) {
  const map = await readUserCache(uid, AI_EXPLANATIONS_CACHE);
  return map && typeof map === 'object' ? map : {};
}

/** Saves one explanation, keeping the newest MAX_SAVED_EXPLANATIONS. */
export async function saveExplanation(uid, key, text) {
  if (!uid || !key || !text) return;
  const map = await readSavedExplanations(uid);
  map[key] = { text, savedAt: Date.now() };
  const keep = Object.entries(map)
    .sort((a, b) => (b[1]?.savedAt || 0) - (a[1]?.savedAt || 0))
    .slice(0, MAX_SAVED_EXPLANATIONS);
  await writeUserCache(uid, AI_EXPLANATIONS_CACHE, Object.fromEntries(keep));
}

/** Asks the model for a fresh explanation. Throws when none can be had. */
export async function requestExplanation(question) {
  const text = await generateMasterExplanation(question);
  if (typeof text !== 'string' || !text.trim()) throw new Error('Empty AI explanation');
  return text;
}
