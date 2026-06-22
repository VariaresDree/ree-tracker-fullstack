// src/features/active-recall/useReviewSession.js
import { useState, useRef, useEffect } from 'react';
import { fetchVaultQuestions, syncTelemetryBatch, getAnalyticsProfile, updateQuestionCache, updateQuestionInBank, apiRequest } from '../../services/dbQueries';
import { generateQuestionsAI, generateMasterExplanation } from '../../services/geminiApi';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

export const useReviewSession = (currentUser, isOnline) => {
    const { dynamicTOS, setStats } = useStore();
    const safeTOS = dynamicTOS || {};

    const [config, setConfig] = useState({
        studyMode: 'subject', sessionMode: 'mcq',
        subject: 'EE', subtopic: 'All',
        count: 20, source: 'library', cognitiveFocus: 'mixed'
    });

    const [session, setSession] = useState({
        isActive: false, loading: false, isFinished: false,
        questions: [], currentIndex: 0, 
        isAnswered: false, isFlipped: false,
        confidence: null, selectedOption: null, wrongSelection: null,
        totalAnswered: 0, correctHits: 0,
        showAi: false, aiLoading: false, showOffline: false
    });

    const [elapsedTime, setElapsedTime] = useState(0);
    const [bookmarks, setBookmarks] = useState(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const startTimeRef = useRef(Date.now());
    const telemetryBatchRef = useRef([]);

    // 🚀 High-Performance Absolute Timer
    useEffect(() => {
        let interval;
        if (session.isActive && !session.isAnswered && !session.isFlipped && !session.isFinished) {
            interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [session.isActive, session.isAnswered, session.isFlipped, session.currentIndex, session.isFinished]);

    const startSession = async () => {
        setSession(prev => ({ ...prev, loading: true }));
        try {
            let freshData = [];

            // 1. Data Ingestion (DEEP POOL FETCH STRATEGY)
            if (config.source === 'ai') {
                if (!isOnline) throw new Error("AI Generator requires an active uplink.");
                const targetTopic = config.studyMode === 'subtopic' ? config.subtopic : (safeTOS[config.subject]?.[0] || 'General');
                freshData = await generateQuestionsAI(config.subject, targetTopic, false);
            } else {
                // 🚀 FIXED: Fetch up to 1000 questions to create a massive Supabase randomization pool
                const subTarget = config.subtopic === 'All' ? 'All' : config.subtopic;
                freshData = await fetchVaultQuestions(config.subject, subTarget, 1000);
            }

            if (!freshData || freshData.length === 0) throw new Error("Vault is empty for these parameters.");

            // 2. 🚀 STRICT COGNITIVE FOCUS FILTERING
            let filteredData = freshData;
            if (config.cognitiveFocus === 'conceptual') {
                filteredData = freshData.filter(q => q.type !== 'calculation');
            } else if (config.cognitiveFocus === 'calculation') {
                filteredData = freshData.filter(q => q.type === 'calculation');
            }

            if (filteredData.length === 0) {
                throw new Error(`No [${config.cognitiveFocus.toUpperCase()}] items found. Please switch to Standard Mix or change topics.`);
            }
            
            // 3. 🚀 TRUE RANDOMIZATION: Shuffle massive pool, then extract exact session count
            const shuffled = filteredData.sort(() => 0.5 - Math.random());
            const finalSessionQuestions = shuffled.slice(0, config.count || 20);

            telemetryBatchRef.current = [];
            startTimeRef.current = Date.now();
            setElapsedTime(0);
            
            setSession({
                isActive: true, loading: false, isFinished: false,
                questions: finalSessionQuestions, currentIndex: 0,
                isAnswered: false, isFlipped: false,
                confidence: null, selectedOption: null, wrongSelection: null,
                totalAnswered: 0, correctHits: 0,
                showAi: false, aiLoading: false, showOffline: false
            });
        } catch (error) {
            toast.error(error.message);
            setSession(prev => ({ ...prev, loading: false }));
        }
    };

    const handleAnswerSelection = (option) => {
        if (session.isAnswered) return;
        if (!session.confidence) return toast.error("Select Target Lock Confidence First.");

        const currentQ = session.questions[session.currentIndex];
        const isCorrect = option === currentQ.answer;

        setSession(prev => ({
            ...prev, isAnswered: true, selectedOption: option,
            wrongSelection: !isCorrect ? option : null,
            totalAnswered: prev.totalAnswered + 1, correctHits: prev.correctHits + (isCorrect ? 1 : 0)
        }));

        telemetryBatchRef.current.push({
            questionId: currentQ.id, subject: currentQ.subject, subtopic: currentQ.subtopic,
            isCorrect: isCorrect, confidenceLevel: session.confidence, timeSpentMs: elapsedTime * 1000
        });
    };

    const handleFlashcardReveal = () => setSession(prev => ({ ...prev, isFlipped: true }));

    const handleFlashcardRating = (rating) => {
        if (session.isAnswered) return;

        let isCorrect = false;
        let mappedConfidence = 'LOW';
        if (rating === 'easy') { isCorrect = true; mappedConfidence = 'HIGH'; }
        else if (rating === 'good') { isCorrect = true; mappedConfidence = 'HIGH'; }
        else if (rating === 'hard') { isCorrect = true; mappedConfidence = 'MED'; }
        else if (rating === 'again') { isCorrect = false; mappedConfidence = 'LOW'; }

        const currentQ = session.questions[session.currentIndex];

        setSession(prev => ({
            ...prev, isAnswered: true,
            totalAnswered: prev.totalAnswered + 1, correctHits: prev.correctHits + (isCorrect ? 1 : 0)
        }));

        telemetryBatchRef.current.push({
            questionId: currentQ.id, subject: currentQ.subject, subtopic: currentQ.subtopic,
            isCorrect: isCorrect, confidenceLevel: mappedConfidence, timeSpentMs: elapsedTime * 1000
        });
    };

    const loadNextQuestion = () => {
        if (session.currentIndex + 1 >= session.questions.length) {
            endSession();
        } else {
            startTimeRef.current = Date.now();
            setElapsedTime(0);
            setSession(prev => ({
                ...prev, currentIndex: prev.currentIndex + 1,
                isAnswered: false, isFlipped: false,
                confidence: null, selectedOption: null, wrongSelection: null,
                showAi: false, showOffline: false
            }));
        }
    };

    const endSession = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const toastId = toast.loading("Encrypting and Syncing Telemetry...");

        try {
            if (isOnline && telemetryBatchRef.current.length > 0) {
                await syncTelemetryBatch(currentUser.uid, `REV_${Date.now()}`, config.subject, config.sessionMode, telemetryBatchRef.current);

                const totalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
                await apiRequest('/api/analytics/study-sessions', 'POST', {
                    mode: config.sessionMode,
                    subject: config.subject,
                    subtopic: config.subtopic === 'All' ? null : config.subtopic,
                    totalQuestions: session.totalAnswered,
                    correctAnswers: session.correctHits,
                    durationSecs: totalDuration
                }).catch(() => {});

                const freshProfile = await getAnalyticsProfile(currentUser.uid);
                if (freshProfile?.data) setStats(freshProfile.data);
            }
            toast.success("Session Data Synced Globally.", { id: toastId });
        } catch (error) {
            toast.error("Offline: Progress stored locally.", { id: toastId });
        } finally {
            telemetryBatchRef.current = [];
            setIsSubmitting(false);
            setSession(prev => ({ ...prev, isActive: false, isFinished: true, questions: [] }));
        }
    };

    const toggleBookmark = () => {
        const currentQ = session.questions[session.currentIndex];
        if (!currentQ) return;
        setBookmarks(prev => {
            const next = new Set(prev);
            if (next.has(currentQ.id)) { next.delete(currentQ.id); toast.success("Removed Bookmark"); }
            else { next.add(currentQ.id); toast.success("Bookmarked"); }
            return next;
        });
    };

    const handleFlagQuestion = async () => {
        const currentQ = session.questions[session.currentIndex];
        if (!currentQ?.id) return toast.error("Cannot flag dynamic items.");
        try {
            await updateQuestionInBank(currentQ.id, { isFlagged: true });
            setSession(prev => {
                const newQs = [...prev.questions];
                newQs[prev.currentIndex] = { ...currentQ, isFlagged: true };
                return { ...prev, questions: newQs };
            });
            toast.success("Anomaly Reported.");
        } catch (err) { toast.error("Flag failed."); }
    };

    const fetchOrToggleAI = async () => {
        if (session.showAi) { setSession(prev => ({ ...prev, showAi: false })); return; }
        const currentQ = session.questions[session.currentIndex];
        if (currentQ.cachedExplanation) {
            setSession(prev => ({ ...prev, showAi: true, aiResponse: currentQ.cachedExplanation })); return;
        }

        setSession(prev => ({ ...prev, showAi: true, aiLoading: true }));
        try {
            const resp = await generateMasterExplanation(currentQ);
            if (currentQ.id) await updateQuestionCache(currentQ.id, resp);
            setSession(prev => {
                const newQs = [...prev.questions];
                newQs[prev.currentIndex] = { ...currentQ, cachedExplanation: resp };
                return { ...prev, questions: newQs, aiResponse: resp, aiLoading: false };
            });
        } catch (err) {
            toast.error("AI Core Offline.");
            setSession(prev => ({ ...prev, aiLoading: false, showAi: false }));
        }
    };

    return {
        config, setConfig, session, setSession, elapsedTime, bookmarks,
        startSession, endSession, loadNextQuestion, 
        handleAnswerSelection, handleFlashcardReveal, handleFlashcardRating,
        toggleBookmark, handleFlagQuestion, fetchOrToggleAI, safeTOS, isSubmitting
    };
};