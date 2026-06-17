// src/services/dbQueries.js
import { auth } from '../config/firebaseDb';

// ============================================================================
// API CORE: Secure Fetch Wrapper
// ============================================================================
export const apiRequest = async (endpoint, method = 'GET', body = null) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Agent session disconnected. Authentication required.");
    
    // 🚨 ROOT CAUSE FIX: Passing 'true' forces Firebase to refresh expired tokens!
    const token = await user.getIdToken(true); 
    const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${endpoint}`;
    
    const options = {
        method,
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        }
    };
    
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Matrix API Exception: ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
};

// --- NORMALIZER: Translates PostgreSQL Schema to Legacy React Schema ---
const normalizeQuestions = (data) => {
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
// 1. Analytics Profile & Telemetry
// ----------------------------------------------------------------------
export const getAnalyticsProfile = async (uid) => apiRequest(`/api/analytics/dashboard/${uid}`);
export const updateCommandParameters = async (uid, params) => apiRequest('/api/user/settings', 'PUT', params);
export const logSRSRecord = async (uid, questionId, payload) => apiRequest(`/api/user/srs/${questionId}`, 'POST', payload);
export const updateAnalyticsProfile = async () => true; 

// ----------------------------------------------------------------------
// 2. Question Bank & Review Queue
// ----------------------------------------------------------------------
export const saveQuestionToBank = async (questionObject) => {
    const result = await apiRequest('/api/questions', 'POST', questionObject);
    return result.id;
};

export const fetchQuarantineQueue = async () => {
    const data = await apiRequest('/api/questions/quarantine');
    return normalizeQuestions(data);
};

export const approveQuarantinedQuestion = async (id, subject, subtopic) => apiRequest(`/api/questions/quarantine/${id}/approve`, 'PUT', { subject, subtopic });
export const fetchServerStats = async () => apiRequest('/api/questions/stats');

export const fetchPaginatedQuestions = async (lastVisibleDoc = null, filterSubject = 'All', filterSubtopic = 'All', limitCount = 50) => {
    const queryParams = new URLSearchParams({ subject: filterSubject, subtopic: filterSubtopic, limit: limitCount });
    const data = await apiRequest(`/api/questions?${queryParams.toString()}`);
    return { items: normalizeQuestions(data) };
};

export const fetchFlaggedQuestions = async (filterSubject = 'All', filterSubtopic = 'All') => {
    const queryParams = newSearchParams({ subject: filterSubject, subtopic: filterSubtopic });
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

// ----------------------------------------------------------------------
// 3. Metadata Handlers
// ----------------------------------------------------------------------
export const fetchVaultMetadata = async () => apiRequest('/api/metadata/vault');
export const resyncVaultMetadata = async () => apiRequest('/api/metadata/vault/resync', 'POST');

// ----------------------------------------------------------------------
// 4. Simulation Ledger
// ----------------------------------------------------------------------
export const fetchSimulationLedger = async (uid, limitCount = 20) => {
    const data = await apiRequest(`/api/exams/history?limit=${limitCount}`);
    return Array.isArray(data) ? data : (data?.items || []);
};
export const deleteSimulationRecord = async (uid, recordId) => apiRequest(`/api/exams/history/${recordId}`, 'DELETE');
export const saveSimulationRecord = async () => true;
export const migrateSimulationRecords = async () => 0;

// ----------------------------------------------------------------------
// 5. The Social Matrix (Leaderboards)
// ----------------------------------------------------------------------
export const syncLeaderboardProfile = async () => true; // Handled dynamically in backend now
export const fetchGlobalLeaderboard = async (limitCount = 100) => {
    const data = await apiRequest(`/api/leaderboard?limit=${limitCount}`);
    return data?.leaderboard || data?.items || data || [];
};
export const fetchPaginatedLeaderboard = async (limitCount = 20, lastVisible = null) => {
    const data = await apiRequest(`/api/leaderboard/paginated?limit=${limitCount}`);
    return data?.items || data || [];
};

// ----------------------------------------------------------------------
// 6. Multiplayer Mock Battles
// ----------------------------------------------------------------------
export const createMultiplayerBattle = async (host, config, questions, timeLimitSecs) => {
    const result = await apiRequest('/api/battles', 'POST', { config, questions, timeLimitSecs });
    return result.battleId;
};
export const fetchMultiplayerBattle = async (battleId) => apiRequest(`/api/battles/${battleId}`);
export const submitBattleScore = async (battleId, user, score, totalQs, timeTakenSecs) => {
    return await apiRequest(`/api/battles/${battleId}/submit`, 'POST', { score, total: totalQs, timeTakenSecs });
};
export const syncLiveBattleProgress = async (battleId, user, currentScore, itemsAnswered) => {
    return await apiRequest(`/api/battles/${battleId}/progress`, 'PUT', { liveScore: currentScore, itemsAnswered });
};

// ----------------------------------------------------------------------
// 7. System Configuration & Bookmarks
// ----------------------------------------------------------------------
export const fetchDynamicTOS = async () => {
    try { return await apiRequest('/api/config/tos'); } catch (e) { return null; }
};
export const updateDynamicTOS = async (newTOS) => apiRequest('/api/config/tos', 'PUT', newTOS);
export const saveBookmark = async (uid, itemData) => apiRequest('/api/bookmarks', 'POST', itemData);
export const removeBookmark = async (uid, itemId) => apiRequest(`/api/bookmarks/${itemId}`, 'DELETE');
export const fetchBookmarks = async () => {
    const data = await apiRequest('/api/bookmarks');
    return normalizeQuestions(data);
};
export const updateBookmarkCache = async (uid, itemId, aiExplanation) => {
    return await apiRequest(`/api/bookmarks/${itemId}/cache`, 'PUT', { cachedAiExplanation: aiExplanation });
};