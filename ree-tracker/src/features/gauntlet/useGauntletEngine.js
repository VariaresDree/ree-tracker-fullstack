// src/features/gauntlet/useGauntletEngine.js
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore'; // Removed query/where imports
import { db } from '../../config/firebaseDb';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

const GAUNTLET_TIERS = {
  1: { reqQs: 200, items: 50, timeLimitSecs: 75 * 60 },
  2: { reqQs: 500, items: 75, timeLimitSecs: 110 * 60 },
  3: { reqQs: 1000, items: 100, timeLimitSecs: 150 * 60 },
  4: { reqQs: 2000, items: 100, timeLimitSecs: 120 * 60 }
};

export const useGauntletEngine = (level) => {
    const { stats, setStats } = useStore();
    const [status, setStatus] = useState('loading'); // 'loading' | 'active' | 'diagnostics'
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [diagnostics, setDiagnostics] = useState(null);

    // Boot Sequence: Randomly fetch questions from Global Bank
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

            // 1. Check Cooldown Bypass
            if (lockUntil && lockUntil > Date.now()) {
                toast.error("Security Breach: System is currently on a cooldown lock.");
                window.location.href = '/arena';
                return;
            }

            // 2. Check Eligibility Bypass
            if (totalAnswered < tier.reqQs || currentLevel < parseInt(level)) {
                toast.error("Security Breach: You lack the required telemetry to enter this sector.");
                window.location.href = '/arena';
                return;
            }

            setTimeLeft(tier.timeLimitSecs);

            try {
                // FIXED: Fetch raw collection to bypass Firebase index exclusion on legacy items
                const snap = await getDocs(collection(db, "questions"));
                
                // Filter out flagged questions securely on the client
                const allQs = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(q => q.isFlagged !== true); 

                if (allQs.length < tier.items) {
                    toast.error("Insufficient global bank questions to construct the Gauntlet.");
                    return setStatus('error');
                }

                // Shuffle randomly and slice exact amount
                const shuffled = allQs.sort(() => 0.5 - Math.random());
                const selectedQs = shuffled.slice(0, tier.items).map(q => ({
                    ...q,
                    // Scramble options
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

    // Brutal Timer Logic
    useEffect(() => {
        if (status !== 'active') return;
        if (timeLeft <= 0) {
            submitExam(true); // Auto-submit on zero
            return;
        }
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [status, timeLeft]);

    const handleAnswer = (qIndex, selectedOpt) => {
        setAnswers(prev => ({ ...prev, [qIndex]: selectedOpt }));
    };

    const submitExam = (isTimeOut = false) => {
        setStatus('loading');
        const tier = GAUNTLET_TIERS[level];
        let correctCount = 0;
        const failedSubtopics = {};

        questions.forEach((q, idx) => {
            const userAns = answers[idx];
            if (userAns === q.answer) {
                correctCount++;
            } else {
                // Tally weak subtopics for the Prescription Plan
                if (!failedSubtopics[q.subtopic]) failedSubtopics[q.subtopic] = 0;
                failedSubtopics[q.subtopic]++;
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

        // --- POST-ACTION REPORT LOGIC ---
        if (isPassed) {
            // Level Up
            if (stats.gauntletLevel === parseInt(level)) {
                setStats({ ...stats, gauntletLevel: parseInt(level) + 1 });
            }
        } else {
            // Initiate 12-Hour Cooldown Lock
            setStats({ ...stats, gauntletLockUntil: Date.now() + (12 * 60 * 60 * 1000) });
        }

        setStatus('diagnostics');
    };

    return {
        status, questions, answers, timeLeft, diagnostics,
        handleAnswer, submitExam
    };
};