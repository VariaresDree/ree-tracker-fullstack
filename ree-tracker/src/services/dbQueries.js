// src/services/dbQueries.js
import { auth } from '../config/firebaseDb';
import { get, set } from 'idb-keyval';

// ============================================================================
// API CORE: Circuit Breaker + Secure Fetch Wrapper
// ============================================================================
let _backendUp = true;
let _lastCheck = 0;
const COOLDOWN = 30_000;

export const apiRequest = async (endpoint, method = 'GET', body = null) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Agent session disconnected. Authentication required.");

    if (!_backendUp && Date.now() - _lastCheck < COOLDOWN) {
        throw new Error('[OFFLINE]');
    }

    const token = await user.getIdToken();
    const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${endpoint}`;

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (body) options.body = JSON.stringify(body);

    let response;
    try {
        response = await fetch(url, options);
    } catch {
        _backendUp = false;
        _lastCheck = Date.now();
        throw new Error('[OFFLINE]');
    }

    _backendUp = true;

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Matrix API Exception: ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
};

const safeApiRequest = async (endpoint, method = 'GET', body = null, fallback = null) => {
    try {
        return await apiRequest(endpoint, method, body);
    } catch (err) {
        if (err.message === '[OFFLINE]') return fallback;
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
export const syncTelemetryBatch = async (uid, sessionId, targetSubject, mode, attempts) => {
    return await apiRequest('/api/analytics/telemetry-bulk', 'POST', { sessionId, targetSubject, mode, attempts });
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

export const fetchPaginatedQuestions = async (lastVisibleDoc = null, filterSubject = 'All', filterSubtopic = 'All', limitCount = 50) => {
    const queryParams = new URLSearchParams({ subject: filterSubject, subtopic: filterSubtopic, limit: limitCount });
    const data = await apiRequest(`/api/questions?${queryParams.toString()}`);
    return { items: normalizeQuestions(data) };
};

export const fetchVaultQuestions = async (subject, subtopic, limit = 50) => {
    const queryParams = new URLSearchParams({ subject, subtopic, limit });
    const data = await apiRequest(`/api/questions?${queryParams.toString()}`);
    return normalizeQuestions(data);
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
export const fetchGlobalLeaderboard = async (limitCount = 100) => {
    const data = await safeApiRequest(`/api/leaderboard?limit=${limitCount}`, 'GET', null, null);
    if (!data) return [];
    return data?.leaderboard || data?.items || data || [];
};
export const fetchPaginatedLeaderboard = async (limitCount = 20, lastVisible = null) => {
    const data = await safeApiRequest(`/api/leaderboard/paginated?limit=${limitCount}`, 'GET', null, null);
    if (!data) return [];
    return data?.items || data || [];
};

// ----------------------------------------------------------------------
// 5. Multiplayer Mock Battles
// ----------------------------------------------------------------------
export const createMultiplayerBattle = async (hostId, config, questions, timeLimitSecs) => {
    const battleId = Math.random().toString(36).substring(2, 8).toUpperCase();
    await apiRequest('/api/battles', 'POST', { battleId, hostId, config, questions, timeLimitSecs });
    return battleId;
};
export const fetchMultiplayerBattle = async (battleId) => apiRequest(`/api/battles/${battleId}`);
export const submitBattleScore = async (battleId, user, score, totalQs, timeTakenSecs) => {
    return await apiRequest(`/api/battles/${battleId}/submit`, 'POST', { score, total: totalQs, timeTakenSecs });
};
export const syncLiveBattleProgress = async (battleId, user, currentScore, itemsAnswered) => {
    return await apiRequest(`/api/battles/${battleId}/progress`, 'PUT', { liveScore: currentScore, itemsAnswered });
};

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

export const fetchAnalyticsDeep = async (type) => safeApiRequest(`/api/analytics/deep/${type}`, 'GET', null, null);

export const fetchPendingExplanations = async () => safeApiRequest('/api/questions/explanations/pending', 'GET', null, null);
export const updateExplanationStatus = async (questionId, status) => apiRequest(`/api/questions/${questionId}/explanation-status`, 'PUT', { status });

export const generateStudyPlan = async (examDate, topics) => apiRequest('/api/user/tasks/generate-plan', 'POST', { examDate, topics });
export const clearStudyPlan = async () => apiRequest('/api/user/tasks/clear-plan', 'DELETE');