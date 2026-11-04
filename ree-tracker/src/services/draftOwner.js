// src/services/draftOwner.js
//
// An unfinished exam on this browser belongs to whoever sat it. The drafts
// (mock, Gauntlet, full board, Practice) sit in localStorage with no owner, and sign-out
// leaves them, so the next account to sign in here was offered the last one's
// exam to resume, and to submit under its own name.
//
// Same idea as the API cache's owner (services/apiCache.js), with one difference:
// an unknown owner keeps the drafts. Here that means a draft from before owners
// were recorded, nearly always the person now signing in, and clearing it would
// end a running exam when this ships.
const OWNER_KEY = 'ree-drafts-owner';
const DRAFT_KEYS = ['ree_sim_cache', 'ree_gauntlet_cache', 'ree_full_board', 'ree_practice_cache'];

/** Call when an account signs in, before anything reads a draft. */
export function claimDraftsFor(uid) {
  if (!uid) return;
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner && owner !== uid) DRAFT_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(OWNER_KEY, uid);
  } catch { /* storage unavailable: there are no drafts to protect either */ }
}
