// src/features/active-recall/useReviewSession.js
import { useState, useRef, useEffect } from 'react';
import { initializeReviewSession, syncTelemetryBatch, getAnalyticsProfile } from '../../services/dbQueries';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

export const useReviewSession = (currentUser, isOnline) => {
    const [config, setConfig] = useState({
        studyMode: 'subject', sessionMode: 'mcq',
        subject: 'Mathematics', subtopic: 'All',
        count: 20, source: 'library', cognitiveFocus: 'mixed'
    });

    const [session, setSession] = useState({
        isActive: false, loading: false, isFinished: false,
        questions: [], currentIndex: 0, answers: {}, confidences: {}
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const setStats = useStore(state => state.setStats);
    
    // 🚀 Robust Batched Telemetry Architecture
    const timeSpentPerQuestion = useRef({});
    const lastActiveTime = useRef(Date.now());
    const libraryCache = useRef([]);

    const loadNextQuestion = async () => {
        setSession(prev => ({ ...prev, loading: true, error: null }));
        try {
            const data = await initializeReviewSession(config);
            if (!data || data.length === 0) throw new Error("No review materials found for parameters.");

            timeSpentPerQuestion.current = {};
            lastActiveTime.current = Date.now();
            
            setSession({
                isActive: true, isFinished: false, loading: false,
                questions: data, currentIndex: 0, answers: {}, confidences: {}
            });
        } catch (error) {
            toast.error(error.message);
            setSession(prev => ({ ...prev, loading: false, error: error.message }));
        }
    };

    const submitAnswer = (value) => {
        const { currentIndex } = session;
        const now = Date.now();
        timeSpentPerQuestion.current[currentIndex] = (timeSpentPerQuestion.current[currentIndex] || 0) + (now - lastActiveTime.current);
        lastActiveTime.current = now;

        setSession(prev => ({
            ...prev,
            answers: { ...prev.answers, [currentIndex]: value }
        }));
    };

    const handleConfidence = (level) => {
        setSession(prev => ({
            ...prev,
            confidences: { ...prev.confidences, [session.currentIndex]: level }
        }));
    };

    const nextCard = () => {
        lastActiveTime.current = Date.now();
        if (session.currentIndex + 1 < session.questions.length) {
            setSession(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
        } else {
            finishSession();
        }
    };

    // 🚀 FIXED: Batch payload and sync directly to PostgreSQL
    const finishSession = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const toastId = toast.loading("Syncing recall telemetry...");

        try {
            const { questions, answers, confidences } = session;
            
            // Build the standard Server Payload
            const attemptsPayload = questions.map((q, idx) => ({
                questionId: q.id,
                subject: q.subject,
                subtopic: q.subtopic,
                isCorrect: answers[idx] === q.answer,
                confidenceLevel: confidences[idx] || 'HIGH',
                timeSpentMs: (timeSpentPerQuestion.current[idx] || 5000)
            }));

            // Sync to the cloud and refresh dashboard charts
            if (isOnline) {
                await syncTelemetryBatch(
                    currentUser.uid, crypto.randomUUID(), 
                    config.subject, config.sessionMode, attemptsPayload
                );
                
                // Immediately pull updated profile to refresh heatmaps
                const freshProfile = await getAnalyticsProfile(currentUser.uid);
                if (freshProfile?.data) setStats(freshProfile.data);
            }

            setSession(prev => ({ ...prev, isFinished: true, isActive: false }));
            toast.success("Telemetry Synced Successfully.", { id: toastId });
        } catch (error) {
            toast.error("Failed to sync telemetry.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        config, setConfig, session, setSession,
        loadNextQuestion, submitAnswer, handleConfidence, nextCard, finishSession,
        libraryCache, isSubmitting
    };
};