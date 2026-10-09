// src/services/mockHistoryCache.js
//
// The last Past sittings list, kept per account for the tab's lifetime so a
// return to Exams › Past sittings paints at once while the fresh list loads
// (components/MockBoardAnalytics.jsx). Keyed by uid: an unkeyed cache showed
// the previous account's ledger to the next user who signed in in the same tab.

let cached = { uid: null, rows: null };

/** The cached rows for this account, or null. */
export const cachedMockHistory = (uid) => (uid && cached.uid === uid ? cached.rows : null);

/** Remember the rows for this account. */
export const rememberMockHistory = (uid, rows) => { cached = { uid, rows }; };

/** Forget the list (tests; a sign-out needs nothing: the uid key handles it). */
export const forgetMockHistory = () => { cached = { uid: null, rows: null }; };
