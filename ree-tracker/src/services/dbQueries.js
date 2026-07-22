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

// Firebase's token refresh throws a RAW "Firebase: Error
// (auth/network-request-failed)" when the cached ID token has expired and the
// device is offline. That message isn't the '[OFFLINE]' sentinel, so the
// offline-pack fallback and outbox deferral never engaged and users saw the
// Firebase error toasted mid-review. Classify + normalize it here.
export const isNetworkAuthError = (err) => {
    const code = err?.code || '';
    const msg = err?.message || '';
    return code === 'auth/network-request-failed' || msg.includes('network-request-failed');
};

export const getAuthToken = async (user) => {
    try {
        return await user.getIdToken();
    } catch (err) {
        if (isNetworkAuthError(err)) throw new Error('[OFFLINE]');
        throw err;
    }
};

export const apiRequest = async (endpoint, method = 'GET', body = null, { timeoutMs = REQUEST_TIMEOUT_MS } = {}) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Agent session disconnected. Authentication required.");

    // Known-offline: fail fast with the sentinel every offline consumer
    // (pack fallback, outbox) understands — before auth can throw raw.
    if (!navigator.onLine) throw new Error('[OFFLINE]');

    if (!_backendUp && Date.now() - _lastCheck < COOLDOWN) {
        throw new Error('[OFFLINE]');
    }

    const token = await getAuthToken(user);
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

// PRC board TOS blend, read from the server config table so the exam builder and
// the server sampler agree. Never throws — falls back to the default blend.
export const SYLLABUS_WEIGHTS_FALLBACK = { Mathematics: 0.25, ESAS: 0.30, EE: 0.45 };
export const fetchSyllabusWeights = async () => {
    try {
        const r = await apiRequest('/api/config/syllabus-weights');
        return r?.weights || SYLLABUS_WEIGHTS_FALLBACK;
    } catch {
        return SYLLABUS_WEIGHTS_FALLBACK;
    }
};
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

// AI review loop (Phase 3.6). New AI/vision submissions live in the
// pending-review table until an admin approves/edits/rejects them here; the
// queue also carries legacy isFlagged questions (item.legacy === true), which
// keep using the quarantine endpoints above.
export const fetchReviewQueue = async () => {
    const data = await apiRequest('/api/review/queue');
    return Array.isArray(data?.items) ? data.items : [];
};
export const updateReviewItem = async (id, fields) => apiRequest(`/api/review/${id}`, 'PUT', fields);
// `edits` (optional) ride along so a fixed answer/text applies at promotion.
export const approveReviewItem = async (id, edits = {}) => apiRequest(`/api/review/${id}/approve`, 'PUT', edits);
export const rejectReviewItem = async (id, reviewNote) => apiRequest(`/api/review/${id}/reject`, 'PUT', reviewNote ? { reviewNote } : {});
// "Accept All": ONE batched request (never a client loop). Server approves only
// clean PENDING items and returns per-item outcomes so the UI can reconcile:
// { approved: [id], failed: [{ id, reason }] }.
export const bulkApproveReviewItems = async (ids) => apiRequest('/api/review/approve-bulk', 'POST', { ids });
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

    const existing = (await getOfflinePack()) || {};
    const existingSubjects = existing.subjects || {};
    const existingChecksums = existing.checksums || {};

    // Cheap manifest → per-subject content checksums, so we re-download ONLY the
    // subjects whose questions actually changed (delta), not the whole bank. If
    // the manifest is unavailable we fall back to a full refresh.
    let manifest = null;
    try {
        const m = await apiRequest('/api/questions/pack-manifest');
        manifest = m?.subjects || null;
    } catch { /* no manifest → full refresh below */ }

    const subjects = { ...existingSubjects };
    const checksums = { ...existingChecksums };

    // Fetch subjects in parallel; each mapper catches its own failure so
    // Promise.all won't reject, and unchanged subjects are skipped entirely.
    await Promise.all(OFFLINE_SUBJECTS.map(async (subj) => {
        const serverSum = manifest?.[subj]?.checksum;
        const haveCached = Array.isArray(existingSubjects[subj]) && existingSubjects[subj].length > 0;
        // Delta: a subject whose server checksum matches what we already cached
        // is up to date — skip the download.
        if (serverSum && haveCached && existingChecksums[subj] === serverSum) return;
        try {
            const qp = new URLSearchParams({ subject: subj, subtopic: 'All', limit: perSubject, sort: 'random' });
            const data = await apiRequest(`/api/questions?${qp.toString()}`);
            subjects[subj] = normalizeQuestions(data);
            // Store the SERVER checksum so the next refresh can compare. null when
            // no manifest was available → forces a re-check next time (safe).
            checksums[subj] = serverSum || null;
        } catch {
            // Preserve whatever we already cached for this subject on failure.
            subjects[subj] = existingSubjects[subj] || [];
        }
    }));

    // Don't overwrite a good pack with an all-empty one (e.g. auth token not
    // ready, or every request failed) — that would suppress auto-retry for a day.
    const total = OFFLINE_SUBJECTS.reduce((n, s) => n + (subjects[s]?.length || 0), 0);
    if (total === 0) return getOfflinePackMeta();

    await writeOfflinePack({
        version: (existing.version || 0) + 1, // monotonic, so a change is observable
        fetchedAt: Date.now(),
        subjects,
        checksums,
    });
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
    // Ranking stats (Arena). Whitelisted here or they're dropped before the UI.
    activeDays: typeof a.activeDays === 'number' ? a.activeDays : 0,
    questionsAnswered: typeof a.questionsAnswered === 'number' ? a.questionsAnswered : 0,
    accuracy: typeof a.accuracy === 'number' ? a.accuracy : 0,
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
// Feature flags (Phase 4.1): { [key]: { enabled, payload } }. Null on failure —
// callers keep whatever cached flags the store already holds (flags default off).
export const fetchFeatureFlags = async () => {
    try {
        const res = await apiRequest('/api/config/flags');
        return res?.flags ?? null;
    } catch (e) { return null; }
};
export const updateDynamicTOS = async (newTOS) => apiRequest('/api/config/tos', 'PUT', newTOS);
// FCM device tokens (Phase 4.2) — registered by the Capacitor native app only.
export const registerDeviceToken = async (token, platform) => apiRequest('/api/user/device-token', 'POST', { token, platform });
export const unregisterDeviceToken = async (token) => apiRequest('/api/user/device-token', 'DELETE', { token });
export const saveBookmark = async (uid, itemData) => apiRequest('/api/bookmarks', 'POST', itemData);
export const removeBookmark = async (uid, itemId) => apiRequest(`/api/bookmarks/${itemId}`, 'DELETE');
export const fetchBookmarks = async () => {
    const data = await safeApiRequest('/api/bookmarks', 'GET', null, null);
    return normalizeQuestions(data);
};
// (updateBookmarkCache removed — it targeted a /api/bookmarks/:id/cache route
// that never existed; vault explanations persist via updateQuestionCache.)

// ----------------------------------------------------------------------
// 7. Study Materials & Files
// ----------------------------------------------------------------------
export const uploadMaterial = async (file, folderId, subject) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Authentication required.");
    const token = await getAuthToken(user);
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
// Persist an already-hosted material (e.g. a Firebase Storage downloadURL) via
// the JSON `url` branch of POST /upload — NOT the multipart `uploadMaterial`
// helper above, which the express.json() route would reject.
export const commitMaterialLink = async ({ folderId = null, name, type, url, storagePath = null }) =>
    apiRequest('/api/materials/upload', 'POST', { folderId, name, type, url, storagePath });
export const updateMaterial = async (id, data) => apiRequest(`/api/materials/${id}`, 'PATCH', data);
export const updateFolder = async (id, data) => apiRequest(`/api/materials/folders/${id}`, 'PATCH', data);

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
// Batched "Accept All" over the pending explanations page; server touches only
// still-PENDING rows and audit-logs each approval. { approved, failed } shape.
export const bulkApproveExplanations = async (ids) => apiRequest('/api/questions/explanations/approve-bulk', 'POST', { ids });

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