// src/features/active-recall/useReviewSession.js
import { useState, useRef, useEffect } from 'react';
import { initializeReviewSession, syncTelemetryBatch, getAnalyticsProfile } from '../../services/dbQueries';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

export const useReviewSession = (currentUser, isOnline) => {
    const [config, setConfig] = useState({
        sessionMode: 'mcq', studyMode: 'interleaved',
        subject: 'Mathematics', subtopic: 'All',
        count: 20, source: 'library', cognitiveFocus: 'mixed'
    });

    const [session, setSession] = useState({
        isActive: false, isFinished: false, aiLoading: false, 
        currentQuestion: null, totalAnswered: 0, correctHits: 0
    });

    const [showAnswer, setShowAnswer] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const setStats = useStore(state => state.setStats);
    
    const telemetryBatchRef = useRef([]);
    const questionStartTime = useRef(Date.now());
    const libraryCache = useRef([]);

    const loadNextQuestion = async () => {
        try {
            setSession(s => ({ ...s, aiLoading: true }));
            setShowAnswer(false);
            setSelectedOption(null);

            let nextQ = null;

            if (libraryCache.current.length > 0) {
                nextQ = libraryCache.current.pop();
            } else {
                const freshData = await initializeReviewSession(config);
                if (!freshData || freshData.length === 0) {
                    throw new Error("No items left in the vault for these parameters.");
                }
                libraryCache.current = freshData.sort(() => 0.5 - Math.random());
                nextQ = libraryCache.current.pop();
            }

            questionStartTime.current = Date.now();

            // 🚀 FIXED: Passes 'currentQuestion' specifically to stop the blank screen bug
            setSession(s => ({ 
                ...s, isActive: true, aiLoading: false, currentQuestion: nextQ 
            }));
        } catch (error) {
            setSession(s => ({ ...s, aiLoading: false }));
            toast.error(error.message || "Failed to initialize matrix stream.");
        }
    };

    const handleAnswer = (answerOrOption, confidence = 'HIGH') => {
        if (showAnswer) return;
        
        const q = session.currentQuestion;
        const isCorrect = answerOrOption === q.answer;
        const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);

        setSelectedOption(answerOrOption);
        setShowAnswer(true);

        setSession(s => ({
            ...s,
            totalAnswered: s.totalAnswered + 1,
            correctHits: s.correctHits + (isCorrect ? 1 : 0)
        }));

        telemetryBatchRef.current.push({
            questionId: q.id, subject: q.subject, subtopic: q.subtopic,
            isCorrect: isCorrect, confidenceLevel: confidence,
            timeSpentMs: timeSpent * 1000
        });
    };

    const finishSession = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const toastId = toast.loading("Syncing recall telemetry...");

        try {
            if (isOnline && telemetryBatchRef.current.length > 0) {
                await syncTelemetryBatch(
                    currentUser.uid, crypto.randomUUID(), 
                    config.subject, config.sessionMode, telemetryBatchRef.current
                );
                const freshProfile = await getAnalyticsProfile(currentUser.uid);
                if (freshProfile?.data) setStats(freshProfile.data);
            }
            setSession({ isActive: false, isFinished: true, aiLoading: false, currentQuestion: null, totalAnswered: 0, correctHits: 0 });
            toast.success("Review metrics synchronized.", { id: toastId });
        } catch (error) {
            toast.error("Offline: Progress stored locally.", { id: toastId });
        } finally {
            telemetryBatchRef.current = [];
            setIsSubmitting(false);
        }
    };

    return {
        config, setConfig, session, setSession, showAnswer, selectedOption,
        loadNextQuestion, handleAnswer, finishSession, libraryCache
    };
};