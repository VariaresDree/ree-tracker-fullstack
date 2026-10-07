// src/routes/legacyRoutes.js
//
// Where the pre-2026-10 URLs now live. Materials became the learner Library
// (its old tabs renamed), and its admin tab moved to the Admin area.

const MATERIALS_TAB_TO_LIBRARY = {
  cloud_vault: 'handouts',
  reference: 'formulas',
  bookmarks: 'bookmarks',
  quiz_launcher: 'quizzes',
};

/** /materials, opened with an old `{ tab }` deep link, → its new home. */
export function materialsTarget(state) {
  const tab = state?.tab;
  if (tab === 'manage_ref') return '/admin?tab=references';
  const mapped = MATERIALS_TAB_TO_LIBRARY[tab];
  return mapped ? `/library?tab=${mapped}` : '/library';
}
