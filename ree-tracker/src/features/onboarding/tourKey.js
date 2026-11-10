// src/features/onboarding/tourKey.js
//
// Getting started's own key on this device, per account: the fallback when the
// account's answer (stats.tourDoneAt) can't be read or written. Its own module,
// so Today and Account can read it without loading the card.
export const tourKey = (uid) => `ree_tour_seen:${uid}`;

export const tourSeen = (uid) => {
  try { return localStorage.getItem(tourKey(uid)) === '1'; } catch { return false; }
};

export const forgetTourSeen = (uid) => {
  try { localStorage.removeItem(tourKey(uid)); } catch { /* nothing kept */ }
};
