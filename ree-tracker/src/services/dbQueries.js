// src/services/dbQueries.js
import { auth } from '../config/firebaseDb';
import { get, set } from 'idb-keyval';
import { fnv1a } from '../utils/contentHash';
import { getOfflineQuestions, writeOfflinePack, getOfflinePackMeta, OFFLINE_SUBJECTS, getReferenceCache, writeReferenceCache } from './offlinePack';

// ============================================================================
// API CORE: Circuit Breaker + Secure Fetch Wrapper
// ============================================================================
let _backendUp = true;
let _lastCheck = 0;
const COOLDOWN = 30_000;

// Build a stable idempotency key for a mutating request body. Same body =
// same key — with NO time component, so a retry minutes later still replays
// the server's cached response instead of double-writing. (The old key
// embedded the current minute, which made every >60s retry look like brand
// new data and inflated session tallies.) Falls back to a random UUID if the
// body isn't JSON-serializable.
const idempotencyKey = (method, body) => {
    if (method === 'GET' || !body) return null;
    try {
        return `c-${fnv1a(JSON.stringify(body))}`;
    } catch {
        return (crypto?.randomUUID?.() ?? String(Math.random())).slice(0, 32);
    }
};

// Hard request timeout. Without it a stalled backend leaves loading UIs
// hanging forever. 12s covers slow 3G round-trips; Render free-tier cold
// starts can exceed it, but the circuit breaker's 30s cooldown + the offline
// queue's retry absorb that — raise toward 25s if cold-start aborts show up
// in practice. Long-running endpoints (AI generation) pass their own
// `timeoutMs`; those aborts do NOT trip the circuit breaker.
const REQUEST_TIMEOUT_MS = 12_000;

export const apiRequest = async (endpoint, method = 'GET', body = null, { timeoutMs = REQUEST_TIMEOUT_MS } = {}) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Agent session disconnected. Authentication required.");

    if (!_backendUp && Date.now() - _lastCheck < COOLDOWN) {
        throw new Error('[OFFLINE]');
    }

    const token = await user.getIdToken();
    const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
    const idemKey = idempotencyKey(method, body);
    if (idemKey) headers['Idempotency-Key'] = idemKey;

    const controller = new AbortController();
    let didTimeout = false;
    const timeoutHandle = setTimeout(() => { didTimeout = true; controller.abort(); }, timeoutMs);
    const options = { method, headers, signal: controller.signal };

    if (body) options.body = JSON.stringify(body);

    let response;
    try {
        response = await fetch(url, options);
    } catch (networkErr) {
        // A timeout on a LONG-timeout call (AI generation) means "this request
        // was slow", not "the backend is down" — surface it without tripping
        // the circuit breaker, or one slow generation blocks every API call
        // for the next 30 seconds.
        if (didTimeout && timeoutMs > REQUEST_TIMEOUT_MS) {
            throw new Error('[TIMEOUT]');
        }
        // Only trip the circuit breaker on actual network-class failures (DNS,
        // connection refused, default-timeout abort, etc.) — never on HTTP
        // error responses, which we surface to the caller via the normal error
        // path below. Writes are retry-safe thanks to the idempotency key.
        _backendUp = false;
        _lastCheck = Date.now();
        throw new Error('[OFFLINE]');
    } finally {
        clearTimeout(timeoutHandle);
    }

    _backendUp = true;

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err = new Error(errorData.error || `Matrix API Exception: ${response.status}`);
        err.status = response.status;
        throw err;
    }

    if (response.status === 204) return null;
    return response.json();
};

const safeApiRequest = async (endpoint, method = 'GET', body = null, fallback = null) => {
    try {
        return await apiRequest(endpoint, method, body);
    } catch (err) {
        if (err.message === '[OFFLINE]' || err.message === '[TIMEOUT]') return fallback;
        throw err;
    }
};

// --- NORMALIZER: Translates PostgreSQL Schema to Legacy React Schema ---
const normalizeQuestions = (data) => {
    if (!data) return [];
    let items = Array.isArray(data) ? data : (data?.items || []);
    return items.map(q => ({
        ...q,
        question: q.text || q.questionText || q.question || '[Question Text Missing]',
        explanation: q.fixedExplanation || q.cachedExplanation || q.explanation || null,
        text: q.text || q.questionText || q.question || '[Question Text Missing]',
        answer: q.answer || q.correctAnswer || '',
        fixedExplanation: q.fixedExplanation || q.cachedExplanation || q.explanation || null
    }));
};

// ----------------------------------------------------------------------
// 1. Analytics Profile & Telemetry (RESTORED MISSING EXPORTS)
// ----------------------------------------------------------------------
export const getAnalyticsProfile = async (uid) => safeApiRequest(`/api/analytics/dashboard/${uid}`, 'GET', null, null);
export const updateCommandParameters = async (uid, params) => apiRequest('/api/user/settings', 'PUT', params);
export const logSRSRecord = async (uid, questionId, payload) => apiRequest('/api/srs/review', 'POST', { questionId, ...payload });
export const updateAnalyticsProfile = async (uid) => safeApiRequest(`/api/analytics/dashboard/${uid}`, 'GET', null, null);
// mode must be one of ACTIVE_REVIEW | BOARD_SIM | GAUNTLET | COMBAT | BATTLE
// — server uses it to break down dashboard analytics per surface.
const MODE_ALIAS = {
    mcq: 'ACTIVE_REVIEW',
    flashcard: 'ACTIVE_REVIEW',
    subject: 'BOARD_SIM',
    blended: 'BOARD_SIM',
    custom: 'BOARD_SIM',
    prc: 'BOARD_SIM',
    gauntlet: 'GAUNTLET',
    combat: 'COMBAT',
    battle: 'BATTLE',
};
const canonicalMode = (m) => {
    if (!m) return 'LEGACY';
    const upper = String(m).toUpperCase();
    if (['ACTIVE_REVIEW', 'BOARD_SIM', 'GAUNTLET', 'COMBAT', 'BATTLE', 'LEGACY'].includes(upper)) return upper;
    return MODE_ALIAS[String(m).toLowerCase()] || 'LEGACY';
};
export const syncTelemetryBatch = async (uid, sessionId, targetSubject, mode, attempts) => {
    return await apiRequest('/api/analytics/telemetry-bulk', 'POST', {
        sessionId,
        targetSubject,
        mode: canonicalMode(mode),
        attempts,
    });
};
export const purgeUserAnalytics = async (uid) => apiRequest('/api/analytics/purge', 'DELETE');

// ----------------------------------------------------------------------
// 2. Question Bank & Review Queue
// ----------------------------------------------------------------------
export const saveQuestionToBank = async (questionObject) => {
    const result = await apiRequest('/api/questions', 'POST', questionObject);
    return result.id;
};
export const fetchQuarantineQueue = async () => normalizeQuestions(await apiRequest('/api/questions/quarantine'));
export const approveQuarantinedQuestion = async (id, subject, subtopic) => apiRequest(`/api/questions/quarantine/${id}/approve`, 'PUT', { subject, subtopic });
export const fetchServerStats = async () => safeApiRequest('/api/questions/stats', 'GET', null, null);

// `cursor` is an integer offset (or null for the first page). `sort` is one of
// 'recent' | 'oldest' | 'random'; the admin vault list defaults to 'recent' so
// newly ingested questions surface first, with `nextOffset` driving Load More.
export const fetchPaginatedQuestions = async (cursor = null, filterSubject = 'All', filterSubtopic = 'All', limitCount = 50, sort = 'recent') => {
    const offset = typeof cursor === 'number' ? cursor : 0;
    const queryParams = new URLSearchParams({ subject: filterSubject, subtopic: filterSubtopic, limit: limitCount, sort, offset });
    const data = await apiRequest(`/api/questions?${queryParams.toString()}`);
    return { items: normalizeQuestions(data), nextOffset: data?.nextOffset ?? null };
};

// Sessions want variety, so this defaults to the server's stratified-random
// order. Callers can request 'recent'/'oldest' for deterministic pulls.
//
// OFFLINE FALLBACK: when the backend is unreachable ([OFFLINE]) we serve from the
// on-device pack instead of throwing, so Active Review and the Board Simulator
// keep working without a connection. Every caller of this function (review setup,
// simulator pool builder, offline-PDF export) inherits offline support for free.
export const fetchVaultQuestions = async (subject, subtopic, limit = 50, sort = 'random') => {
    const queryParams = new URLSearchParams({ subject, subtopic, limit, sort });
    try {
        const data = await apiRequest(`/api/questions?${queryParams.toString()}`);
        return normalizeQuestions(data);
    } catch (err) {
        if (err.message === '[OFFLINE]') {
            const cached = await getOfflineQuestions(subject, subtopic, limit);
            if (cached.length > 0) return cached;
        }
        throw err;
    }
};

// ---- OFFLINE PACK BUILDERS ------------------------------------------------
// Snapshot a bounded, stratified slice of each subject (with answers +
// explanations) into IndexedDB for offline sessions. Called on app load when
// online (see useOfflinePack) and on manual "Download".
export const refreshOfflinePack = async ({ perSubject = 400 } = {}) => {
    if (!navigator.onLine) return getOfflinePackMeta();
    const subjects = {};
    let fetched = 0;
    for (const subj of OFFLINE_SUBJECTS) {
        try {
            const qp = new URLSearchParams({ subject: subj, subtopic: 'All', limit: perSubject, sort: 'random' });
            const data = await apiRequest(`/api/questions?${qp.toString()}`);
            subjects[subj] = normalizeQuestions(data);
            fetched += subjects[subj].length;
        } catch {
            // Preserve whatever we already cached for this subject on failure.
            subjects[subj] = await getOfflineQuestions(subj, 'All', perSubject);
        }
    }
    // Don't overwrite a good pack with an all-empty one (e.g. auth token not
    // ready, or every request failed) — that would suppress auto-retry for a day.
    if (fetched === 0) return getOfflinePackMeta();

    await writeOfflinePack({ version: 1, fetchedAt: Date.now(), subjects });
    return getOfflinePackMeta();
};

// Build the pack only when it's missing or stale — cheap no-op otherwise.
export const ensureOfflinePack = async () => {
    if (!navigator.onLine) return getOfflinePackMeta();
    const meta = await getOfflinePackMeta();
    if (!meta.exists || meta.stale) return refreshOfflinePack();
    return meta;
};

export const fetchFlaggedQuestions = async (filterSubject = 'All', filterSubtopic = 'All') => {
    const queryParams = new URLSearchParams({ subject: filterSubject, subtopic: filterSubtopic });
    const data = await apiRequest(`/api/questions/flagged?${queryParams.toString()}`);
    return normalizeQuestions(data);
};

export const deleteQuestionFromBank = async (id) => apiRequest(`/api/questions/${id}`, 'DELETE');

export const updateQuestionInBank = async (id, questionObject) => {
    if (questionObject.isFlagged) return await apiRequest(`/api/questions/${id}/flag`, 'PATCH');
    return await apiRequest(`/api/questions/${id}`, 'PUT', questionObject);
};

export const updateQuestionCache = async (id, explanation) => {
    return await apiRequest(`/api/questions/${id}/cache`, 'PUT', { cachedExplanation: explanation });
};

export const fetchReviewQuestions = async (mode, subject, subtopic, blindSpots) => {
    const data = await apiRequest('/api/questions/review', 'POST', { mode, subject, subtopic, blindSpots, limit: 20 });
    return normalizeQuestions(data);
};

export const initializeReviewSession = async (config) => {
    const data = await apiRequest('/api/questions/review', 'POST', { 
        subject: config.subject, 
        limit: config.count || 20 
    });
    return normalizeQuestions(data);
};

// ----------------------------------------------------------------------
// 3. Metadata Handlers
// ----------------------------------------------------------------------
export const fetchVaultMetadata = async () => safeApiRequest('/api/metadata/vault', 'GET', null, null);
export const resyncVaultMetadata = async () => apiRequest('/api/metadata/vault/resync', 'POST');
export const resyncVault = async () => apiRequest('/api/metadata/vault/resync', 'POST'); 

// ----------------------------------------------------------------------
// 4. The Social Matrix (Leaderboards)
// ----------------------------------------------------------------------
export const syncLeaderboardProfile = async (uid) => apiRequest(`/api/analytics/dashboard/${uid}`);

// Normalizes any agent row to the shape the UI expects: { uid, displayName, thetaRating, streak, ... }
const normalizeAgent = (a) => ({
    uid: a.uid || a.id,
    displayName: a.displayName || `Agent-${(a.uid || a.id || '').slice(0, 6)}`,
    role: a.role || 'USER',
    thetaRating: typeof a.thetaRating === 'number' ? a.thetaRating : 0,
    streak: typeof a.streak === 'number' ? a.streak : (a.globalStreak || 0),
    globalStreak: a.globalStreak || a.streak || 0,
    gauntletLevel: a.gauntletLevel || 1,
    lastActive: a.lastActive || null,
});

export const fetchGlobalLeaderboard = async (limitCount = 100) => {
    const data = await safeApiRequest(`/api/leaderboard?limit=${limitCount}`, 'GET', null, null);
    if (!data) return [];
    const raw = data?.leaderboard || data?.items || data || [];
    return Array.isArray(raw) ? raw.map(normalizeAgent) : [];
};

export const fetchPaginatedLeaderboard = async (limitCount = 20, cursor = null) => {
    const qs = new URLSearchParams({ limit: String(limitCount) });
    if (cursor) qs.set('cursor', cursor);
    const data = await safeApiRequest(`/api/leaderboard/paginated?${qs}`, 'GET', null, null);
    if (!data) return { agents: [], lastDoc: null };
    const items = (data?.items || []).map(normalizeAgent);
    return { agents: items, lastDoc: data?.nextCursor || null };
};

export const fetchLeaderboardMe = async () =>
    safeApiRequest('/api/leaderboard/me', 'GET', null, { rank: null, total: 0 });

export const updateUserProfile = async (payload) => apiRequest('/api/user/profile', 'PUT', payload);

// ----------------------------------------------------------------------
// 5. Multiplayer Mock Battles
// ----------------------------------------------------------------------
// The client sends only a pool SPEC (mode/subject/count) — the server samples
// the questions itself so answer keys never reach a battle client. Battle id
// must be exactly 6 uppercase alphanumerics (the join form + backend schema
// both enforce it), so pad the rare short base36 roll.
export const createMultiplayerBattle = async (config, timeLimitSecs) => {
    const battleId = (Math.random().toString(36).substring(2, 8) + 'XXXXXX').substring(0, 6).toUpperCase();
    await apiRequest('/api/battles', 'POST', { battleId, config, timeLimitSecs });
    return battleId;
};
export const fetchMultiplayerBattle = async (battleId) => apiRequest(`/api/battles/${battleId}`);

// ----------------------------------------------------------------------
// 6. System Configuration & Bookmarks
// ----------------------------------------------------------------------
export const fetchDynamicTOS = async () => {
    try { return await apiRequest('/api/config/tos'); } catch (e) { return null; }
};
export const updateDynamicTOS = async (newTOS) => apiRequest('/api/config/tos', 'PUT', newTOS);
export const saveBookmark = async (uid, itemData) => apiRequest('/api/bookmarks', 'POST', itemData);
export const removeBookmark = async (uid, itemId) => apiRequest(`/api/bookmarks/${itemId}`, 'DELETE');
export const fetchBookmarks = async () => {
    const data = await safeApiRequest('/api/bookmarks', 'GET', null, null);
    return normalizeQuestions(data);
};
export const updateBookmarkCache = async (uid, itemId, aiExplanation) => {
    return await apiRequest(`/api/bookmarks/${itemId}/cache`, 'PUT', { cachedAiExplanation: aiExplanation });
};

// ----------------------------------------------------------------------
// 7. Study Materials & Files
// ----------------------------------------------------------------------
export const uploadMaterial = async (file, folderId, subject) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Authentication required.");
    const token = await user.getIdToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId || '');
    formData.append('subject', subject || 'General');
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/materials/upload`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
    });
    if (!response.ok) throw new Error("Upload failed.");
    return response.json();
};

export const fetchMaterials = async (folderId = null) => {
    const url = folderId ? `/api/materials?folderId=${folderId}` : '/api/materials';
    return await apiRequest(url);
};

export const createFolder = async (name, parentId = null) => apiRequest('/api/materials/folders', 'POST', { name, parentId });
export const deleteMaterial = async (id) => apiRequest(`/api/materials/${id}`, 'DELETE');
export const deleteFolder = async (id) => apiRequest(`/api/materials/folders/${id}`, 'DELETE');

// ----------------------------------------------------------------------
// 8. High-Speed Local Simulation Ledger (IndexedDB)
// ----------------------------------------------------------------------
export const saveSimulationRecord = async (record) => {
    try {
        const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        const newRecord = { ...record, id };
        
        const existing = await get('ree_simulation_ledger') || [];
        existing.push(newRecord);
        await set('ree_simulation_ledger', existing);
        
        return { success: true, id };
    } catch (error) {
        console.error("Ledger save failed:", error);
        throw error;
    }
};

export const fetchSimulationLedger = async (uid, limitParam = 20) => {
    try {
        const existing = await get('ree_simulation_ledger') || [];
        return existing.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limitParam);
    } catch (error) {
        console.error("Ledger fetch failed:", error);
        return [];
    }
};

export const deleteSimulationRecord = async (uid, recordId) => {
    try {
        let existing = await get('ree_simulation_ledger') || [];
        existing = existing.filter(r => r.id !== recordId);
        await set('ree_simulation_ledger', existing);
        return { success: true };
    } catch (error) {
        throw new Error("Failed to delete record.");
    }
};

export const fetchSmartDrillQuestions = async (limit = 20) => {
    const data = await apiRequest(`/api/smart-drill?limit=${limit}`);
    return { items: normalizeQuestions(data), weakAreas: data?.weakAreas || [] };
};

export const fetchReadinessScore = async () => safeApiRequest('/api/readiness', 'GET', null, null);
export const fetchReadinessHistory = async () => safeApiRequest('/api/readiness/history', 'GET', null, null);
export const saveReadinessSnapshot = async (data) => apiRequest('/api/readiness/snapshot', 'POST', data);

// Adaptive engine — pass/topnotcher forecast + prescription panel data.
export const fetchForecast = async () => safeApiRequest('/api/forecast', 'GET', null, null);
export const recomputeForecast = async () => apiRequest('/api/forecast/recompute', 'POST', {});

// CAT — server-side next-item selection. `body` lets the caller include the
// in-session attempts so the picker can refine theta before choosing.
export const fetchNextCatItem = async (body) => apiRequest('/api/exams/next-item', 'POST', body || {});

export const fetchAnalyticsDeep = async (type) => safeApiRequest(`/api/analytics/deep/${type}`, 'GET', null, null);

export const fetchPendingExplanations = async () => safeApiRequest('/api/questions/explanations/pending', 'GET', null, null);
export const updateExplanationStatus = async (questionId, status) => apiRequest(`/api/questions/${questionId}/explanation-status`, 'PUT', { status });

export const generateStudyPlan = async (examDate, topics) => apiRequest('/api/user/tasks/generate-plan', 'POST', { examDate, topics });
export const clearStudyPlan = async () => apiRequest('/api/user/tasks/clear-plan', 'DELETE');

// ----------------------------------------------------------------------
// 9. Modular Reference Library (Constants & Formulas)
// GET is cached to IndexedDB so admin-added items still render offline;
// writes are admin-only (enforced server-side).
// ----------------------------------------------------------------------
export const fetchConstants = async () => {
    try {
        const data = await apiRequest('/api/reference/constants');
        const items = data?.items || [];
        await writeReferenceCache({ constants: items });
        return items;
    } catch (err) {
        if (err.message === '[OFFLINE]') return (await getReferenceCache()).constants || [];
        throw err;
    }
};
export const fetchFormulas = async () => {
    try {
        const data = await apiRequest('/api/reference/formulas');
        const items = data?.items || [];
        await writeReferenceCache({ formulas: items });
        return items;
    } catch (err) {
        if (err.message === '[OFFLINE]') return (await getReferenceCache()).formulas || [];
        throw err;
    }
};
export const createConstant = (body) => apiRequest('/api/reference/constants', 'POST', body);
export const updateConstant = (id, body) => apiRequest(`/api/reference/constants/${id}`, 'PUT', body);
export const deleteConstant = (id) => apiRequest(`/api/reference/constants/${id}`, 'DELETE');
export const createFormula = (body) => apiRequest('/api/reference/formulas', 'POST', body);
export const updateFormula = (id, body) => apiRequest(`/api/reference/formulas/${id}`, 'PUT', body);
export const deleteFormula = (id) => apiRequest(`/api/reference/formulas/${id}`, 'DELETE');
export const importReferenceLibrary = (payload) => apiRequest('/api/reference/import', 'POST', payload);