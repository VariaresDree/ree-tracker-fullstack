import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useEngineActionsSlice } from '../../store/slices';
import {
    apiRequest, getAnalyticsProfile, fetchVaultQuestions,
    saveBookmark, removeBookmark, updateQuestionInBank,
} from '../../services/dbQueries';
import { auth } from '../../config/firebaseDb';
import { getGauntletTier, isSubjectTier, SUBJECT_UNLOCK_LEVEL } from '../../config/examStandards';
import toast from 'react-hot-toast';

// Resume-cache key, scoped by `level` inside the stored payload (mirrors the
// Board Simulator's ree_sim_cache pattern in useSimulatorEngine.js). A single
// key (not one per level) is fine — only one Gauntlet run is ever in flight
// on a device at a time, and a cache for a DIFFERENT level than the one being
// entered is simply treated as stale and discarded.
const CACHE_KEY = 'ree_gauntlet_cache';

export const useGauntletEngine = (level) => {
    // Actions come from the stable-reference engine slice; `stats` is the one
    // live value the submit closure reads, so subscribe to just it (not the
    // whole store, which re-rendered on every syncQueue/syncStatus flip).
    const { setStats, startSession: startStoreSession, endSession: endStoreSession } = useEngineActionsSlice();
    const stats = useStore((s) => s.stats);
    const navigate = useNavigate();
    // 'loading' | 'resume' | 'active' | 'diagnostics' | 'pending' | 'error'
    //   'resume'      — a matching-level cache was found on entry; waits for
    //                    the user to choose Resume vs. start fresh instead of
    //                    auto-fetching a brand new set of questions.
    //   'pending'     — submitted while offline/circuit-broken: queued in the
    //                    durable outbox, no invented score. See submitExam.
    const [status, setStatus] = useState('loading');
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [confidences, setConfidences] = useState({});
    // Moved in from Gauntlet.jsx (was component-local useState) so the resume
    // draft — which must restore the exact item the user left off on — can
    // persist and restore it from inside this hook.
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [diagnostics, setDiagnostics] = useState(null);
    const [bookmarks, setBookmarks] = useState(new Set());
    const [flags, setFlags] = useState(new Set());
    const [hasSavedSession, setHasSavedSession] = useState(false);

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

    // Refs mirror the mutable pieces of exam state so the autosave draft never
    // closes over a stale snapshot, regardless of which handler or effect
    // calls persistDraft — same pattern useSimulatorEngine.js uses.
    const questionsRef = useRef([]);
    const answersRef = useRef({});
    const confidencesRef = useRef({});
    const currentIndexRef = useRef(0);
    const bookmarksRef = useRef(new Set());
    const flagsRef = useRef(new Set());
    useEffect(() => { questionsRef.current = questions; }, [questions]);
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { confidencesRef.current = confidences; }, [confidences]);
    useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
    useEffect(() => { bookmarksRef.current = bookmarks; }, [bookmarks]);
    useEffect(() => { flagsRef.current = flags; }, [flags]);

    // Single source of truth for the resumable draft — persisted on every
    // answer, confidence pick, navigation, bookmark/flag toggle, and every 5s
    // of the countdown (see the timer effect below). Connection loss at ANY
    // of those points is non-destructive: the next visit to this level finds
    // the cache and offers Resume instead of silently losing the run.
    const persistDraft = () => {
        if (!questionsRef.current?.length) return;
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                level,
                questions: questionsRef.current,
                answers: answersRef.current,
                confidences: confidencesRef.current,
                currentIndex: currentIndexRef.current,
                endTime: endTimeRef.current,
                bookmarks: Array.from(bookmarksRef.current || []),
                flags: Array.from(flagsRef.current || []),
                timeSpentPerQuestion: timeSpentPerQuestionRef.current,
                savedAt: Date.now(),
            }));
        } catch (_) { /* quota / serialization — best effort */ }
    };

    const clearDraft = () => {
        try { localStorage.removeItem(CACHE_KEY); } catch (_) { /* ignore */ }
        setHasSavedSession(false);
    };

    // The original question-fetch + gating logic, now callable both on a
    // fresh boot (no matching cache) and when the user declines to resume.
    const fetchFreshGauntlet = async () => {
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

            timeSpentPerQuestionRef.current = {};
            questionsRef.current = selectedQs;
            answersRef.current = {};
            confidencesRef.current = {};
            currentIndexRef.current = 0;
            bookmarksRef.current = new Set();
            flagsRef.current = new Set();

            setQuestions(selectedQs);
            setAnswers({});
            setConfidences({});
            setCurrentIndex(0);
            setBookmarks(new Set());
            setFlags(new Set());

            // Bracket the session in the store. Gauntlet's /api/exams/grade
            // endpoint creates the ExamSession server-side, so the
            // frontend doesn't need to send the sessionId — but tracking
            // the session lifecycle in the store keeps the UI's sync
            // status and the dashboard's "session active" UX consistent.
            startStoreSession({ mode: 'GAUNTLET', subject: tier.subject });
            setStatus('active');
            persistDraft();
            setHasSavedSession(true);
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    };

    // Boot: a matching-level saved draft offers Resume instead of
    // auto-fetching a fresh set; anything else (no cache, a different level's
    // stale cache, a corrupt cache) falls straight through to a fresh fetch.
    useEffect(() => {
        let cached = null;
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) cached = JSON.parse(raw);
        } catch (_) {
            cached = null;
        }

        if (cached && String(cached.level) === String(level) && Array.isArray(cached.questions) && cached.questions.length > 0) {
            setHasSavedSession(true);
            setStatus('resume');
            return;
        }

        fetchFreshGauntlet();
        // Boot ONCE per level — not on every stats change (see getState above).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level, navigate]);

    // Restores a saved draft WITHOUT deleting the cache (unlike the Board
    // Simulator's resumeSimulation, which deletes on resume) — submitExam is
    // the sole owner of teardown here, so a crash between resume and the next
    // autosave tick can't lose the run again.
    const resumeGauntlet = () => {
        let raw;
        try { raw = localStorage.getItem(CACHE_KEY); } catch (_) { raw = null; }
        if (!raw) { fetchFreshGauntlet(); return; }

        try {
            const parsed = JSON.parse(raw);
            const restoredQuestions = parsed.questions || [];
            if (restoredQuestions.length === 0) throw new Error('empty cache');

            const restoredAnswers = parsed.answers || {};
            const restoredConfidences = parsed.confidences || {};
            const restoredIndex = parsed.currentIndex || 0;
            const restoredBookmarks = new Set(parsed.bookmarks || []);
            const restoredFlags = new Set(parsed.flags || []);

            timeSpentPerQuestionRef.current = parsed.timeSpentPerQuestion || {};
            questionsRef.current = restoredQuestions;
            answersRef.current = restoredAnswers;
            confidencesRef.current = restoredConfidences;
            currentIndexRef.current = restoredIndex;
            bookmarksRef.current = restoredBookmarks;
            flagsRef.current = restoredFlags;

            setQuestions(restoredQuestions);
            setAnswers(restoredAnswers);
            setConfidences(restoredConfidences);
            setCurrentIndex(restoredIndex);
            setBookmarks(restoredBookmarks);
            setFlags(restoredFlags);

            const remaining = parsed.endTime ? Math.max(0, Math.round((parsed.endTime - Date.now()) / 1000)) : 0;
            setTimeLeft(remaining);
            endTimeRef.current = parsed.endTime || (Date.now() + remaining * 1000);

            const tier = getGauntletTier(level);
            startStoreSession({ mode: 'GAUNTLET', subject: tier?.subject });
            lastAnswerTimestampRef.current = Date.now();
            // Land in 'active' even at remaining<=0 — the timer effect below
            // sees timeLeft<=0 on the next tick and auto-submits exactly like
            // a live run hitting zero, instead of a separate dead-end state.
            setStatus('active');
            toast.success('Gauntlet run restored. Resuming.');
        } catch (_) {
            clearDraft();
            toast.error('Saved run was corrupt; starting fresh.');
            fetchFreshGauntlet();
        }
    };

    // Discarding a stale/unwanted draft is a deliberate choice, not silent —
    // mirrors the "starting a new exam silently discards" guard pattern used
    // for the Board Simulator's config screen.
    const discardAndStartFresh = () => {
        clearDraft();
        fetchFreshGauntlet();
    };

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
            if (left > 0 && left % 5 === 0) persistDraft();
        }, 1000);
        return () => clearInterval(timer);
    }, [status, timeLeft]);

    // These three compute `next` synchronously OFF THE REF (not off React's
    // updater-callback `prev`, and not via a setState functional updater) and
    // write the ref BEFORE calling persistDraft(). setState's own updater
    // function only runs when React flushes the update — which happens AFTER
    // the current synchronous call finishes — so persistDraft() reading a ref
    // written inside a setState updater would see a stale value. Mirrors
    // useSimulatorEngine.js's handleSelectOption/handleIndexChange, which use
    // the exact same ref-first ordering for the same reason.
    const handleAnswer = (qIndex, selectedOpt) => {
        const now = Date.now();
        const delta = now - lastAnswerTimestampRef.current;
        lastAnswerTimestampRef.current = now;
        // Bucket the elapsed time on the question being answered.
        timeSpentPerQuestionRef.current[qIndex] = (timeSpentPerQuestionRef.current[qIndex] || 0) + Math.max(0, delta);
        const next = { ...answersRef.current, [qIndex]: selectedOpt };
        answersRef.current = next;
        setAnswers(next);
        persistDraft();
    };

    const handleConfidence = (qIndex, confLevel) => {
        const next = { ...confidencesRef.current, [qIndex]: confLevel };
        confidencesRef.current = next;
        setConfidences(next);
        persistDraft();
    };

    // Accepts either a plain index or a React-style updater function, so
    // Gauntlet.jsx's existing setCurrentIndex((c) => c - 1) call sites work
    // unchanged even though this now also persists the draft.
    const handleIndexChange = (updater) => {
        const prev = currentIndexRef.current;
        const next = typeof updater === 'function' ? updater(prev) : updater;
        currentIndexRef.current = next;
        setCurrentIndex(next);
        persistDraft();
    };

    // Full toggle (mirrors useSimulatorEngine.js's toggleBookmark exactly,
    // including the rollback-on-failure): the local Set drives the in-exam UI
    // and survives a reload via persistDraft; the server write is what
    // actually lands the item in Materials → Bookmark Vault.
    const toggleBookmark = (idx) => {
        const had = bookmarksRef.current.has(idx);
        const next = new Set(bookmarksRef.current);
        if (had) next.delete(idx); else next.add(idx);
        bookmarksRef.current = next;
        setBookmarks(next);
        persistDraft();

        const q = questionsRef.current?.[idx];
        if (!q?.id) { toast.success(had ? "Removed Bookmark." : "Bookmarked."); return; }
        const uid = auth.currentUser?.uid;
        const write = had ? removeBookmark(uid, q.id) : saveBookmark(uid, { questionId: q.id });
        write
            .then(() => toast.success(had ? "Removed Bookmark." : "Bookmarked — in Materials › Bookmark Vault."))
            .catch((err) => {
                if (!had && err?.status === 409) return; // already saved server-side
                const revert = new Set(bookmarksRef.current);
                if (had) revert.add(idx); else revert.delete(idx);
                bookmarksRef.current = revert;
                setBookmarks(revert);
                persistDraft();
                toast.error(err?.message === '[OFFLINE]' ? "Offline — bookmarking needs a connection." : "Bookmark failed.");
            });
    };

    // One-way "report anomaly" — mirrors useSimulatorEngine.js's
    // handleFlagQuestion. PATCH /questions/:id/flag is open to any
    // authenticated user (unlike the full-edit PUT, which is admin-gated),
    // but there's no unflag endpoint for non-admins, so this can't toggle off
    // once set — same constraint the Simulator already lives with.
    const toggleFlag = async (idx) => {
        if (flagsRef.current.has(idx)) return;
        const q = questionsRef.current?.[idx];
        if (!q?.id) { toast.error("Cannot flag dynamic items."); return; }
        try {
            await updateQuestionInBank(q.id, { isFlagged: true });
            const next = new Set(flagsRef.current);
            next.add(idx);
            flagsRef.current = next;
            setFlags(next);
            persistDraft();
            toast.success("Anomaly reported.");
        } catch (error) {
            toast.error("Flag failed.");
        }
    };

    const submitExam = async (isTimeOut = false) => {
        // Teardown FIRST — mirrors useSimulatorEngine.js's submitExam exactly:
        // once submission is initiated the run is considered in flight
        // (either grading live or queued in the durable outbox below), never
        // re-offered as a resumable in-progress attempt again. Connection
        // loss AFTER this point can no longer lose the run — it now lives in
        // the outbox, not this cache.
        clearDraft();

        setStatus('loading');
        const tier = getGauntletTier(level);
        if (!tier) { setStatus('error'); return; }

        // Per-question confidence (silent MED default when skipped under time
        // pressure) and elapsed time go into the grade payload so Gauntlet
        // attempts feed the same calibration/IRT analytics as Active Review
        // and Board Simulator.
        // Deterministic per-attempt id: a retried grade call (timeout,
        // double-tap, or a replay from the offline outbox) dedupes
        // server-side instead of double-counting.
        const gauntletSessionId = useStore.getState().currentSessionId || (crypto?.randomUUID?.() ?? String(Date.now()));
        const gradePayload = questionsRef.current.map((q, idx) => ({
            questionId: q.id,
            userAnswer: answersRef.current[idx] || '',
            confidenceLevel: confidencesRef.current[idx] || 'MED',
            timeSpentMs: timeSpentPerQuestionRef.current[idx] || 0,
            clientAttemptId: `${gauntletSessionId}:${q.id}`,
        }));

        // GET /api/exams deliberately excludes answer keys, so a run cannot
        // be graded on-device — never invent a score. Both the offline path
        // below and the [OFFLINE]/[TIMEOUT] catch further down route through
        // the SAME durable outbox every other deferred write uses
        // (useStore.queuePendingWrite), replayed by flushPendingWrites on
        // reconnect with the deterministic clientAttemptIds above making that
        // replay exactly-once no matter how long it sits queued.
        const deferToOutbox = (toastMsg) => {
            useStore.getState().queuePendingWrite('/api/exams/grade', 'POST', { answers: gradePayload, mode: 'GAUNTLET' });
            setDiagnostics({ pending: true, totalItems: tier.items, isTimeOut });
            setStatus('pending');
            toast(toastMsg, { icon: '📡' });
        };

        try {
            if (!navigator.onLine) {
                deferToOutbox('Offline — submitted; your score posts when you reconnect.');
                return;
            }

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

            questionsRef.current.forEach((q, idx) => {
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
                        userAnswer: answersRef.current[idx] || null,
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
            if (err?.message === '[OFFLINE]' || err?.message === '[TIMEOUT]') {
                // A network-class failure navigator.onLine didn't catch up front
                // (request timeout, circuit breaker tripping mid-flight) — still
                // must not discard the run.
                deferToOutbox('Connection dropped — submitted; your score posts when you reconnect.');
            } else {
                console.error("Gauntlet grading error:", err);
                toast.error("Failed to grade gauntlet. Please try again.");
                setStatus('error');
            }
        } finally {
            try { await endStoreSession(); } catch (_) {}
        }
    };

    return {
        status, questions, answers, confidences, timeLeft, diagnostics,
        currentIndex, setCurrentIndex: handleIndexChange,
        bookmarks, toggleBookmark, flags, toggleFlag,
        hasSavedSession, resumeGauntlet, discardAndStartFresh,
        handleAnswer, handleConfidence, submitExam
    };
};
