// src/features/links/useUserLinks.js
//
// The learner's own links (Library › Links): the CELE tracker's "Useful
// links", offline-first (hooks/createSyncedList).
import { createSyncedList } from '../../hooks/createSyncedList';

export const USER_LINKS_ENDPOINT = '/api/user/links';

const list = createSyncedList({
  endpoint: USER_LINKS_ENDPOINT,
  cacheName: 'userLinks',
  // Pinned first, then newest, as the server lists them.
  sort: (a, b) => (b.pinned === true) - (a.pinned === true) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
});

export const useUserLinks = list.useList;
export const applyLinkChange = list.applyChange;
/** Test seam: forget the module-level copy between cases. */
export const __resetUserLinksMemory = list.reset;
