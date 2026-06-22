import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { apiRequest } from '../../services/dbQueries';
import toast from 'react-hot-toast';

const GAUNTLET_TIERS = {
  1: { reqQs: 200, items: 50, timeLimitSecs: 75 * 60 },
  2: { reqQs: 500, items: 75, timeLimitSecs: 110 * 60 },
  3: { reqQs: 1000, items: 100, timeLimitSecs: 150 * 60 },
  4: { reqQs: 2000, items: 100, timeLimitSecs: 120 * 60 }
};

export const useGauntletEngine = (level) => {
    const { stats, setStats } = useStore();
    const [status, setStatus] = useState('loading');
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [diagnostics, setDiagnostics] = useState(null);

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
        setAnswers(prev => ({ ...prev, [qIndex]: selectedOpt }));
    };

    const submitExam = async (isTimeOut = false) => {
        setStatus('loading');
        const tier = GAUNTLET_TIERS[level];

        try {
            const gradePayload = questions.map((q, idx) => ({
                questionId: q.id,
                userAnswer: answers[idx] || ''
            }));

            const gradeResult = await apiRequest('/api/exams/grade', 'POST', { answers: gradePayload });
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

            if (isPassed) {
                if (stats.gauntletLevel === parseInt(level)) {
                    setStats({ ...stats, gauntletLevel: parseInt(level) + 1 });
                }
            } else {
                setStats({ ...stats, gauntletLockUntil: Date.now() + (12 * 60 * 60 * 1000) });
            }

            setStatus('diagnostics');
        } catch (err) {
            console.error("Gauntlet grading error:", err);
            toast.error("Failed to grade gauntlet. Please try again.");
            setStatus('error');
        }
    };

    return {
        status, questions, answers, timeLeft, diagnostics,
        handleAnswer, submitExam
    };
};
