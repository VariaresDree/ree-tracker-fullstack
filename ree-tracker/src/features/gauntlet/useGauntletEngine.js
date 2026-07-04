import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { apiRequest, getAnalyticsProfile } from '../../services/dbQueries';
import { auth } from '../../config/firebaseDb';
import toast from 'react-hot-toast';

const GAUNTLET_TIERS = {
  1: { reqQs: 200, items: 50, timeLimitSecs: 75 * 60 },
  2: { reqQs: 500, items: 75, timeLimitSecs: 110 * 60 },
  3: { reqQs: 1000, items: 100, timeLimitSecs: 150 * 60 },
  4: { reqQs: 2000, items: 100, timeLimitSecs: 120 * 60 }
};

export const useGauntletEngine = (level) => {
    const { stats, setStats, startSession: startStoreSession, endSession: endStoreSession } = useStore();
    const [status, setStatus] = useState('loading');
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [confidences, setConfidences] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [diagnostics, setDiagnostics] = useState(null);

    // Per-question time tracking. We bucket time on the question that was
    // visible when it was answered (best signal available without page-level
    // visibility tracking); zero defaults are safe — the analytics ignores 0ms.
    const lastAnswerTimestampRef = useRef(Date.now());
    const timeSpentPerQuestionRef = useRef({});

    useEffect(() => {
        const bootGauntlet = async () => {
            const tier = GAUNTLET_TIERS[level];
            if (!tier) {
                setStatus('error');
                return;
            }

            const lockUntil = stats?.gauntletLockUntil;
            const totalAnswered = stats?.totalAnswered || 0;
            const currentLevel = stats?.gauntletLevel || 1;

            if (lockUntil && lockUntil > Date.now()) {
                toast.error("Security Breach: System is currently on a cooldown lock.");
                window.location.href = '/arena';
                return;
            }

            if (totalAnswered < tier.reqQs || currentLevel < parseInt(level)) {
                toast.error("Security Breach: You lack the required telemetry to enter this sector.");
                window.location.href = '/arena';
                return;
            }

            setTimeLeft(tier.timeLimitSecs);

            try {
                const data = await apiRequest(`/api/exams?limit=${tier.items * 2}`);
                const allQs = (data?.items || []).filter(q => !q.isFlagged);

                if (allQs.length < tier.items) {
                    toast.error("Insufficient global bank questions to construct the Gauntlet.");
                    return setStatus('error');
                }

                const selectedQs = allQs.slice(0, tier.items).map(q => ({
                    ...q,
                    question: q.text || q.question || '[Question Text Missing]',
                    options: q.options ? [...q.options].sort(() => 0.5 - Math.random()) : []
                }));

                setQuestions(selectedQs);
                // Bracket the session in the store. Gauntlet's /api/exams/grade
                // endpoint creates the ExamSession server-side, so the
                // frontend doesn't need to send the sessionId — but tracking
                // the session lifecycle in the store keeps the UI's sync
                // status and the dashboard's "session active" UX consistent.
                startStoreSession({ mode: 'GAUNTLET', subject: 'BLENDED' });
                setStatus('active');
            } catch (err) {
                console.error(err);
                setStatus('error');
            }
        };
        bootGauntlet();
    }, [level, stats]);

    useEffect(() => {
        if (status !== 'active') return;
        if (timeLeft <= 0) {
            submitExam(true);
            return;
        }
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [status, timeLeft]);

    const handleAnswer = (qIndex, selectedOpt) => {
        const now = Date.now();
        const delta = now - lastAnswerTimestampRef.current;
        lastAnswerTimestampRef.current = now;
        // Bucket the elapsed time on the question being answered.
        timeSpentPerQuestionRef.current[qIndex] = (timeSpentPerQuestionRef.current[qIndex] || 0) + Math.max(0, delta);
        setAnswers(prev => ({ ...prev, [qIndex]: selectedOpt }));
    };

    const handleConfidence = (qIndex, level) => {
        setConfidences(prev => ({ ...prev, [qIndex]: level }));
    };

    const submitExam = async (isTimeOut = false) => {
        setStatus('loading');
        const tier = GAUNTLET_TIERS[level];

        try {
            // Per-question confidence (silent MED default when skipped under time
            // pressure) and elapsed time go into the grade payload so Gauntlet
            // attempts feed the same calibration/IRT analytics as Active Review
            // and Board Simulator.
            // Deterministic per-attempt id: a retried grade call (timeout,
            // double-tap) dedupes server-side instead of double-counting.
            const gauntletSessionId = useStore.getState().currentSessionId || (crypto?.randomUUID?.() ?? String(Date.now()));
            const gradePayload = questions.map((q, idx) => ({
                questionId: q.id,
                userAnswer: answers[idx] || '',
                confidenceLevel: confidences[idx] || 'MED',
                timeSpentMs: timeSpentPerQuestionRef.current[idx] || 0,
                clientAttemptId: `${gauntletSessionId}:${q.id}`,
            }));

            const gradeResult = await apiRequest('/api/exams/grade', 'POST', { answers: gradePayload, mode: 'GAUNTLET' });
            const results = gradeResult?.results || [];

            let correctCount = 0;
            const failedSubtopics = {};

            results.forEach((r, idx) => {
                if (r.isCorrect) {
                    correctCount++;
                } else {
                    const subtopic = questions[idx]?.subtopic || 'Unknown';
                    if (!failedSubtopics[subtopic]) failedSubtopics[subtopic] = 0;
                    failedSubtopics[subtopic]++;
                }
            });

            const scorePct = Math.round((correctCount / tier.items) * 100);
            const isPassed = scorePct >= 70;

            setDiagnostics({
                scorePct,
                correctCount,
                totalItems: tier.items,
                isPassed,
                failedSubtopics,
                timeUsedSecs: tier.timeLimitSecs - timeLeft,
                isTimeOut
            });

            // Backend /api/exams/grade now persists telemetry, so refresh the
            // dashboard cache so Profile/Dashboard reflect the new attempts.
            try {
                const uid = auth.currentUser?.uid;
                if (uid) {
                    const profile = await getAnalyticsProfile(uid);
                    if (profile?.data?.profile) {
                        setStats({
                            ...stats,
                            irt: { theta: profile.data.profile.thetaRating || 0 },
                            globalStreak: profile.data.profile.globalStreak || 0,
                            totalAnswered: (stats?.totalAnswered || 0) + tier.items,
                            ...(isPassed
                                ? (stats.gauntletLevel === parseInt(level)
                                    ? { gauntletLevel: parseInt(level) + 1 }
                                    : {})
                                : { gauntletLockUntil: Date.now() + (12 * 60 * 60 * 1000) }),
                        });
                    } else if (isPassed && stats.gauntletLevel === parseInt(level)) {
                        setStats({ ...stats, gauntletLevel: parseInt(level) + 1 });
                    } else if (!isPassed) {
                        setStats({ ...stats, gauntletLockUntil: Date.now() + (12 * 60 * 60 * 1000) });
                    }
                }
            } catch (refreshErr) {
                console.warn('post-gauntlet analytics refresh failed', refreshErr);
            }

            setStatus('diagnostics');
        } catch (err) {
            console.error("Gauntlet grading error:", err);
            toast.error("Failed to grade gauntlet. Please try again.");
            setStatus('error');
        } finally {
            try { await endStoreSession(); } catch (_) {}
        }
    };

    return {
        status, questions, answers, confidences, timeLeft, diagnostics,
        handleAnswer, handleConfidence, submitExam
    };
};
