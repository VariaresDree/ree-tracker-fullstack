// src/services/offlinePack.js
// Bounded, on-device snapshot of the question bank so Active Review sessions and
// full mock exams can run with no connection. Stored in IndexedDB via idb-keyval
// (the same store Zustand persists to). The snapshot holds full question objects
// — including `answer` and `fixedExplanation` — because grading and the "matrix
// solution" panel are entirely client-side, so nothing extra is needed offline.
//
// The pack is built/refreshed while online (see refreshOfflinePack in dbQueries)
// and read back through the fetchVaultQuestions offline fallback, so callers
// can't tell whether questions came from the network or the cache.
import { get, set, del } from 'idb-keyval';

const PACK_KEY = 'ree_offline_pack_v1';
export const OFFLINE_SUBJECTS = ['Mathematics', 'ESAS', 'EE'];
export const PACK_TTL_MS = 24 * 60 * 60 * 1000; // refresh at most ~daily

const SUBJECT_CANONICAL = {
    math: 'Mathematics',
    mathematics: 'Mathematics',
    esas: 'ESAS',
    'engineering sciences and allied subjects': 'ESAS',
    ee: 'EE',
    'electrical engineering': 'EE',
    'electrical engineering professional subjects': 'EE',
};

export const canonicalSubject = (s) => {
    if (!s) return s;
    return SUBJECT_CANONICAL[String(s).trim().toLowerCase()] || s;
};

export const getOfflinePack = async () => {
    try { return (await get(PACK_KEY)) || null; } catch { return null; }
};

export const writeOfflinePack = async (pack) => {
    await set(PACK_KEY, pack);
    return pack;
};

export const clearOfflinePack = async () => {
    try { await del(PACK_KEY); } catch { /* noop */ }
};

// Pure, storage-free selector — extracted so it can be unit-tested without
// IndexedDB. Filters a pack by subject (+ optional subtopic) and caps the count.
export const selectFromPack = (pack, subject, subtopic = 'All', limit = 1000) => {
    if (!pack?.subjects) return [];
    let list;
    if (!subject || subject === 'All') {
        list = OFFLINE_SUBJECTS.flatMap((s) => pack.subjects[s] || []);
    } else {
        list = pack.subjects[canonicalSubject(subject)] || [];
    }
    if (subtopic && subtopic !== 'All') {
        const t = String(subtopic).trim().toLowerCase();
        list = list.filter((q) => String(q.subtopic || '').trim().toLowerCase() === t);
    }
    return list.slice(0, limit);
};

// Read a subject/subtopic slice from the cached pack. Returns the same shape
// fetchVaultQuestions returns online (array of full question objects).
export const getOfflineQuestions = async (subject, subtopic = 'All', limit = 1000) => {
    const pack = await getOfflinePack();
    return selectFromPack(pack, subject, subtopic, limit);
};

export const getOfflinePackMeta = async () => {
    const pack = await getOfflinePack();
    if (!pack?.subjects) {
        return { exists: false, fetchedAt: null, counts: {}, total: 0, stale: true };
    }
    const counts = {};
    let total = 0;
    for (const subj of OFFLINE_SUBJECTS) {
        const n = Array.isArray(pack.subjects[subj]) ? pack.subjects[subj].length : 0;
        counts[subj] = n;
        total += n;
    }
    const stale = !pack.fetchedAt || (Date.now() - pack.fetchedAt) > PACK_TTL_MS;
    return { exists: total > 0, fetchedAt: pack.fetchedAt || null, counts, total, stale };
};

export const isOfflinePackStale = async () => (await getOfflinePackMeta()).stale;

// ---- REFERENCE LIBRARY CACHE ----------------------------------------------
// Admin-managed constants/formulas mirrored to IndexedDB so DB additions still
// render in the Materials Hub when offline (bundled seed already ships in the JS
// bundle; this covers the delta). Written partially — constants and formulas are
// fetched/cached independently — hence the shallow merge.
const REFERENCE_KEY = 'ree_reference_cache_v1';

export const getReferenceCache = async () => {
    try { return (await get(REFERENCE_KEY)) || {}; } catch { return {}; }
};

export const writeReferenceCache = async (partial) => {
    const existing = await getReferenceCache();
    const merged = { ...existing, ...partial, fetchedAt: Date.now() };
    await set(REFERENCE_KEY, merged);
    return merged;
};
