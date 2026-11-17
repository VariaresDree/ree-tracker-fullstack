// Hidden handouts (2026-11-17), the client's half of the server's rule
// (ree-tracker-backend/src/services/handoutVisibility.js): a hidden folder hides
// everything inside it. The server already leaves hidden items out for learners;
// the admin gets them all, and this says which are hidden and why.

/** Folder id → the hidden folder that hides it (itself or its nearest hidden ancestor). */
export function hiddenBy(folders) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const out = new Map();
  for (const f of folders) {
    const seen = new Set();
    for (let cur = f; cur && !seen.has(cur.id); cur = byId.get(cur.parentId)) {
      seen.add(cur.id);
      if (cur.hidden) { out.set(f.id, cur); break; }
    }
  }
  return out;
}

/** The tree as a learner sees it. */
export function forLearner({ folders, materials, quizFiles }) {
  const hidden = hiddenBy(folders);
  const shown = (folderId) => !folderId || !hidden.has(folderId);
  return {
    folders: folders.filter((f) => !hidden.has(f.id)),
    materials: materials.filter((m) => !m.hidden && shown(m.folderId)),
    quizFiles: quizFiles.filter((q) => shown(q.folderId)),
  };
}
