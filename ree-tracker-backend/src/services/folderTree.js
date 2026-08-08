// src/services/folderTree.js
// Pure helpers for Folder.parentId integrity. Extracted so the cycle-guard
// logic is unit-testable without a database — see tests/folderTree.test.js.
//
// Folder.parentId now has a real FK (see prisma/schema.prisma), but a foreign
// key only guarantees the referenced row EXISTS — it cannot express "the
// parent chain must not loop back on itself". Nothing previously stopped a
// move from setting a folder's parentId to itself or to one of its own
// descendants, and that silent corruption is exactly what made whole subtrees
// unreachable from the vault root (present in the DB, invisible in the app —
// see scripts/recoverOrphanedFolders.js). wouldCreateCycle is the guard that
// stops it from happening again.

/**
 * Would setting `folderId`'s parent to `newParentId` create a self-reference
 * or a cycle? Walks up from `newParentId` — if `folderId` is encountered
 * before hitting root (null), the move is illegal.
 *
 * @param {string} folderId     the folder being moved
 * @param {string|null} newParentId  its proposed new parent (null = root, always safe)
 * @param {Map<string, {id, parentId}>} byId  every folder, keyed by id
 * @returns {boolean}
 */
function wouldCreateCycle(folderId, newParentId, byId) {
    if (!newParentId) return false;
    if (newParentId === folderId) return true;
    const seen = new Set();
    let cur = byId.get(newParentId);
    while (cur) {
        if (cur.id === folderId) return true;
        if (seen.has(cur.id)) return false; // pre-existing unrelated cycle — not this move's problem
        seen.add(cur.id);
        cur = cur.parentId ? byId.get(cur.parentId) : null;
    }
    return false;
}

/**
 * Every folder id in the subtree rooted at `folderId` (inclusive) — used to
 * find every material whose blob needs deleting when a folder with nested
 * children is removed, since a Prisma cascade deletes the ROWS but not the
 * storage objects they pointed at.
 *
 * @param {string} folderId
 * @param {Array<{id, parentId}>} allFolders
 * @returns {Set<string>}
 */
function subtreeIds(folderId, allFolders) {
    const childrenByParent = new Map();
    for (const f of allFolders) {
        if (!f.parentId) continue;
        if (!childrenByParent.has(f.parentId)) childrenByParent.set(f.parentId, []);
        childrenByParent.get(f.parentId).push(f.id);
    }
    const ids = new Set([folderId]);
    const queue = [folderId];
    while (queue.length > 0) {
        const cur = queue.shift();
        for (const childId of childrenByParent.get(cur) || []) {
            if (!ids.has(childId)) {
                ids.add(childId);
                queue.push(childId);
            }
        }
    }
    return ids;
}

module.exports = { wouldCreateCycle, subtreeIds };
