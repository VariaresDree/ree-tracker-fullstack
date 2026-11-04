// src/features/active-recall/savedSession.js
//
// A running Practice session, kept on this device so a closed tab or a trip to
// another page doesn't lose your place. Each answer is already saved on its own;
// this keeps the set, where you were and the tally. Cleared when the session ends.
// The account's draft rules apply (services/draftOwner.js).
const KEY = 'ree_practice_cache';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function saveSession(draft) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() })); } catch { /* quota: best effort */ }
}

export function clearSavedSession() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}

// Nothing left to do: the last item is answered, or an adaptive set has its count.
const isDone = (d) => (d.adaptive
  ? (d.batch || []).length >= d.adaptive.target
  : d.isAnswered && d.currentIndex + 1 >= d.questions.length);

/** The saved session, or null if there isn't one worth going back to. */
export function loadSavedSession(now = Date.now()) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    const usable = Array.isArray(draft?.questions) && draft.questions.length > 0 && now - (draft.savedAt || 0) <= MAX_AGE_MS && !isDone(draft);
    if (!usable) { clearSavedSession(); return null; }
    return draft;
  } catch {
    clearSavedSession();
    return null;
  }
}
