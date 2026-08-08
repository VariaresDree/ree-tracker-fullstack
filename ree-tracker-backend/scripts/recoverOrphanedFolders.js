#!/usr/bin/env node
/*
 * One-time repair for Folder.parentId corruption. Folder.parentId used to be a
 * bare String with no foreign key, no cascade, and (before this fix) no
 * validation at write time — so nothing stopped a folder from ending up
 * pointing at a deleted id, its OWN id, or a cycle with another folder. Any of
 * those makes the folder (and its whole subtree) unreachable from the vault
 * root: `visibleFolders` in CloudVaultTab filters on
 * `(f.parentId || 'root') === currentFolderId`, and a corrupted parentId never
 * resolves back to 'root' no matter how far up you navigate. The rows are
 * still in the database — present in Supabase, invisible in the app.
 *
 * This finds every folder unreachable from root and classifies it:
 *   - dangling   parentId points at an id that no longer exists
 *   - self       parentId === the folder's own id
 *   - cycle      parentId chain loops back on itself without ever hitting null
 *
 * Fixes:
 *   - dangling and self  -> nulled automatically (unambiguous: the folder was
 *                           always meant to be reachable, root is the only
 *                           safe place that doesn't guess at intent)
 *   - cycle              -> requires an explicit --root <folderId> flag naming
 *                           which member of the cycle becomes the true
 *                           top-level folder. Un-designated cycles are
 *                           reported and left untouched — this script never
 *                           guesses which folder in an ambiguous cycle was
 *                           "correct".
 *
 * Nothing is moved into a new bucket folder: every affected folder's existing
 * children keep their real parent links (which were never broken), so nulling
 * just the corrupted anchor restores the entire original tree structure
 * exactly as it was — no re-filing needed.
 *
 * Usage:
 *   node scripts/recoverOrphanedFolders.js --dry-run
 *   node scripts/recoverOrphanedFolders.js --dry-run --root <folderId>   # repeatable
 *   node scripts/recoverOrphanedFolders.js --root <folderId>             # apply
 *
 * Idempotent: re-running after a full repair finds nothing broken.
 */
require('dotenv').config();
const prisma = require('../src/config/db');

function parseArgs(argv) {
  const out = { dryRun: false, roots: [] };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--dry-run') out.dryRun = true;
    else if (rest[i] === '--root') out.roots.push(rest[++i]);
  }
  return out;
}

/**
 * Classify a folder's reachability from root by walking its parent chain.
 * Pure — takes a Map<id, folder> so it's unit-testable without a database.
 */
function classifyFolder(folder, byId) {
  // True self-reference (parentId === own id) is checked as its own one-hop
  // case FIRST — the generic walk below would otherwise also report a 2+-node
  // cycle as 'self' whenever classification happens to start ON a member of
  // that cycle (the walk loops back to the start either way; only a literal
  // one-hop self-parent is genuinely unambiguous about what "self" means).
  if (folder.parentId === folder.id) return 'self';
  const seen = new Set([folder.id]);
  let cur = folder;
  while (cur.parentId) {
    const next = byId.get(cur.parentId);
    if (!next) return 'dangling';
    if (seen.has(next.id)) return 'cycle';
    seen.add(next.id);
    cur = next;
  }
  return 'root-reachable';
}

/**
 * Is `folder` itself a genuine participant in a cycle — i.e. does its OWN
 * parent chain lead back to ITSELF — as opposed to merely being a descendant
 * whose ancestor chain passes through an unrelated cycle further up?
 *
 * This distinction matters: classifyFolder('cycle') is true for BOTH a real
 * cycle member (e.g. "Powerline Review", whose parentId chain is
 * Powerline -> Mathematics -> Powerline) AND for every ordinary,
 * correctly-linked descendant nested underneath one (e.g. "PL - EE Modules",
 * whose own parentId is completely fine — it just happens to be unreachable
 * because Powerline/Mathematics above it are broken). Only genuine members
 * need their parentId edited; descendants heal for free the moment their
 * ancestor is fixed, and must never be offered a --root choice they have no
 * real stake in.
 */
function isCycleAnchor(folder, byId) {
  if (!folder.parentId) return false;
  const seen = new Set();
  let cur = byId.get(folder.parentId);
  while (cur) {
    if (cur.id === folder.id) return true; // path leads back to the start
    if (seen.has(cur.id)) return false;    // looped, but into a DIFFERENT cycle upstream
    seen.add(cur.id);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  return false;
}

/**
 * Group cycle-ANCHOR folders (see isCycleAnchor — callers must pre-filter to
 * true participants, not mere descendants) into their connected cycle
 * components (a folder's cycle-mates = every folder encountered while walking
 * its own parent chain before it repeats). Pure, unit-testable.
 */
function groupCycles(cycleFolders, byId) {
  const groups = [];
  const assigned = new Set();
  for (const f of cycleFolders) {
    if (assigned.has(f.id)) continue;
    const members = [];
    const seen = new Set();
    let cur = f;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      members.push(cur.id);
      cur = byId.get(cur.parentId);
    }
    members.forEach((id) => assigned.add(id));
    groups.push(members);
  }
  return groups;
}

async function main() {
  const { dryRun, roots } = parseArgs(process.argv);
  const rootSet = new Set(roots);
  const tStart = Date.now();
  console.log(`[recoverOrphanedFolders] start  dryRun=${dryRun}  roots=${roots.join(',') || '(none)'}`);

  const folders = await prisma.folder.findMany();
  const materials = await prisma.material.findMany();
  const byId = new Map(folders.map((f) => [f.id, f]));

  const dangling = [];
  const selfRef = [];
  const unreachable = []; // classifyFolder === 'cycle' — members AND their descendants
  let healedDescendants = 0;

  for (const f of folders) {
    const cls = classifyFolder(f, byId);
    if (cls === 'dangling') dangling.push(f);
    else if (cls === 'self') selfRef.push(f);
    else if (cls === 'cycle') unreachable.push(f);
  }

  // Only genuine cycle PARTICIPANTS need their parentId edited — everything
  // else in `unreachable` is a correctly-linked descendant that becomes
  // reachable for free once its ancestor anchor is fixed (see isCycleAnchor).
  const cycleAnchors = unreachable.filter((f) => isCycleAnchor(f, byId));
  healedDescendants = unreachable.length - cycleAnchors.length;
  const cycles = groupCycles(cycleAnchors, byId);

  const report = (label, list) => {
    for (const f of list) {
      const subfolders = folders.filter((x) => x.parentId === f.id).length;
      const mats = materials.filter((m) => m.folderId === f.id).length;
      console.log(`[recoverOrphanedFolders]   [${label}] ${f.id}  "${f.name}"  subfolders=${subfolders}  materials=${mats}`);
    }
  };

  console.log(`[recoverOrphanedFolders] dangling=${dangling.length}  self=${selfRef.length}  cycles=${cycles.length} (${cycleAnchors.length} anchor folder(s))  +${healedDescendants} descendant folder(s) that heal automatically once their ancestor is fixed`);
  report('dangling', dangling);
  report('self', selfRef);

  const toNull = [...dangling, ...selfRef];
  const skippedCycles = [];

  for (const group of cycles) {
    const chosen = group.find((id) => rootSet.has(id));
    if (!chosen) {
      skippedCycles.push(group);
      console.log(`[recoverOrphanedFolders]   [cycle, UNRESOLVED — pass --root <id>] members: ${group.map((id) => `${id} (${byId.get(id)?.name})`).join(' -> ')}`);
      continue;
    }
    const f = byId.get(chosen);
    console.log(`[recoverOrphanedFolders]   [cycle, resolving to root] ${f.id}  "${f.name}"  (cycle-mates stay nested under it, unchanged)`);
    toNull.push(f);
  }

  if (dryRun) {
    console.log(`[recoverOrphanedFolders] dry run — would null parentId on ${toNull.length} folder(s); ${skippedCycles.length} cycle(s) left unresolved.`);
  } else {
    for (const f of toNull) {
      await prisma.folder.update({ where: { id: f.id }, data: { parentId: null } });
    }
    console.log(`[recoverOrphanedFolders] repaired ${toNull.length} folder(s).`);
  }

  if (skippedCycles.length > 0) {
    console.log(`[recoverOrphanedFolders] ${skippedCycles.length} cycle(s) still unresolved — re-run with --root <folderId> for each to fix them.`);
  }

  const ms = Date.now() - tStart;
  console.log(`[recoverOrphanedFolders] done  ${ms}ms`);
}

module.exports = { parseArgs, classifyFolder, isCycleAnchor, groupCycles };

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('[recoverOrphanedFolders] failed', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
