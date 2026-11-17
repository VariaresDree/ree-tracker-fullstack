// What a learner may see of the shared handouts (2026-11-17). The admin can
// hide a folder or a file instead of deleting it: a hidden folder hides its
// whole subtree, with the files and quiz files in it. Admins see everything,
// marked, so they can show it again.
const { subtreeIds } = require('./folderTree');

/** Ids of every folder a learner can't see: hidden ones and all inside them. */
function hiddenFolderIds(folders) {
    const out = new Set();
    for (const f of folders) {
        if (f.hidden && !out.has(f.id)) for (const id of subtreeIds(f.id, folders)) out.add(id);
    }
    return out;
}

/** The handout tree as a learner sees it. */
function forLearner({ folders, materials = [], quizFiles = [] }) {
    const hidden = hiddenFolderIds(folders);
    const shown = (folderId) => !folderId || !hidden.has(folderId);
    return {
        folders: folders.filter((f) => !hidden.has(f.id)),
        materials: materials.filter((m) => !m.hidden && shown(m.folderId)),
        quizFiles: quizFiles.filter((q) => shown(q.folderId)),
    };
}

module.exports = { hiddenFolderIds, forLearner };
