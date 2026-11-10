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
// What the badge and Storage need to know about the pack, kept beside it: the
// pack is one entry of up to 6,000 questions (8.8 MB), and every read of it
// loads all of them. The badges read this on each mount.
const META_KEY = 'ree_offline_pack_meta_v1';
export const OFFLINE_SUBJECTS = ['Mathematics', 'ESAS', 'EE'];
export const PACK_TTL_MS = 24 * 60 * 60 * 1000; // refresh at most ~daily

// Questions per subject. Large stops at what the server gives in one request.
// Not the whole bank: the pack is one blob read into memory whole.
export const PACK_SIZES = { standard: 400, large: 2000 };
const PACK_SIZE_KEY = 'ree:offline-pack-size';
export const getPackSizeName = () => {
    try { return localStorage.getItem(PACK_SIZE_KEY) === 'large' ? 'large' : 'standard'; } catch { return 'standard'; }
};
export const savePackSizeName = (name) => {
    try { localStorage.setItem(PACK_SIZE_KEY, name); } catch { /* stays Standard */ }
};
export const getPackSize = () => PACK_SIZES[getPackSizeName()];
// A pack from before there was a choice was Standard.
export const packSizeOf = (pack) => pack?.perSubject ?? PACK_SIZES.standard;

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

// Counts, time and size, from the pack in hand.
const summarize = (pack) => {
    const counts = {};
    let total = 0;
    for (const subj of OFFLINE_SUBJECTS) {
        const n = Array.isArray(pack?.subjects?.[subj]) ? pack.subjects[subj].length : 0;
        counts[subj] = n;
        total += n;
    }
    return { fetchedAt: pack?.fetchedAt || null, counts, total, perSubject: packSizeOf(pack), bytes: new Blob([JSON.stringify(pack)]).size };
};

export const writeOfflinePack = async (pack) => {
    await set(PACK_KEY, pack);
    try { await set(META_KEY, summarize(pack)); } catch { /* the next read rebuilds it from the pack */ }
    return pack;
};

// The summary, without reading the pack. A pack saved before there was one
// is read once, and its summary kept.
const readSummary = async () => {
    try {
        const kept = await get(META_KEY);
        if (kept && typeof kept.total === 'number' && kept.counts) return kept;
    } catch { /* read the pack instead */ }
    const pack = await getOfflinePack();
    if (!pack?.subjects) return null;
    const made = summarize(pack);
    try { await set(META_KEY, made); } catch { /* read the pack again next time */ }
    return made;
};

// Pure, storage-free selector — extracted so it can be unit-tested without
// IndexedDB. Filters a pack by subject (+ optional subtopic) and caps the count.
export const selectFromPack = (pack, subject, subtopic = 'All', limit = 1000) => {
    if (!pack?.subjects) return [];
    const t = subtopic && subtopic !== 'All' ? String(subtopic).trim().toLowerCase() : null;
    const inTopic = (list) => (t ? list.filter((q) => String(q.subtopic || '').trim().toLowerCase() === t) : list);
    if (!subject || subject === 'All') {
        // An even share of each, or a limit under one subject's count would be
        // all Mathematics, the first in the pack.
        const share = Math.ceil(limit / OFFLINE_SUBJECTS.length);
        return OFFLINE_SUBJECTS.flatMap((s) => inTopic(pack.subjects[s] || []).slice(0, share)).slice(0, limit);
    }
    return inTopic(pack.subjects[canonicalSubject(subject)] || []).slice(0, limit);
};

// Read a subject/subtopic slice from the cached pack. Returns the same shape
// fetchVaultQuestions returns online (array of full question objects).
export const getOfflineQuestions = async (subject, subtopic = 'All', limit = 1000) => {
    const pack = await getOfflinePack();
    return selectFromPack(pack, subject, subtopic, limit);
};

export const getOfflinePackMeta = async () => {
    const s = await readSummary();
    if (!s) return { exists: false, fetchedAt: null, counts: {}, total: 0, stale: true, bytes: 0 };
    const stale = !s.fetchedAt || (Date.now() - s.fetchedAt) > PACK_TTL_MS || s.perSubject !== getPackSize();
    return { exists: s.total > 0, fetchedAt: s.fetchedAt, counts: s.counts, total: s.total, stale, perSubject: s.perSubject, bytes: s.bytes || 0 };
};

// ---- REFERENCE CARDS CACHE ------------------------------------------------
// LIVE reference flashcards mirrored to IndexedDB so the vault still renders
// offline after a first online fetch. (The old bundled-seed + split
// constants/formulas cache is retired — the flashcard vault is DB-only.)
const REFERENCE_CARDS_KEY = 'ree_reference_cards_v1';
const LEGACY_REFERENCE_KEY = 'ree_reference_cache_v1';

export const getReferenceCardsCache = async () => {
    try { return (await get(REFERENCE_CARDS_KEY)) || null; } catch { return null; }
};

export const writeReferenceCardsCache = async (items) => {
    const payload = { items: Array.isArray(items) ? items : [], fetchedAt: Date.now() };
    await set(REFERENCE_CARDS_KEY, payload);
    // One-time cleanup of the retired legacy cache key (best-effort).
    del(LEGACY_REFERENCE_KEY).catch(() => {});
    return payload;
};
