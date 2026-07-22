import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useEngineActionsSlice } from '../../store/slices';
import { apiRequest, getAnalyticsProfile, fetchVaultQuestions } from '../../services/dbQueries';
import { auth } from '../../config/firebaseDb';
import { getGauntletTier, isSubjectTier, SUBJECT_UNLOCK_LEVEL } from '../../config/examStandards';
import toast from 'react-hot-toast';

export const useGauntletEngine = (level) => {
    // Actions come from the stable-reference engine slice; `stats` is the one
    // live value the submit closure reads, so subscribe to just it (not the
    // whole store, which re-rendered on every syncQueue/syncStatus flip).
    const { setStats, startSession: startStoreSession, endSession: endStoreSession } = useEngineActionsSlice();
    const stats = useStore((s) => s.stats);
    const navigate = useNavigate();
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
    // Absolute end-time anchor. The countdown reads the wall clock against this
    // instead of blindly decrementing, so background-tab setInterval throttling
    // can't pause a timed exam and per-tick drift can't accumulate (matches the
    // Board Simulator / Active Review engines).
    const endTimeRef = useRef(null);

    useEffect(() => {
        const bootGauntlet = async () => {
            const tier = getGauntletTier(level);
            if (!tier) {
                setStatus('error');
                return;
            }
            const subjectTier = isSubjectTier(tier);

            // Read the gate values from the store at boot time (getState), NOT
            // from the closed-over `stats` — submitExam calls setStats mid-run,
            // and depending on `stats` here re-ran the whole boot effect
            // (refetching questions, resetting the timer) during the attempt.
            const s = useStore.getState().stats || {};
            const lockUntil = s.gauntletLockUntil;
            const totalAnswered = s.totalAnswered || 0;
            const currentLevel = s.gauntletLevel || 1;

            if (lockUntil && lockUntil > Date.now()) {
                toast.error("Security Breach: System is currently on a cooldown lock.");
                navigate('/arena');
                return;
            }

            // Subject board exams (levels 5-7) unlock only after the blended
            // progression is cleared; blended tiers keep the answered-count +
            // sequential-level gate.
            const gateFailed = subjectTier
                ? currentLevel < SUBJECT_UNLOCK_LEVEL
                : (totalAnswered < tier.reqQs || currentLevel < parseInt(level));
            if (gateFailed) {
                toast.error(subjectTier
                    ? "Locked: clear the blended Gauntlet tiers first to unlock the subject boards."
                    : "Security Breach: You lack the required telemetry to enter this sector.");
                navigate('/arena');
                return;
            }

            setTimeLeft(tier.timeLimitSecs);
            endTimeRef.current = Date.now() + tier.timeLimitSecs * 1000;

            try {
                // Subject tiers pull a subject-filtered pool (like the Board
                // Simulator's PRC subject mode); blended tiers pull across all
                // subjects from the exam bank.
                const allQs = subjectTier
                    ? (await fetchVaultQuestions(tier.subject, 'All', tier.items * 2) || []).filter(q => !q.isFlagged)
                    : ((await apiRequest(`/api/exams?limit=${tier.items * 2}`))?.items || []).filter(q => !q.isFlagged);

                if (allQs.length < tier.items) {
                    toast.error("Insufficient bank questions to construct this Gauntlet.");
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
                startStoreSession({ mode: 'GAUNTLET', subject: tier.subject });
                setStatus('active');
            } catch (err) {
                console.error(err);
                setStatus('error');
            }
        };
        bootGauntlet();
        // Boot ONCE per level — not on every stats change (see getState above).
    }, [level, navigate]);

    useEffect(() => {
        if (status !== 'active') return;
        if (timeLeft <= 0) {
            submitExam(true);
            return;
        }
        // Derive remaining time from the absolute end-time each tick — on return
        // from a throttled/backgrounded tab this jumps straight to the correct
        // value (and hits 0 → auto-submit) instead of resuming a stale count.
        const timer = setInterval(() => {
            const left = endTimeRef.current
                ? Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000))
                : 0;
            setTimeLeft(left);
        }, 1000);
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
        const tier = getGauntletTier(level);
        if (!tier) { setStatus('error'); return; }

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

            // Key results by questionId — the server returns each result WITH
            // its questionId and doesn't promise input order, so the old
            // results[idx]→questions[idx] mapping could mis-attribute a
            // correct/wrong verdict to the wrong item.
            const resultByQ = {};
            results.forEach(r => { if (r.questionId) resultByQ[r.questionId] = r; });

            let correctCount = 0;
            const failedSubtopics = {};
            // Per-question review rows (missed items) for the diagnostics screen —
            // previously the screen was passed questions/answers but rendered no
            // answer key, so a failed gauntlet showed no way to learn from it.
            const review = [];

            questions.forEach((q, idx) => {
                const r = resultByQ[q.id];
                const isCorrect = !!r?.isCorrect;
                if (isCorrect) {
                    correctCount++;
                } else {
                    const subtopic = q.subtopic || 'Unknown';
                    failedSubtopics[subtopic] = (failedSubtopics[subtopic] || 0) + 1;
                    review.push({
                        questionId: q.id,
                        text: q.text || q.question,
                        subtopic,
                        userAnswer: answers[idx] || null,
                        correctAnswer: r?.correctAnswer ?? q.answer ?? null,
                        explanation: r?.explanation || q.fixedExplanation || null,
                    });
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
                review,
                timeUsedSecs: tier.timeLimitSecs - timeLeft,
                isTimeOut
            });

            // Backend /api/exams/grade now persists telemetry, so refresh the
            // dashboard cache so Profile/Dashboard reflect the new attempts.
            try {
                const uid = auth.currentUser?.uid;
                if (uid) {
                    const profile = await getAnalyticsProfile(uid);
                    // Only the BLENDED ladder advances gauntletLevel. Subject
                    // boards (5-7) are parallel, re-takeable endgame exams — a
                    // pass just shows the diagnostics, it doesn't bump the level.
                    const advancesLevel = !isSubjectTier(tier) && stats.gauntletLevel === parseInt(level);
                    const LOCK_MS = 12 * 60 * 60 * 1000;
                    if (profile?.data?.profile) {
                        // FULL server replace — mirror Active Review / Board Sim so
                        // the calendar + microTopics + totals all move together. The
                        // old partial update bumped totalAnswered by tier.items but
                        // left activityCalendar stale, so the Dashboard KPI diverged
                        // from the Consistency Matrix after every Gauntlet run.
                        setStats({
                            ...stats,
                            ...profile.data.profile,
                            irt: { theta: profile.data.profile.thetaRating || 0 },
                            activityCalendar: profile.data.activityCalendar,
                            microTopics: profile.data.microTopics,
                            matrix: profile.data.matrix,
                            ...(isPassed
                                ? (advancesLevel ? { gauntletLevel: parseInt(level) + 1 } : {})
                                : { gauntletLockUntil: Date.now() + LOCK_MS }),
                        });
                    } else if (isPassed && advancesLevel) {
                        setStats({ ...stats, gauntletLevel: parseInt(level) + 1 });
                    } else if (!isPassed) {
                        setStats({ ...stats, gauntletLockUntil: Date.now() + LOCK_MS });
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
