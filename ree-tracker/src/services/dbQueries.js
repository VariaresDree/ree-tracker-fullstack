// src/services/dbQueries.js
import {
    doc, getDoc, setDoc, collection, addDoc, getDocs, query, where,
    orderBy, limit, deleteDoc, writeBatch, startAfter, getCountFromServer, increment 
} from 'firebase/firestore';
import { db } from '../config/firebaseDb.js';

// ----------------------------------------------------------------------
// 1. Analytics Profile & Telemetry (user-scoped)
// ----------------------------------------------------------------------
export const getAnalyticsProfile = async (uid) => {
    if (!uid) throw new Error("UID required.");
    const snapshot = await getDoc(doc(db, "userData", uid));
    return snapshot.exists() ? snapshot.data() : null;
};

export const updateAnalyticsProfile = async (uid, statsPayload) => {
    if (!uid) throw new Error("UID required.");
    await setDoc(doc(db, "userData", uid), statsPayload, { merge: true });
};

export const updateCommandParameters = async (uid, payload) => {
    if (!uid) throw new Error("UID required.");
    await setDoc(doc(db, "userData", uid), payload, { merge: true });
};

export const logSRSRecord = async (uid, questionId, payload) => {
    if (!uid || !questionId) return;
    await setDoc(doc(db, "userData", uid, "srsLedger", questionId), payload, { merge: true });
};

// ----------------------------------------------------------------------
// 2. Question Bank & Review Queue (Global & Quarantine)
// ----------------------------------------------------------------------
export const saveQuestionToBank = async (questionObject) => {
    // SECURITY UPGRADE: Default manual entries to 'verified', AI passes 'quarantined'
    const finalQuestion = { status: 'verified', ...questionObject };
    const docRef = await addDoc(collection(db, "questions"), finalQuestion);
    
    // Only pad the vault statistics if the question bypassed quarantine
    if (finalQuestion.status === 'verified') {
        const statRef = doc(db, "metadata", "vaultStats");
        const safeSubj = finalQuestion.subject === 'Mathematics' ? 'Math' : finalQuestion.subject;
        await setDoc(statRef, {
            [`${safeSubj}_${finalQuestion.subtopic}`]: increment(1),
            [`${safeSubj}_total`]: increment(1),
            total: increment(1)
        }, { merge: true });
    }
    return docRef.id;
};

// --- NEW QUARANTINE PIPELINE ---
export const fetchQuarantineQueue = async () => {
    const qQuery = query(collection(db, "questions"), where("status", "==", "quarantined"));
    const snap = await getDocs(qQuery);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const approveQuarantinedQuestion = async (id, subject, subtopic) => {
    await setDoc(doc(db, "questions", id), { status: "verified" }, { merge: true });

    // Safely increment stats now that an Admin has verified it
    const statRef = doc(db, "metadata", "vaultStats");
    const safeSubj = subject === 'Mathematics' ? 'Math' : subject;
    await setDoc(statRef, {
        [`${safeSubj}_${subtopic}`]: increment(1),
        [`${safeSubj}_total`]: increment(1),
        total: increment(1)
    }, { merge: true });
};
// -------------------------------

export const fetchServerStats = async () => {
    const coll = collection(db, "questions");
    const totalSnap = await getCountFromServer(coll);
    const mathSnap = await getCountFromServer(query(coll, where("subject", "in", ["Math", "Mathematics"])));
    const esasSnap = await getCountFromServer(query(coll, where("subject", "==", "ESAS")));
    const eeSnap = await getCountFromServer(query(coll, where("subject", "==", "EE")));

    return {
        total: totalSnap.data().count,
        math: mathSnap.data().count,
        esas: esasSnap.data().count,
        ee: eeSnap.data().count
    };
};

export const fetchPaginatedQuestions = async (lastVisibleDoc = null, filterSubject = 'All', filterSubtopic = 'All', limitCount = 50) => {
    let constraints = [orderBy("createdAt", "desc"), limit(limitCount)];
    if (filterSubject !== 'All') constraints.unshift(where("subject", "==", filterSubject));
    if (filterSubtopic !== 'All') constraints.unshift(where("subtopic", "==", filterSubtopic));
    if (lastVisibleDoc) constraints.push(startAfter(lastVisibleDoc));

    const q = query(collection(db, "questions"), ...constraints);
    const snap = await getDocs(q);
    
    const lastVisible = snap.docs[snap.docs.length - 1];
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return { items, lastVisible, empty: snap.empty };
};

export const fetchFlaggedQuestions = async (filterSubject = 'All', filterSubtopic = 'All') => {
    const qRef = collection(db, "questions");
    let constraints = [where("isFlagged", "==", true)];
    if (filterSubject !== 'All') constraints.push(where("subject", "==", filterSubject));
    if (filterSubtopic !== 'All') constraints.push(where("subtopic", "==", filterSubtopic));

    const qQuery = query(qRef, ...constraints);
    const snap = await getDocs(qQuery);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteQuestionFromBank = async (id) => {
    const qSnap = await getDoc(doc(db, "questions", id));
    if (qSnap.exists()) {
        const qData = qSnap.data();
        await deleteDoc(doc(db, "questions", id));
        
        // Only decrement if it was previously verified
        if (qData.status !== 'quarantined') {
            const statRef = doc(db, "metadata", "vaultStats");
            const safeSubj = qData.subject === 'Mathematics' ? 'Math' : qData.subject;
            await setDoc(statRef, {
                [`${safeSubj}_${qData.subtopic}`]: increment(-1),
                [`${safeSubj}_total`]: increment(-1),
                total: increment(-1)
            }, { merge: true });
        }
    }
};

export const updateQuestionInBank = async (id, questionObject) => {
    if (!id) throw new Error("Document ID required.");
    await setDoc(doc(db, "questions", id), questionObject, { merge: true });
};

export const updateQuestionCache = async (id, explanation) => {
    if (!id) return;
    await setDoc(doc(db, "questions", id), { cachedExplanation: explanation }, { merge: true });
};

export const fetchReviewQuestions = async (mode, subject, subtopic, blindSpots) => {
    const qRef = collection(db, "questions");
    let qQuery;
    
    if (mode === 'bleeding') {
        if (!blindSpots || blindSpots.length === 0) return [];
        qQuery = query(qRef, where('__name__', 'in', blindSpots.slice(0, 30)));
    } else if (mode === 'subject') {
        qQuery = query(qRef, where("subject", "==", subject), limit(1000));
    } else if (mode === 'subtopic') {
        qQuery = query(qRef, where("subject", "==", subject), where("subtopic", "==", subtopic), limit(1000));
    } else { 
        qQuery = query(qRef, limit(1000));
    }
    
    const snap = await getDocs(qQuery);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ----------------------------------------------------------------------
// 3. Metadata Handlers
// ----------------------------------------------------------------------
export const fetchVaultMetadata = async () => {
    const snap = await getDoc(doc(db, "metadata", "vaultStats"));
    if (snap.exists()) return snap.data();
    return {};
};

export const resyncVaultMetadata = async () => {
    const allDocs = await getDocs(collection(db, "questions"));
    const stats = { total: 0, Math_total: 0, ESAS_total: 0, EE_total: 0 };
    
    allDocs.forEach(d => {
        const data = d.data();
        if (data.status === 'quarantined') return; // Skip quarantined items in tally
        
        const subj = data.subject === 'Mathematics' ? 'Math' : data.subject;
        const topicKey = `${subj}_${data.subtopic}`;
        stats[topicKey] = (stats[topicKey] || 0) + 1;
        stats[`${subj}_total`] = (stats[`${subj}_total`] || 0) + 1;
        stats.total += 1;
    });
    
    await setDoc(doc(db, "metadata", "vaultStats"), stats);
    return stats;
};

// ----------------------------------------------------------------------
// 4. Simulation Ledger – User-isolated
// ----------------------------------------------------------------------
export const saveSimulationRecord = async (uid, simulationData) => {
    if (!uid) throw new Error("User ID required.");
    const payload = { ...simulationData, userId: uid, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, "simulationHistory"), payload);
    return docRef.id;
};

export const fetchSimulationLedger = async (uid, limitCount = 20) => {
    if (!uid) throw new Error("User ID required.");
    const q = query(collection(db, "simulationHistory"), where("userId", "==", uid), orderBy("date", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteSimulationRecord = async (uid, recordId) => {
    if (!uid || !recordId) throw new Error("UID and Record ID required.");
    const docRef = doc(db, "simulationHistory", recordId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) throw new Error("Record not found.");
    if (snapshot.data().userId !== uid) throw new Error("Unauthorized deletion attempt.");
    await deleteDoc(docRef);
    return true;
};

export const migrateSimulationRecords = async (uid) => {
    if (!uid) throw new Error("User ID required.");
    const q = query(collection(db, "simulationHistory"), where("userId", "==", null));
    const snap = await getDocs(q);
    if (snap.empty) return 0;
    
    const batch = writeBatch(db);
    let count = 0;
    snap.forEach(docSnap => {
        batch.update(docSnap.ref, { userId: uid });
        count++;
    });
    await batch.commit();
    return count;
};

// ----------------------------------------------------------------------
// 5. The Social Matrix (Leaderboards & Gamification)
// ----------------------------------------------------------------------
export const syncLeaderboardProfile = async (user, stats) => {
    if (!user?.uid || !stats) return;
    const payload = {
        uid: user.uid, displayName: user.displayName || 'Anonymous Agent',
        thetaRating: stats?.irt?.theta || 0, streak: stats?.globalStreak || 0,
        gauntletLevel: stats?.gauntletLevel || 1, lastActive: new Date().toISOString()
    };
    await setDoc(doc(db, "leaderboard", user.uid), payload, { merge: true });
};

export const fetchGlobalLeaderboard = async (limitCount = 50) => {
    const q = query(collection(db, "leaderboard"), orderBy("thetaRating", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
};

export const fetchPaginatedLeaderboard = async (limitCount = 20, lastVisible = null) => {
    try {
        const leaderboardRef = collection(db, 'leaderboard');
        let q = query(leaderboardRef, orderBy('thetaRating', 'desc'), limit(limitCount));
        if (lastVisible) q = query(q, startAfter(lastVisible));

        const snapshot = await getDocs(q);
        const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
        
        const agents = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                uid: data.uid || docSnap.id, displayName: data.displayName || 'Unknown Agent',
                thetaRating: data.thetaRating || 0, streak: data.streak || 0,
                gauntletLevel: data.gauntletLevel || 1, lastActive: data.lastActive || null
            };
        });
        return { agents, lastDoc };
    } catch (error) {
        console.error("Error fetching paginated leaderboard:", error);
        throw error;
    }
};

// ----------------------------------------------------------------------
// 6. Multiplayer Mock Battles
// ----------------------------------------------------------------------
export const createMultiplayerBattle = async (host, config, questions, timeLimitSecs) => {
    if (!host?.uid) throw new Error("Must be authenticated to host a battle.");
    const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
    let battleId = generateCode();
    let docRef = doc(db, "battles", battleId);
    let snap = await getDoc(docRef);
    while(snap.exists()) {
        battleId = generateCode();
        docRef = doc(db, "battles", battleId);
    }
    const payload = { hostId: host.uid, hostName: host.displayName || 'Agent', config, timeLimitSecs, questions, createdAt: new Date().toISOString(), status: 'active' };
    await setDoc(docRef, payload);
    return battleId;
};

export const fetchMultiplayerBattle = async (battleId) => {
    const docRef = doc(db, "battles", battleId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Battle coordinates not found. Link may be invalid.");
    return { id: snap.id, ...snap.data() };
};

export const submitBattleScore = async (battleId, user, score, totalQs, timeTakenSecs) => {
    const participantRef = doc(db, "battles", battleId, "participants", user.uid);
    await setDoc(participantRef, { name: user.displayName || 'Agent', score: score, total: totalQs, timeTaken: timeTakenSecs, submittedAt: new Date().toISOString() });
};

export const syncLiveBattleProgress = async (battleId, user, currentScore, itemsAnswered) => {
    if (!battleId || !user?.uid) return;
    const participantRef = doc(db, "battles", battleId, "participants", user.uid);
    await setDoc(participantRef, { name: user.displayName || 'Agent', liveScore: currentScore, itemsAnswered: itemsAnswered, lastUpdated: new Date().toISOString() }, { merge: true });
};

// ----------------------------------------------------------------------
// 7. System Configuration & Dynamic TOS
// ----------------------------------------------------------------------
export const fetchDynamicTOS = async () => {
    try {
        const docRef = doc(db, "systemConfig", "tos");
        const snap = await getDoc(docRef);
        if (snap.exists()) return snap.data();
        return null;
    } catch (error) {
        console.error("Failed to fetch dynamic TOS from Matrix:", error);
        return null;
    }
};

export const updateDynamicTOS = async (newTOS) => {
    try {
        const docRef = doc(db, "systemConfig", "tos");
        await setDoc(docRef, { ...newTOS, lastUpdated: new Date().toISOString() });
        return true;
    } catch (error) {
        console.error("Failed to update dynamic TOS:", error);
        throw error;
    }
};

// ----------------------------------------------------------------------
// 8. Bookmark Vault
// ----------------------------------------------------------------------
export const saveBookmark = async (uid, itemData) => {
    if (!uid || !itemData?.id) throw new Error("Missing user ID or Item ID");
    const bookmarkRef = doc(db, 'userData', uid, 'bookmarks', String(itemData.id));
    await setDoc(bookmarkRef, { ...itemData, bookmarkedAt: new Date().toISOString() });
};

export const removeBookmark = async (uid, itemId) => {
    if (!uid || !itemId) throw new Error("Missing user ID or Item ID");
    const bookmarkRef = doc(db, 'userData', uid, 'bookmarks', String(itemId));
    await deleteDoc(bookmarkRef);
};

export const fetchBookmarks = async (uid) => {
    if (!uid) return [];
    const q = query(collection(db, 'userData', uid, 'bookmarks'), orderBy('bookmarkedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
};

export const updateBookmarkCache = async (uid, itemId, aiExplanation) => {
    if (!uid || !itemId) return;
    const bookmarkRef = doc(db, 'userData', uid, 'bookmarks', String(itemId));
    await setDoc(bookmarkRef, { cachedAiExplanation: aiExplanation }, { merge: true });
};