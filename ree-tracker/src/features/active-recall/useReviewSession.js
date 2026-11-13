// src/features/active-recall/useReviewSession.js
import { useState, useRef, useEffect } from 'react';
import { fetchVaultQuestions, getAnalyticsProfile, apiRequest, fetchSmartDrillQuestions, fetchSrsDue, fetchTodayLoop, fetchNextItem, saveQuestionToBank } from '../../services/dbQueries';
import { fetchBookmarks, removeBookmark, saveBookmark } from '../../services/bookmarks';
import { offlineDrill, offlineMix, unlessOffline } from './offlineSets';
import { generateQuestionsAI } from '../../services/geminiApi';
import { TOS as fallbackTOS } from '../../config/constants';
import { useAiExplanation } from '../quiz/useAiExplanation';
import { useStore } from '../../store/useStore';
import { normalizeMicroTopics } from '../../services/analyticsSync';
import { useEngineActionsSlice } from '../../store/slices';
import { stratifiedSample } from '../../utils/shuffle';
import { poolLimit } from '../board-simulator/poolFilters';
import { newSittingKey, normalizeSubject } from '@ree/shared';
import { presentOptions } from '../quiz/presentOptions';
import { reportQuestion } from '../../services/reportQuestion';
import { buildSessionSummary } from './buildSessionSummary';
import { clearSavedSession, loadSavedSession, saveSession } from './savedSession';
import { pickNextLocal } from './adaptiveFallback';
import toast from 'react-hot-toast';

// Restart the per-question clock. Called from Next (an event handler, never
// during render), so the wall-clock read lives out here.
const restartClock = (ref) => { ref.current = Date.now(); };


// A session with nothing to practise: said on the setup screen, not as an error.
const nothing = (message) => Object.assign(new Error(message), { empty: true });

export const useReviewSession = (currentUser, isOnline) => {
    // Narrow, stable-reference slice on the per-answer hot path (avoids the
    // whole-store re-render storm); useStore.getState() below stays imperative.
    const { dynamicTOS, setStats, recordAttempt, queuePendingWrite, startSession: startStoreSession, endSession: endStoreSession } = useEngineActionsSlice();
    // The built-in syllabus when the live one is empty (a new device offline,
    // or a taxonomy fetch that returned nothing): the subject and topic lists
    // were blank, and a session could not be set up at all.
    const safeTOS = dynamicTOS && Object.keys(dynamicTOS).length > 0 ? dynamicTOS : fallbackTOS;

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
        // How many questions the session runs to. The adaptive set grows
        // `questions` one at a time, so its length isn't the total.
        target: 0, fetchingNext: false,
    });

    // When the question on screen was shown (epoch ms). The ticking display is
    // <QuestionTimer>, which re-renders only itself: a per-second setState
    // here re-rendered the whole Practice page, question and KaTeX included.
    const [questionStartedAt, setQuestionStartedAt] = useState(0);
    const [bookmarks, setBookmarks] = useState(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    // AI explanations, keyed by question (features/quiz/useAiExplanation).
    const ai = useAiExplanation(currentUser?.uid);
    // The finished session's summary (buildSessionSummary.js), shown until the
    // learner starts another session or dismisses it. Null after a session
    // with no answers.
    const [lastSummary, setLastSummary] = useState(null);
    // An unfinished session from before, offered on the setup screen.
    const [savedSession, setSavedSession] = useState(loadSavedSession);
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
    // Both are set when a session starts (and the first on every question).
    const startTimeRef = useRef(0);
    const sessionStartRef = useRef(0);
    const telemetryBatchRef = useRef([]);
    // How much of that batch already went out in a study-session record, when
    // the learner left mid-session and came back.
    const recordedRef = useRef({ count: 0, correct: 0 });
    // Set while endSession runs, so leaving mid-save doesn't record it twice.
    const endingRef = useRef(false);
    // The adaptive set's state while one runs (null otherwise): its target,
    // subject, the next pick fetched ahead, and the on-device pool once the
    // server can't be reached.
    const adaptiveRef = useRef(null);
    // Formula cards rated in this session (Today's loop): counted for the
    // summary, never recorded as answers.
    const cardsRatedRef = useRef(0);
    // This session's key for the order of each question's choices: a fresh
    // one per session (Practise again included), so the key isn't where it
    // was last time, and the same all session long.
    const sittingKeyRef = useRef(null);

    // The adaptive set's next question: the server's pick (by ability
    // estimate, POST /api/exams/next-item), or the device's once a request
    // fails (adaptiveFallback.js, drawn from the bank or the offline pack).
    // Null when nothing unseen is left.
    const pickAdaptive = async (a, seenIds, history) => {
        if (!a.local) {
            try {
                const { item, ability } = await fetchNextItem({
                    subject: a.subject,
                    sessionAttempts: history.map((h) => ({ questionId: h.questionId, isCorrect: !!h.isCorrect })),
                    recentIds: seenIds,
                });
                if (Number.isFinite(ability?.theta)) a.start = ability.theta;
                // Only a question that carries its key: Practice grades here,
                // and one without (an older server) would be ungradable.
                if (item && item.text && item.answer && !seenIds.includes(item.id)) return item;
            } catch {
                if (!a.notedOffline) {
                    a.notedOffline = true;
                    toast("Couldn't reach the server: the rest of this set is picked on this device.");
                }
            }
            try {
                a.local = await fetchVaultQuestions(a.subject || 'All', 'All', 1000);
            } catch {
                a.local = [];
            }
        }
        return pickNextLocal(a.local, { seenIds, history, start: a.start });
    };

    // Fetch the adaptive set's next question while the learner reads this
    // one's solution, so Next doesn't wait on the network.
    const prefetchAdaptive = (questions) => {
        const a = adaptiveRef.current;
        if (!a || a.prefetch || telemetryBatchRef.current.length >= a.target) return;
        a.prefetch = pickAdaptive(a, questions.map((q) => q.id), [...telemetryBatchRef.current]).catch(() => null);
    };

    // A new question: restart its clock (an event handler's job, never render's).
    const restartQuestionClock = () => {
        restartClock(startTimeRef);
        setQuestionStartedAt(startTimeRef.current);
    };

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
        setSession(prev => ({ ...prev, loading: true, emptyMessage: null }));
        adaptiveRef.current = null;
        try {
            let freshData = [];
            // The cognitive focus, when one is set.
            const inFocus = (list) => (cfg.cognitiveFocus === 'conceptual' ? list.filter((q) => q.type !== 'calculation')
                : cfg.cognitiveFocus === 'calculation' ? list.filter((q) => q.type === 'calculation')
                    : list);
            let adaptive = null;
            let loopCardsDue = target.cardsDue ?? cfg.cardsDue ?? 0;
            let offlineNote = null;

            // 1. Data Ingestion (DEEP POOL FETCH STRATEGY)
            if (cfg.source === 'items') {
                // A fixed set handed over by the preset (a past sitting's
                // misses). It needs no request, so it runs offline too.
                freshData = Array.isArray(target.items) ? target.items.filter((q) => q?.id && q.text) : [];
                if (freshData.length === 0) throw nothing("There's nothing to practise from that sitting.");
            } else if (cfg.source === 'today-loop') {
                // Due reviews and open mistakes, already in the server's
                // board-weight order (kept as is below, not resampled).
                // A formula card (kind 'card') has no question text: it is
                // rated in place (LoopCardStep).
                const isStep = (q) => q?.id && (q.text || (q.kind === 'card' && q.card));
                if (Array.isArray(target.items) && target.items.length > 0) {
                    freshData = target.items.filter(isStep);
                } else {
                    const loop = isOnline ? await unlessOffline(fetchTodayLoop()) : null;
                    if (loop) {
                        freshData = (loop.items || []).filter(isStep);
                        loopCardsDue = loop.cardsDue || 0;
                    } else {
                        // Kept as it comes below, so it's sampled here.
                        const mix = await offlineMix('today’s loop');
                        freshData = stratifiedSample(mix.items, cfg.count || 25);
                        offlineNote = mix.note;
                    }
                }
                if (freshData.length === 0) throw nothing("Nothing is due and no mistakes are open. You're caught up.");
            } else if (cfg.source === 'adaptive') {
                // One question at a time, matched to the learner's level; the
                // rest arrive as they answer (prefetchAdaptive/loadNextQuestion).
                adaptive = { target: Math.max(1, cfg.count || 20), subject: cfg.subject, local: null, start: 0, prefetch: null };
                const first = await pickAdaptive(adaptive, [], []);
                if (!first) throw nothing("No questions match these settings yet.");
                freshData = [first];
            } else if (cfg.source === 'srs-due') {
                const due = isOnline ? await unlessOffline(fetchSrsDue(cfg.count || 20, cfg.subject)) : null;
                if (due) {
                    freshData = due;
                    if (freshData.length === 0) throw nothing("Nothing is due for review right now.");
                } else {
                    const mix = await offlineMix('your review queue');
                    freshData = mix.items;
                    offlineNote = mix.note;
                }
            } else if (cfg.source === 'smart-drill') {
                const drillResult = isOnline ? await unlessOffline(fetchSmartDrillQuestions(cfg.count || 10, {
                    topicId: target.drillTopicId, topic: target.drillTopic, subject: target.drillSubject, mode: target.drillMode,
                })) : null;
                if (drillResult) {
                    freshData = drillResult.items || [];
                    if (freshData.length === 0) throw nothing("Answer a few questions first — the drill targets your weakest topics.");
                } else {
                    const drill = await offlineDrill({ topic: target.drillTopic, subject: target.drillSubject, microTopics: useStore.getState().stats?.microTopics });
                    freshData = drill.items;
                    offlineNote = drill.note;
                }
            } else if (cfg.source === 'bookmarks') {
                const saved = await fetchBookmarks({ limit: 100 });
                if (!saved || saved.length === 0) {
                    throw nothing(isOnline
                        ? "No bookmarks yet. Tap the bookmark icon on a question to save it for later."
                        : "Your bookmarks aren’t on this device yet. Connect once to save a copy.");
                }
                // Mark them as bookmarked, so the icon shows filled and a tap
                // removes one instead of adding it again.
                setBookmarks(new Set(saved.map((q) => q.id)));
                const subject = cfg.subject && cfg.subject !== 'All' ? normalizeSubject(cfg.subject) : null;
                freshData = saved.filter((q) =>
                    (!subject || normalizeSubject(q.subject) === subject)
                    && (cfg.subtopic === 'All' || !cfg.subtopic || q.subtopic === cfg.subtopic));
                if (freshData.length === 0) throw nothing("None of your bookmarks match this subject or topic.");
            } else if (cfg.source === 'ai') {
                if (!isOnline) throw new Error("The AI generator needs a connection.");
                // "All subjects" picks one subject for this batch; it used to
                // ask the model for subject "All", topic "General". Then a
                // random topic within it (not always the first) so consecutive
                // AI sessions vary.
                const subjects = Object.keys(safeTOS).filter((k) => (safeTOS[k] || []).length > 0);
                const aiSubject = cfg.subject && cfg.subject !== 'All'
                    ? cfg.subject
                    : (subjects[Math.floor(Math.random() * subjects.length)] || 'EE');
                const topics = safeTOS[aiSubject] || [];
                const targetTopic = cfg.studyMode === 'subtopic' && cfg.subtopic && cfg.subtopic !== 'All'
                    ? cfg.subtopic
                    : (topics[Math.floor(Math.random() * topics.length)] || 'General');
                freshData = await generateQuestionsAI(aiSubject, targetTopic, false);

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
                // A pool a few times the session, already spread across topics
                // by the server (poolLimit); it was 1,000 questions to pick 20.
                // The old 1,000 only when the focus left too few of the first.
                const subTarget = cfg.subtopic === 'All' ? 'All' : cfg.subtopic;
                const want = cfg.count || 20;
                const focused = cfg.cognitiveFocus === 'conceptual' || cfg.cognitiveFocus === 'calculation';
                const limit = poolLimit(want, { filtered: focused, max: 1000 });
                const subtopicId = cfg.studyMode === 'subtopic' && cfg.subtopicId ? cfg.subtopicId : undefined;
                freshData = await fetchVaultQuestions(cfg.subject, subTarget, limit, 'random', { focus: focused ? cfg.cognitiveFocus : undefined, subtopicId });
                // The server draws the focus now. An older one ignores it, so a
                // pool with other kinds in it, and too few of this one, is
                // drawn again larger, as before. (The bank simply having fewer
                // than asked isn't helped by 1,000 rows, about 1.2 MB.)
                const mixed = (freshData || []).length > inFocus(freshData || []).length;
                if (limit < 1000 && mixed && inFocus(freshData || []).length < want) freshData = await fetchVaultQuestions(cfg.subject, subTarget, 1000, 'random', { subtopicId });
            }

            if (!freshData || freshData.length === 0) throw nothing("No questions match these settings yet.");

            // 2. 🚀 STRICT COGNITIVE FOCUS FILTERING
            const filteredData = inFocus(freshData);

            if (filteredData.length === 0) {
                throw nothing(`No ${cfg.cognitiveFocus} questions found for this topic. Try the mixed focus or another topic.`);
            }

            // 3. 🚀 TRUE RANDOMIZATION: stratified sample across subtopics so a
            // subject-wide ("All") session spans the whole subject instead of
            // collapsing onto the dominant subtopic (Math→Algebra, ESAS→Chemistry).
            // For a pinned subtopic this is just a uniform Fisher-Yates pick.
            const finalSessionQuestions = cfg.source === 'today-loop'
                ? filteredData.slice(0, cfg.count || filteredData.length)
                : cfg.source === 'adaptive'
                    ? filteredData
                    : stratifiedSample(filteredData, cfg.count || 20);
            adaptiveRef.current = adaptive;
            sittingKeyRef.current = newSittingKey();
            const shownQuestions = finalSessionQuestions.map((q) => presentOptions(q, sittingKeyRef.current));

            telemetryBatchRef.current = [];
            recordedRef.current = { count: 0, correct: 0 };
            setSavedSession(null);
            cardsRatedRef.current = 0;
            endingRef.current = false;
            restartQuestionClock();
            restartClock(sessionStartRef);
            sessionConfigRef.current = cfg.source === 'smart-drill'
                ? { ...cfg, drillTopicId: target.drillTopicId ?? null, drillTopic: target.drillTopic ?? null, drillSubject: target.drillSubject ?? null, drillMode: target.drillMode ?? null }
                : cfg.source === 'items'
                    // "Practise again" repeats the same set.
                    ? { ...cfg, items: freshData }
                    : cfg.source === 'today-loop'
                        // Again repeats the same questions, without the formula
                        // cards: each was rated here already, and rating it again
                        // would schedule it twice in a day. (A loop of cards only
                        // asks the server again.) The summary links the cards due.
                        ? { ...cfg, items: freshData.filter((q) => q.kind !== 'card'), cardsDue: loopCardsDue }
                        : cfg;
            setLastSummary(null);

            // Bracket the session in the store so the per-answer events know
            // which ExamSession id, mode, and target subject to attach. The
            // backend uses these to auto-upsert the ExamSession row.
            startStoreSession({ mode: 'ACTIVE_REVIEW', subject: cfg.subject });

            setSession({
                isActive: true, loading: false, isFinished: false,
                questions: shownQuestions, currentIndex: 0,
                isAnswered: false, isFlipped: false,
                confidence: null, selectedOption: null, wrongSelection: null,
                totalAnswered: 0, correctHits: 0,
                target: adaptive ? adaptive.target : finalSessionQuestions.length,
                fetchingNext: false,
                offlineNote,
            });
        } catch (error) {
            // Nothing to practise stays on the setup screen until the next start
            // (2026-11-13: a toast that faded left the learner on setup with no reason).
            if (error.empty) {
                setSession(prev => ({ ...prev, loading: false, emptyMessage: error.message }));
            } else {
                toast.error(error.message);
                setSession(prev => ({ ...prev, loading: false }));
            }
        }
    };

    const handleAnswerSelection = (option) => {
        if (session.isAnswered) return;
        // QuestionCard asks for it first (the confidence row lights up).
        if (!session.confidence) return;

        const currentQ = session.questions[session.currentIndex];
        const isCorrect = option === currentQ.answer;
        // Millisecond-accurate: read the wall clock directly (a 1s-throttled
        // counter recorded 0 ms for any answer locked in under a second and
        // deflated the per-question time averages).
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
            isCorrect, confidenceLevel: session.confidence, timeSpentMs, userAnswer: option,
        });
        prefetchAdaptive(session.questions);
    };

    // A formula card in Today's loop was rated (LoopCardStep sends the
    // rating). It is not an answer: no attempt, no score, nothing toward
    // ability or today's target.
    const markCardRated = () => {
        if (session.isAnswered) return;
        cardsRatedRef.current += 1;
        setSession((prev) => ({ ...prev, isAnswered: true }));
    };

    const handleFlashcardReveal = () => setSession(prev => ({ ...prev, isFlipped: true }));

    const handleFlashcardRating = (rating) => {
        if (session.isAnswered) return;

        // A rating says whether you knew it, not how sure you were before
        // seeing the answer: sending HIGH for "easy" made flashcards look
        // perfectly calibrated by construction. Confidence is unrated.
        const isCorrect = rating === 'easy' || rating === 'good' || rating === 'hard';
        const mappedConfidence = 'UNRATED';

        const currentQ = session.questions[session.currentIndex];

        // Millisecond-accurate: read the wall clock directly.
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

    // The adaptive set's Next: append the question fetched ahead (or fetch
    // it now) and move to it. Not awaited by callers, so Next stays sync.
    const advanceAdaptive = async (a) => {
        if (a.loading) return;
        a.loading = true;
        setSession((prev) => ({ ...prev, fetchingNext: true }));
        const next = await (a.prefetch || pickAdaptive(a, session.questions.map((q) => q.id), [...telemetryBatchRef.current]));
        a.prefetch = null;
        a.loading = false;
        // Ended, or another session started, while this was in flight.
        if (adaptiveRef.current !== a) return;
        if (!next) {
            toast("That's every question for this set right now.");
            endSession();
            return;
        }
        restartQuestionClock();
        setSession((prev) => ({
            ...prev, questions: [...prev.questions, presentOptions(next, sittingKeyRef.current)], currentIndex: prev.currentIndex + 1, fetchingNext: false,
            isAnswered: false, isFlipped: false,
            confidence: null, selectedOption: null, wrongSelection: null,
        }));
    };

    const loadNextQuestion = () => {
        const a = adaptiveRef.current;
        if (a && session.currentIndex + 1 >= session.questions.length && telemetryBatchRef.current.length < a.target) {
            advanceAdaptive(a);
            return;
        }
        if (session.currentIndex + 1 >= session.questions.length) {
            endSession();
        } else {
            restartQuestionClock();
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
        clearSavedSession();
        adaptiveRef.current = null;
        setIsSubmitting(true);

        const hasBatch = telemetryBatchRef.current.length > 0;
        const cardsRated = cardsRatedRef.current;

        if (!hasBatch) {
            // Nothing answered — just tear down. Still call endStoreSession to
            // clear the session pointer so the next start gets a fresh id.
            await endStoreSession();
            setIsSubmitting(false);
            // Only formula cards rated (a loop of cards): the summary says so.
            setLastSummary(cardsRated > 0 ? {
                total: 0, correct: 0, accuracy: 0, avgSecs: null,
                durationSecs: Math.round((Date.now() - sessionStartRef.current) / 1000),
                byTopic: [], weakest: null, confidentMisses: 0, luckyGuesses: 0, items: [], missedCount: 0,
                cardsRated, config: sessionConfigRef.current,
            } : null);
            setSession(prev => ({ ...prev, isActive: false, isFinished: true, questions: [] }));
            return;
        }

        // Summarize from what was recorded, before the batch is cleared below.
        const recap = buildSessionSummary(
            telemetryBatchRef.current,
            session.questions,
            (Date.now() - sessionStartRef.current) / 1000,
        );
        setLastSummary(recap ? { ...recap, cardsRated, config: sessionConfigRef.current } : null);

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
                // Less what a record already covers, from leaving and coming back.
                totalQuestions: session.totalAnswered - recordedRef.current.count,
                correctAnswers: session.correctHits - recordedRef.current.correct,
                durationSecs: totalDuration,
            };
            const hasNewAnswers = summary.totalQuestions > 0;

            if (isOnline) {
                if (hasNewAnswers) {
                    try {
                        await apiRequest('/api/analytics/study-sessions', 'POST', summary);
                    } catch {
                        // Backend went unreachable mid-flush — defer the summary instead
                        // of dropping it, so the session history stays complete.
                        queuePendingWrite('/api/analytics/study-sessions', 'POST', summary);
                    }
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
                if (hasNewAnswers) queuePendingWrite('/api/analytics/study-sessions', 'POST', summary);
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
    // Optimistic Set update, rolled back if the API rejects. Offline it's queued.
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
        } catch {
            setBookmarks(prev => flip(prev, had));
            toast.error("Bookmark failed.");
        }
    };

    const handleFlagQuestion = async (reason) => {
        const currentQ = session.questions[session.currentIndex];
        if (!currentQ?.id) return toast.error("Cannot flag dynamic items.");
        try {
            await reportQuestion(currentQ.id, reason);
            // By id: the learner may have moved on while the request ran, and
            // writing to the current index flagged the next question instead.
            setSession(prev => ({
                ...prev,
                questions: prev.questions.map(q => (q.id === currentQ.id ? { ...q, isFlagged: true } : q)),
            }));
            toast.success("Thanks — we'll review this question.");
        } catch { toast.error("Flag failed."); }
    };

    // Keep the running session on the device as it moves. Reads refs for what isn't
    // state, so it writes only when the place in the set changes.
    const draftNow = () => ({
        config: sessionConfigRef.current,
        form: config,
        questions: session.questions,
        currentIndex: session.currentIndex,
        isAnswered: session.isAnswered,
        target: session.target,
        totalAnswered: session.totalAnswered,
        correctHits: session.correctHits,
        batch: telemetryBatchRef.current,
        recorded: recordedRef.current,
        cardsRated: cardsRatedRef.current,
        sittingKey: sittingKeyRef.current,
        elapsedMs: Date.now() - sessionStartRef.current,
        adaptive: adaptiveRef.current
            ? { target: adaptiveRef.current.target, subject: adaptiveRef.current.subject, start: adaptiveRef.current.start }
            : null,
    });
    useEffect(() => {
        if (session.isActive && !endingRef.current) saveSession(draftNow());
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the place in the set changes
    }, [session.isActive, session.currentIndex, session.isAnswered, session.questions.length]);

    const discardSavedSession = () => {
        clearSavedSession();
        setSavedSession(null);
    };

    // Back to where the saved session was: the next unanswered item, or the
    // answered one when an adaptive set still has to fetch its next.
    const resumeSession = () => {
        const d = savedSession;
        if (!d) return;
        const atEnd = d.isAnswered && d.currentIndex + 1 >= d.questions.length;
        telemetryBatchRef.current = d.batch || [];
        recordedRef.current = d.recorded || { count: 0, correct: 0 };
        cardsRatedRef.current = d.cardsRated || 0;
        sittingKeyRef.current = d.sittingKey || newSittingKey();
        sessionConfigRef.current = d.config;
        adaptiveRef.current = d.adaptive ? { ...d.adaptive, local: null, prefetch: null, loading: false } : null;
        endingRef.current = false;
        if (d.form) setConfig(d.form);
        sessionStartRef.current = Date.now() - (d.elapsedMs || 0);
        restartQuestionClock();
        startStoreSession({ mode: 'ACTIVE_REVIEW', subject: d.config?.subject });
        setSavedSession(null);
        setLastSummary(null);
        setSession({
            isActive: true, loading: false, isFinished: false,
            questions: d.questions,
            currentIndex: d.isAnswered && !atEnd ? d.currentIndex + 1 : d.currentIndex,
            isAnswered: atEnd, isFlipped: false,
            confidence: null, selectedOption: null, wrongSelection: null,
            totalAnswered: d.totalAnswered || 0, correctHits: d.correctHits || 0,
            target: d.target || d.questions.length, fetchingNext: false,
        });
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
            if (endingRef.current || !session.isActive) return;
            const fresh = telemetryBatchRef.current.slice(recordedRef.current.count);
            if (fresh.length === 0) return;
            const correct = fresh.filter(a => a.isCorrect).length;
            queuePendingWrite('/api/analytics/study-sessions', 'POST', {
                mode: config.sessionMode,
                subject: config.subject,
                subtopic: config.subtopic === 'All' ? null : config.subtopic,
                totalQuestions: fresh.length,
                correctAnswers: correct,
                durationSecs: Math.floor((Date.now() - sessionStartRef.current) / 1000),
            });
            // The saved session stays, to come back to, knowing this much is recorded.
            recordedRef.current = { count: recordedRef.current.count + fresh.length, correct: recordedRef.current.correct + correct };
            saveSession(draftNow());
            endStoreSession();
        };
    });
    useEffect(() => () => leaveRef.current?.(), []);

    const activeQ = session.questions[session.currentIndex];

    return {
        aiText: activeQ ? ai.textFor(activeQ) : null,
        aiLoading: activeQ ? ai.isLoading(activeQ) : false,
        config, setConfig, session, setSession, questionStartedAt, bookmarks,
        startSession, endSession, loadNextQuestion, 
        handleAnswerSelection, handleFlashcardReveal, handleFlashcardRating, markCardRated,
        toggleBookmark, handleFlagQuestion, explainQuestion, safeTOS, isSubmitting,
        lastSummary, clearSummary: () => setLastSummary(null),
        savedSession, resumeSession, discardSavedSession,
    };
};