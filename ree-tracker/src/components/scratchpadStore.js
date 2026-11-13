// src/components/scratchpadStore.js
//
// What was drawn on the Scratchpad, per question, so closing it no longer
// throws the work away (2026-11-13: the canvas unmounted on close). Strokes,
// not pictures: each is { w, erase, pts } with its points in CSS pixels of a
// canvas `w` wide, so a redraw after a resize or a rotation scales them evenly.
// Kept for the browser session (sessionStorage, so a reload keeps them), for
// the last MAX_KEYS questions.

const STORAGE_KEY = 'ree:scratchpad';
export const MAX_KEYS = 50;

let cache = null; // Map<key, Stroke[]>, least recently used first

function load() {
  if (cache) return cache;
  cache = new Map();
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(saved)) for (const [k, v] of saved) if (typeof k === 'string' && Array.isArray(v)) cache.set(k, v);
  } catch { /* nothing kept, or storage blocked */ }
  return cache;
}

function save() {
  const entries = [...cache.entries()];
  // Full storage: drop the oldest questions until it fits.
  while (entries.length) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); return; } catch { entries.shift(); }
  }
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage blocked */ }
}

/** The strokes kept for a question ([] when none, or no key). */
export function getStrokes(key) {
  if (!key) return [];
  return load().get(key) || [];
}

/** Keeps a question's strokes (an empty list forgets it). */
export function setStrokes(key, strokes) {
  if (!key) return;
  const map = load();
  map.delete(key);
  if (strokes.length) map.set(key, strokes);
  while (map.size > MAX_KEYS) map.delete(map.keys().next().value);
  save();
}

/** Tests only. */
export function resetScratchpadStore() {
  cache = null;
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage blocked */ }
}
