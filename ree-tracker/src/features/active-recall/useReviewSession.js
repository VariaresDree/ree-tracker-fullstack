// src/features/active-recall/useReviewSession.js
import { useState, useRef, useEffect } from 'react';
import { fetchVaultQuestions, getAnalyticsProfile, updateQuestionInBank, apiRequest, fetchSmartDrillQuestions, fetchSrsDue, saveQuestionToBank, saveBookmark, removeBookmark, fetchBookmarks } from '../../services/dbQueries';
import { generateQuestionsAI } from '../../services/geminiApi';
import { useAiExplanation } from '../quiz/useAiExplanation';
import { useStore } from '../../store/useStore';
import { normalizeMicroTopics } from '../../services/analyticsSync';
import { useEngineActionsSlice } from '../../store/slices';
import { stratifiedSample } from '../../utils/shuffle';
import { normalizeSubject } from '@ree/shared';
import { buildSessionSummary } from './buildSessionSummary';
import toast from 'react-hot-toast';

export const useReviewSession = (currentUser, isOnline) => {
    // Narrow, stable-reference slice on the per-answer hot path (avoids the
    // whole-store re-render storm); useStore.getState() below stays imperative.
    const { dynamicTOS, setStats, recordAttempt, queuePendingWrite, startSession: startStoreSession, endSession: endStoreSession } = useEngineActionsSlice();
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
    });

    const [elapsedTime, setElapsedTime] = useState(0);
    const [bookmarks, setBookmarks] = useState(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    // AI explanations, keyed by question (features/quiz/useAiExplanation).
    const ai = useAiExplanation(currentUser?.uid);
    // The finished session's summary (buildSessionSummary.js), shown until the
    // learner starts another session or dismisses it. Null after a session
    // with no answers.
    const [lastSummary, setLastSummary] = useState(null);
    // The config the running session started with, presets' targets included,
    // so "Practise again" repeats exactly that session.
    const sessionConfigRef = useRef(null);

    // startTimeRef is the PER-QUESTION anchor: loadNextQuestion resets it on
    // every item so each answer gets its own timeSpentMs. sessionStartRef is
    // the whole-session anchor and is set once, at session start.
    //
    // endSession used to derive durationSecs from startTimeRef, i.e. from the
    // last question's dwell time — so a 25-minute, 20-question review reported
    // roughly 40 seconds, and every StudySession row in the database (and the
    // readiness consistency term built on them) was wrong by an order of
    // magnitude.
    const startTimeRef = useRef(Date.now());
    const sessionStartRef = useRef(Date.now());
    const telemetryBatchRef = useRef([]);
    // Set while endSession runs, so leaving mid-save doesn't record it twice.
    const endingRef = useRef(false);

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

    // `overrides` lets preset cards start a session in one click without a
    // setConfig round-trip; the form state is synced so the custom panel
    // reflects what actually ran.
    const startSession = async (overrides = null) => {
        // A preset's own question list (itemsPreset) never lands in the form
        // config: it would ride along into every later session.
        // eslint-disable-next-line no-unused-vars
        const { items: _presetItems, ...cfg } = overrides ? { ...config, ...overrides } : config;
        // A drill's target comes ONLY from the launching preset (a Today
        // action, a heatmap tile). Read from `cfg` it would survive into the
        // next untargeted weak-spot drill, since overrides are merged into the
        // persistent form config.
        const target = overrides || {};
        if (overrides) setConfig(cfg);
        setSession(prev => ({ ...prev, loading: true }));
        try {
            let freshData = [];

            // 1. Data Ingestion (DEEP POOL FETCH STRATEGY)
            if (cfg.source === 'items') {
                // A fixed set handed over by the preset (a past sitting's
                // misses). It needs no request, so it runs offline too.
                freshData = Array.isArray(target.items) ? target.items.filter((q) => q?.id && q.text) : [];
                if (freshData.length === 0) throw new Error("There's nothing to practise from that sitting.");
            } else if (cfg.source === 'srs-due') {
                if (!isOnline) throw new Error("The review queue needs a connection.");
                freshData = await fetchSrsDue(cfg.count || 20, cfg.subject);
                if (!freshData || freshData.length === 0) throw new Error("Nothing is due for review right now.");
            } else if (cfg.source === 'smart-drill') {
                if (!isOnline) throw new Error("Smart drill needs a connection.");
                const drillResult = await fetchSmartDrillQuestions(cfg.count || 10, {
                    topicId: target.drillTopicId, topic: target.drillTopic, subject: target.drillSubject, mode: target.drillMode,
                });
                freshData = drillResult.items || [];
                if (freshData.length === 0) throw new Error("Answer a few questions first — the drill targets your weakest topics.");
            } else if (cfg.source === 'bookmarks') {
                if (!isOnline) throw new Error("Your bookmarks need a connection.");
                const saved = await fetchBookmarks({ limit: 100 });
                if (!saved || saved.length === 0) {
                    throw new Error("No bookmarks yet. Tap the bookmark icon on a question to save it for later.");
                }
                // Mark them as bookmarked, so the icon shows filled and a tap
                // removes one instead of adding it again.
                setBookmarks(new Set(saved.map((q) => q.id)));
                const subject = cfg.subject && cfg.subject !== 'All' ? normalizeSubject(cfg.subject) : null;
                freshData = saved.filter((q) =>
                    (!subject || normalizeSubject(q.subject) === subject)
                    && (cfg.subtopic === 'All' || !cfg.subtopic || q.subtopic === cfg.subtopic));
                if (freshData.length === 0) throw new Error("None of your bookmarks match this subject or topic.");
            } else if (cfg.source === 'ai') {
                if (!isOnline) throw new Error("The AI generator needs a connection.");
                // Random topic within the subject (not always the first) so
                // consecutive AI sessions vary.
                const topics = safeTOS[cfg.subject] || [];
                const targetTopic = cfg.studyMode === 'subtopic'
                    ? cfg.subtopic
                    : (topics[Math.floor(Math.random() * topics.length)] || 'General');
                freshData = await generateQuestionsAI(cfg.subject, targetTopic, false);

                // AI questions have no DB id, so their attempts were silently
                // dropped by both the client (recordAttempt requires an id) and
                // the server (FK filter) — the classic "10-item session shows
                // 8" undercount. Persist them first to mint real ids.
                if (Array.isArray(freshData) && freshData.length > 0) {
                    try {
                        freshData = await Promise.all(freshData.map(async (q) => {
                            if (q.id) return q;
                            const newId = await saveQuestionToBank({ ...q, source: 'ai' });
                            return { ...q, id: newId };
                        }));
                    } catch (persistErr) {
                        console.warn('AI question persist failed:', persistErr);
                        toast("Couldn't save the AI questions — this session won't count toward your progress.");
                    }
                }
            } else {
                // 🚀 FIXED: Fetch up to 1000 questions to create a massive Supabase randomization pool
                const subTarget = cfg.subtopic === 'All' ? 'All' : cfg.subtopic;
                freshData = await fetchVaultQuestions(cfg.subject, subTarget, 1000);
            }

            if (!freshData || freshData.length === 0) throw new Error("No questions match these settings yet.");

            // 2. 🚀 STRICT COGNITIVE FOCUS FILTERING
            let filteredData = freshData;
            if (cfg.cognitiveFocus === 'conceptual') {
                filteredData = freshData.filter(q => q.type !== 'calculation');
            } else if (cfg.cognitiveFocus === 'calculation') {
                filteredData = freshData.filter(q => q.type === 'calculation');
            }

            if (filteredData.length === 0) {
                throw new Error(`No ${cfg.cognitiveFocus} questions found for this topic. Try the mixed focus or another topic.`);
            }

            // 3. 🚀 TRUE RANDOMIZATION: stratified sample across subtopics so a
            // subject-wide ("All") session spans the whole subject instead of
            // collapsing onto the dominant subtopic (Math→Algebra, ESAS→Chemistry).
            // For a pinned subtopic this is just a uniform Fisher-Yates pick.
            const finalSessionQuestions = stratifiedSample(filteredData, cfg.count || 20);

            telemetryBatchRef.current = [];
            endingRef.current = false;
            startTimeRef.current = Date.now();
            sessionStartRef.current = Date.now();
            setElapsedTime(0);
            sessionConfigRef.current = cfg.source === 'smart-drill'
                ? { ...cfg, drillTopicId: target.drillTopicId ?? null, drillTopic: target.drillTopic ?? null, drillSubject: target.drillSubject ?? null, drillMode: target.drillMode ?? null }
                : cfg.source === 'items'
                    // "Practise again" repeats the same set.
                    ? { ...cfg, items: freshData }
                    : cfg;
            setLastSummary(null);

            // Bracket the session in the store so the per-answer events know
            // which ExamSession id, mode, and target subject to attach. The
            // backend uses these to auto-upsert the ExamSession row.
            startStoreSession({ mode: 'ACTIVE_REVIEW', subject: cfg.subject });

            setSession({
                isActive: true, loading: false, isFinished: false,
                questions: finalSessionQuestions, currentIndex: 0,
                isAnswered: false, isFlipped: false,
                confidence: null, selectedOption: null, wrongSelection: null,
                totalAnswered: 0, correctHits: 0,
            });
        } catch (error) {
            toast.error(error.message);
            setSession(prev => ({ ...prev, loading: false }));
        }
    };

    const handleAnswerSelection = (option) => {
        if (session.isAnswered) return;
        if (!session.confidence) return toast.error("Pick a confidence level first.");

        const currentQ = session.questions[session.currentIndex];
        const isCorrect = option === currentQ.answer;
        // Millisecond-accurate: read the wall clock directly instead of the
        // 1s-throttled `elapsedTime` state, which recorded 0 ms for any answer
        // locked in under a second and deflated the per-question time averages.
        const timeSpentMs = Math.max(0, Date.now() - startTimeRef.current);

        setSession(prev => ({
            ...prev, isAnswered: true, selectedOption: option,
            wrongSelection: !isCorrect ? option : null,
            totalAnswered: prev.totalAnswered + 1, correctHits: prev.correctHits + (isCorrect ? 1 : 0)
        }));

        // Event-driven: stage + optimistic UI + debounced server sync. The
        // dashboard counters tick immediately; one HTTP request flushes after
        // the user pauses for ~1.5s instead of one per question.
        recordAttempt({
            questionId: currentQ.id,
            subject: currentQ.subject,
            subtopic: currentQ.subtopic,
            isCorrect,
            confidenceLevel: session.confidence,
            timeSpentMs,
            // Send the chosen option so the server re-grades authoritatively.
            userAnswer: option,
        });

        // Keep the in-memory ref as a backup for the session-end study-session
        // POST (which records aggregate counts, not per-attempt rows).
        telemetryBatchRef.current.push({
            questionId: currentQ.id, subject: currentQ.subject, subtopic: currentQ.subtopic,
            isCorrect, confidenceLevel: session.confidence, timeSpentMs,
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

        // Millisecond-accurate: read the wall clock directly instead of the
        // 1s-throttled `elapsedTime` state, which recorded 0 ms for any answer
        // locked in under a second and deflated the per-question time averages.
        const timeSpentMs = Math.max(0, Date.now() - startTimeRef.current);

        setSession(prev => ({
            ...prev, isAnswered: true,
            totalAnswered: prev.totalAnswered + 1, correctHits: prev.correctHits + (isCorrect ? 1 : 0)
        }));

        // Same event-driven path as MCQ — flashcard rating maps to a self-
        // reported confidence + correctness pair, then immediately ticks the
        // dashboard and schedules a debounced backend sync.
        recordAttempt({
            questionId: currentQ.id,
            subject: currentQ.subject,
            subtopic: currentQ.subtopic,
            isCorrect,
            confidenceLevel: mappedConfidence,
            timeSpentMs,
        });

        telemetryBatchRef.current.push({
            questionId: currentQ.id, subject: currentQ.subject, subtopic: currentQ.subtopic,
            isCorrect, confidenceLevel: mappedConfidence, timeSpentMs,
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
            }));
        }
    };

    const endSession = async () => {
        if (isSubmitting) return;
        endingRef.current = true;
        setIsSubmitting(true);

        const hasBatch = telemetryBatchRef.current.length > 0;

        if (!hasBatch) {
            // Nothing answered — just tear down. Still call endStoreSession to
            // clear the session pointer so the next start gets a fresh id.
            await endStoreSession();
            setIsSubmitting(false);
            setLastSummary(null);
            setSession(prev => ({ ...prev, isActive: false, isFinished: true, questions: [] }));
            return;
        }

        // Summarize from what was recorded, before the batch is cleared below.
        const recap = buildSessionSummary(
            telemetryBatchRef.current,
            session.questions,
            (Date.now() - sessionStartRef.current) / 1000,
        );
        setLastSummary(recap ? { ...recap, config: sessionConfigRef.current } : null);

        const toastId = toast.loading("Saving your session…");

        try {
            // endStoreSession() flushes any pending debounced batch THEN clears
            // the session pointer. If the user took the questions in a tight
            // burst the queue may already be empty (the debounce drained it);
            // either way this is now the single point of session teardown.
            await endStoreSession();

            const totalDuration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
            const summary = {
                mode: config.sessionMode,
                subject: config.subject,
                subtopic: config.subtopic === 'All' ? null : config.subtopic,
                totalQuestions: session.totalAnswered,
                correctAnswers: session.correctHits,
                durationSecs: totalDuration,
            };

            if (isOnline) {
                try {
                    await apiRequest('/api/analytics/study-sessions', 'POST', summary);
                } catch {
                    // Backend went unreachable mid-flush — defer the summary instead
                    // of dropping it, so the session history stays complete.
                    queuePendingWrite('/api/analytics/study-sessions', 'POST', summary);
                }

                // Rehydrate from the canonical backend so any drift between
                // optimistic local stats and the server state is reconciled.
                // Merge the profile the same way the simulator does — setStats
                // is a FULL replace, so passing the raw { profile, activityCalendar,
                // microTopics, matrix } wrapper here used to overwrite `stats`
                // with the wrong shape and corrupt local counters.
                const freshProfile = await getAnalyticsProfile(currentUser.uid);
                if (freshProfile?.data?.profile) {
                    setStats({
                        ...useStore.getState().stats,
                        ...freshProfile.data.profile,
                        activityCalendar: freshProfile.data.activityCalendar,
                        // See useSimulatorEngine: the raw server shape uses
                        // different field names and composite keys, so writing it
                        // straight into stats zeroes the dashboard KPIs and the
                        // heatmap until the next syncDashboardStats.
                        microTopics: normalizeMicroTopics(freshProfile.data.microTopics, useStore.getState().dynamicTOS),
                        matrix: freshProfile.data.matrix,
                    });
                }
                toast.success("Session saved.", { id: toastId });
            } else {
                // Per-attempt telemetry is already queued via recordAttempt; also
                // defer the aggregate session summary so nothing is lost offline.
                queuePendingWrite('/api/analytics/study-sessions', 'POST', summary);
                toast("Offline — progress will sync when you reconnect.", { id: toastId });
            }
            telemetryBatchRef.current = [];
        } catch (error) {
            const msg = error?.message === '[OFFLINE]'
                ? 'Backend unreachable — progress kept locally.'
                : `Sync failed: ${error?.message || 'unknown error'}`;
            toast.error(msg, { id: toastId });
        } finally {
            setIsSubmitting(false);
            setSession(prev => ({ ...prev, isActive: false, isFinished: true, questions: [] }));
        }
    };

    // PERSISTED bookmark toggle. This used to mutate only the local Set —
    // nothing ever reached /api/bookmarks, which is why the Materials hub's
    // Bookmark Vault stayed empty no matter how much you bookmarked here.
    // Optimistic Set update, rolled back if the API rejects.
    const toggleBookmark = async () => {
        const currentQ = session.questions[session.currentIndex];
        if (!currentQ?.id) return toast.error("Can't bookmark dynamic items.");
        const had = bookmarks.has(currentQ.id);
        const flip = (set, add) => {
            const next = new Set(set);
            if (add) next.add(currentQ.id); else next.delete(currentQ.id);
            return next;
        };
        setBookmarks(prev => flip(prev, !had));
        try {
            if (had) {
                await removeBookmark(currentUser?.uid, currentQ.id);
                toast.success("Bookmark removed.");
            } else {
                await saveBookmark(currentUser?.uid, { questionId: currentQ.id });
                toast.success("Bookmarked — find it in Library › Bookmarks");
            }
        } catch (err) {
            // 409 = the server already has it (e.g. bookmarked in another
            // session) — the optimistic "on" state is correct, keep it.
            if (!had && err?.status === 409) return;
            setBookmarks(prev => flip(prev, had));
            toast.error(err?.message === '[OFFLINE]'
                ? "Offline — bookmarking needs a connection."
                : "Bookmark failed.");
        }
    };

    const handleFlagQuestion = async () => {
        const currentQ = session.questions[session.currentIndex];
        if (!currentQ?.id) return toast.error("Cannot flag dynamic items.");
        try {
            await updateQuestionInBank(currentQ.id, { isFlagged: true });
            // By id: the learner may have moved on while the request ran, and
            // writing to the current index flagged the next question instead.
            setSession(prev => ({
                ...prev,
                questions: prev.questions.map(q => (q.id === currentQ.id ? { ...q, isFlagged: true } : q)),
            }));
            toast.success("Thanks — we'll review this question.");
        } catch { toast.error("Flag failed."); }
    };

    // AI explanations are kept per question (useAiExplanation), so moving on
    // while one loads can no longer attach it to the next question.
    const explainQuestion = (question, opts) => ai.explain(question, opts);

    // Leaving Practice mid-session (another tab, Back) used to drop the
    // session: the answers were already queued, but the study-session record
    // and the store's session pointer were left behind. Queue the record
    // durably and close the session; there is no screen left to show a summary.
    const leaveRef = useRef(null);
    useEffect(() => {
        leaveRef.current = () => {
            if (endingRef.current || !session.isActive || telemetryBatchRef.current.length === 0) return;
            const batch = telemetryBatchRef.current;
            telemetryBatchRef.current = [];
            queuePendingWrite('/api/analytics/study-sessions', 'POST', {
                mode: config.sessionMode,
                subject: config.subject,
                subtopic: config.subtopic === 'All' ? null : config.subtopic,
                totalQuestions: batch.length,
                correctAnswers: batch.filter(a => a.isCorrect).length,
                durationSecs: Math.floor((Date.now() - sessionStartRef.current) / 1000),
            });
            endStoreSession();
        };
    });
    useEffect(() => () => leaveRef.current?.(), []);

    const activeQ = session.questions[session.currentIndex];

    return {
        aiText: activeQ ? ai.textFor(activeQ) : null,
        aiLoading: activeQ ? ai.isLoading(activeQ) : false,
        config, setConfig, session, setSession, elapsedTime, bookmarks,
        startSession, endSession, loadNextQuestion, 
        handleAnswerSelection, handleFlashcardReveal, handleFlashcardRating,
        toggleBookmark, handleFlagQuestion, explainQuestion, safeTOS, isSubmitting,
        lastSummary, clearSummary: () => setLastSummary(null),
    };
};