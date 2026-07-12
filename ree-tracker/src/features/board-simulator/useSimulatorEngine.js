// src/features/board-simulator/useSimulatorEngine.js
import { useState, useEffect, useRef } from 'react';
import { generateQuestionsAI, generateMasterExplanation } from '../../services/geminiApi';
import {
  updateQuestionCache, updateQuestionInBank, fetchVaultQuestions,
  saveSimulationRecord, syncTelemetryBatch, getAnalyticsProfile,
  fetchMultiplayerBattle, fetchSyllabusWeights, saveBookmark, removeBookmark
} from '../../services/dbQueries';
import { useStore } from '../../store/useStore';
import { shuffleArray, stratifiedSample } from '../../utils/shuffle';
import { computeBattleDiagnostics } from './battleGrades';
import toast from 'react-hot-toast';

export const useSimulatorEngine = (currentUser, isOnline) => {
  const { dynamicTOS, setStats, startSession: startStoreSession, endSession: endStoreSession } = useStore();

  const [config, setConfig] = useState({
    mode: 'subject', subject: 'EE', count: 20, isPrcStandard: false, source: 'library', timeLimitMins: 30, cognitiveFocus: 'mixed'
  });

  const [session, setSession] = useState({
    isActive: false, isFinished: false, questions: [], answers: {},
    confidences: {}, loading: false, error: '', diagnostics: null
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showTime, setShowTime] = useState(true);
  const [bookmarks, setBookmarks] = useState(new Set()); 
  
  const [hasSavedSession, setHasSavedSession] = useState(!!localStorage.getItem('ree_sim_cache'));
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeIsUp, setTimeIsUp] = useState(false);

  // HIGH-PERFORMANCE REFS
  const endTimeRef = useRef(null);
  const questionsRef = useRef([]);
  const timeSpentPerQuestion = useRef({});
  const lastActiveTime = useRef(Date.now());
  const totalExamTime = useRef(0);
  const currentAnswersRef = useRef({});
  const currentConfidencesRef = useRef({});

  // Refs mirror the mutable pieces of exam state so the autosave draft never
  // closes over a stale snapshot. The timer effect below only re-subscribes on
  // isActive/isFinished, so without these refs its interval kept persisting the
  // INITIAL empty-answers `session` — a crash-resume then restored zero answers.
  const currentIndexRef = useRef(0);
  const configRef = useRef(config);
  const bookmarksRef = useRef(bookmarks);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { bookmarksRef.current = bookmarks; }, [bookmarks]);

  // Single source of truth for the resumable draft. Reads ONLY refs, so it is
  // safe to call from anywhere (timer tick, per-answer, index change) without
  // stale-closure risk, and it persists currentIndex so resume lands on the
  // right item. Skipped for battles (server-authoritative, not resumable here).
  const persistDraft = () => {
    if (configRef.current?.battleId) return;
    if (!questionsRef.current?.length) return;
    try {
      localStorage.setItem('ree_sim_cache', JSON.stringify({
        config: configRef.current,
        questions: questionsRef.current,
        answers: currentAnswersRef.current,
        confidences: currentConfidencesRef.current,
        currentIndex: currentIndexRef.current,
        totalExamTime: totalExamTime.current,
        endTime: endTimeRef.current,
        bookmarks: Array.from(bookmarksRef.current || []),
        savedAt: Date.now(),
      }));
    } catch (_) { /* quota / serialization — best effort */ }
  };

  // 🚀 ABSOLUTE TIMER: Decoupled from React State Loop
  useEffect(() => {
    let interval = null;
    if (session.isActive && !session.isFinished) {
      if (!endTimeRef.current) {
          endTimeRef.current = Date.now() + timeRemaining * 1000;
      }
      
      interval = setInterval(() => {
        const now = Date.now();
        const timeLeft = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
        
        setTimeRemaining(timeLeft);
        
        if (timeLeft <= 0) {
            clearInterval(interval);
            endTimeRef.current = null;
            setTimeIsUp(true); 
        } else if (timeLeft % 5 === 0) {
            persistDraft();
        }
      }, 1000);
    } else {
        endTimeRef.current = null;
    }
    return () => clearInterval(interval);
  }, [session.isActive, session.isFinished]);

  useEffect(() => {
      if (timeIsUp) {
          submitExam();
          setTimeIsUp(false);
      }
  }, [timeIsUp]);

  // 🚀 BULLETPROOF EXAM POOL BUILDER
  const buildExamPool = async () => {
      let pool = [];
      let timeLimitSecs = config.timeLimitMins * 60;
      const totalCount = config.isPrcStandard ? 100 : (config.count || 20);

      // Cognitive Filter: Forgiving matching to prevent 0-item crashes
      const applyFilter = (rawPool) => {
          if (!config.cognitiveFocus || config.cognitiveFocus === 'mixed') return rawPool;
          
          const filtered = rawPool.filter(q => {
              const typeStr = String(q.type || q.questionType || q.category || q.cognitiveFocus || '').toLowerCase();
              const isCalc = typeStr.includes('calc') || typeStr.includes('math') || typeStr.includes('problem');
              return config.cognitiveFocus === 'calculation' ? isCalc : !isCalc;
          });

          // Fallback: If filter is too strict, return the raw mix instead of crashing
          if (filtered.length === 0 && rawPool.length > 0) {
              toast("Strict cognitive filter yielded 0. Reverting to Standard Mix.", { icon: '⚠️' });
              return rawPool; 
          }
          return filtered;
      };

      if (config.source === 'library') {
          if (config.mode === 'blended') {
              // Blend by the PRC syllabus weights (server config, one source of
              // truth shared with the backend sampler); falls back to 25/30/45.
              const w = await fetchSyllabusWeights();
              const dist = { Mathematics: Math.round(totalCount * w.Mathematics), ESAS: Math.round(totalCount * w.ESAS), EE: Math.round(totalCount * w.EE) };
              for (const subj of ['Mathematics', 'ESAS', 'EE']) {
                  // Direct Deep Fetch: Pulling 2000 ensures we have enough data even after filtering
                  const raw = await fetchVaultQuestions(subj, 'All', 2000);
                  const filtered = applyFilter(raw || []);
                  const shuffled = stratifiedSample(filtered, dist[subj]);
                  pool = pool.concat(shuffled);
              }
              timeLimitSecs = config.isPrcStandard ? 5 * 3600 : timeLimitSecs;
          } else {
              // Direct Deep Fetch
              const targetSubtopic = config.subtopic === 'All' || !config.subtopic ? 'All' : config.subtopic;
              const raw = await fetchVaultQuestions(config.subject, targetSubtopic, 2000);
              const filtered = applyFilter(raw || []);
              // Stratify so a single-subject sim spans its subtopics rather than
              // collapsing onto the dominant one. (No-op for a pinned subtopic.)
              pool = stratifiedSample(filtered, totalCount);
              timeLimitSecs = config.isPrcStandard ? (config.subject === 'EE' ? 6 * 3600 : 4 * 3600) : totalCount * 120;
          }
      } else {
          if (!isOnline) throw new Error("Offline mode: Must use Local Library Vault.");
          const subjectTopics = dynamicTOS[config.subject];
          if (!subjectTopics || subjectTopics.length === 0) throw new Error("TOS configuration missing.");
          
          const aiPromises = [];
          for (let i = 0; i < Math.ceil(totalCount / 3); i++) {
              const subT = subjectTopics[Math.floor(Math.random() * subjectTopics.length)];
              aiPromises.push(generateQuestionsAI(config.subject, subT, false));
          }
          const aiResults = await Promise.all(aiPromises);
          aiResults.forEach(arr => { if (arr) pool = pool.concat(arr); });
          timeLimitSecs = totalCount * 120;
      }

      if (pool.length < totalCount && pool.length > 0) {
          toast(`Only acquired ${pool.length} items from the vault.`, { icon: '⚠️' });
      }
      if (pool.length === 0) throw new Error("Vault empty for selected parameters.");
      
      // 🚀 THE FIX: Final global shuffle destroys predictability in Full Blended Mode!
      pool = shuffleArray(pool);

      // Final shuffle of the internal options A, B, C, D
      return { pool: pool.map(q => q.options?.length > 0 ? { ...q, options: shuffleArray(q.options) } : q), timeLimitSecs };
  };

  const startSimulation = async () => {
    setSession(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const { pool, timeLimitSecs } = await buildExamPool();
      
      timeSpentPerQuestion.current = {};
      currentAnswersRef.current = {};
      currentConfidencesRef.current = {};
      questionsRef.current = pool;
      lastActiveTime.current = Date.now();
      totalExamTime.current = timeLimitSecs;
      endTimeRef.current = Date.now() + timeLimitSecs * 1000;

      // Bracket the session in the store so the eventual submit uses a real
      // sessionId (one ExamSession upserted on the backend, not a phantom
      // UUID per submit).
      startStoreSession({ mode: 'BOARD_SIM', subject: config.subject });
      
      const newState = { 
        isActive: true, isFinished: false, questions: pool, answers: {}, 
        confidences: {}, loading: false, error: '', diagnostics: null 
      };

      setSession(newState);
      setCurrentIndex(0); 
      setTimeRemaining(timeLimitSecs); 
      setBookmarks(new Set());
      setIsSubmitting(false);
      
      currentIndexRef.current = 0;
      bookmarksRef.current = new Set();
      configRef.current = config;
      persistDraft();
      setHasSavedSession(true);
    } catch (err) {
      setSession(prev => ({ ...prev, loading: false, error: err.message }));
      toast.error(err.message);
    }
  };

  const resumeSimulation = () => {
    const saved = localStorage.getItem('ree_sim_cache');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      // Back-compat: older drafts nested everything under `session`; newer ones
      // store questions/answers/confidences/currentIndex at the top level.
      const legacy = parsed.session || {};
      const questions = parsed.questions || legacy.questions || [];
      const answers = parsed.answers || legacy.answers || {};
      const confidences = parsed.confidences || legacy.confidences || {};
      const resumedIndex = parsed.currentIndex || 0;

      setConfig(parsed.config);
      configRef.current = parsed.config;
      setSession({
        isActive: true, isFinished: false, questions, answers, confidences,
        loading: false, error: '', diagnostics: null,
      });
      setCurrentIndex(resumedIndex);
      currentIndexRef.current = resumedIndex;

      if (parsed.endTime) {
        const timeLeft = Math.max(0, Math.round((parsed.endTime - Date.now()) / 1000));
        setTimeRemaining(timeLeft);
        endTimeRef.current = parsed.endTime;
      } else {
        const fallback = legacy.timeRemaining || parsed.timeRemaining || 0;
        setTimeRemaining(fallback);
        endTimeRef.current = Date.now() + fallback * 1000;
      }

      totalExamTime.current = parsed.totalExamTime || timeRemaining;
      questionsRef.current = questions;
      currentAnswersRef.current = answers;
      currentConfidencesRef.current = confidences;
      const bm = parsed.bookmarks || [];
      setBookmarks(new Set(bm));
      bookmarksRef.current = new Set(bm);

      lastActiveTime.current = Date.now();
      localStorage.removeItem('ree_sim_cache');
      setHasSavedSession(false);
      toast.success("Matrix restored. Resuming simulation.");
    } catch (_) {
      localStorage.removeItem('ree_sim_cache');
      setHasSavedSession(false);
      toast.error('Saved simulation was corrupt; starting fresh.');
    }
  };

  const handleSelectOption = (opt) => {
      const newAnswers = { ...session.answers, [currentIndex]: opt };
      currentAnswersRef.current = newAnswers;
      setSession(prev => ({ ...prev, answers: newAnswers }));
      persistDraft();
  };

  const handleSelectConfidence = (level) => {
      currentConfidencesRef.current[currentIndex] = level;
      setSession(prev => ({ ...prev, confidences: { ...prev.confidences, [currentIndex]: level } }));
      persistDraft();
  };

  const handleIndexChange = (newIdx) => {
    const now = Date.now();
    timeSpentPerQuestion.current[currentIndex] = (timeSpentPerQuestion.current[currentIndex] || 0) + (now - lastActiveTime.current);
    setCurrentIndex(newIdx);
    currentIndexRef.current = newIdx;
    lastActiveTime.current = now;
    persistDraft();
  };

  const toggleBookmark = (idx) => {
    // The Set holds indices for the in-exam UI state (draft-persisted so a
    // reload keeps the marks). Also PERSIST to /api/bookmarks so the item
    // actually reaches the Materials → Bookmark Vault — the local Set alone
    // never left the client.
    const had = bookmarksRef.current.has(idx);
    const next = new Set(bookmarksRef.current);
    if (had) next.delete(idx); else next.add(idx);
    bookmarksRef.current = next;
    setBookmarks(next);
    persistDraft();

    const q = session.questions?.[idx];
    if (!q?.id) { toast.success(had ? "Removed Bookmark." : "Bookmarked."); return; }
    const write = had ? removeBookmark(currentUser?.uid, q.id) : saveBookmark(currentUser?.uid, { questionId: q.id });
    write
      .then(() => toast.success(had ? "Removed Bookmark." : "Bookmarked — in Materials › Bookmark Vault."))
      .catch((err) => {
        if (!had && err?.status === 409) return; // already saved server-side
        // Roll the UI Set back to match the server.
        const revert = new Set(bookmarksRef.current);
        if (had) revert.add(idx); else revert.delete(idx);
        bookmarksRef.current = revert;
        setBookmarks(revert);
        persistDraft();
        toast.error(err?.message === '[OFFLINE]' ? "Offline — bookmarking needs a connection." : "Bookmark failed.");
      });
  };

  const submitExam = async () => {
    if (isSubmitting || session.isFinished) return;
    setIsSubmitting(true);
    const loadingToastId = toast.loading("Transmitting telemetry to Assessment Core...");

    try {
        localStorage.removeItem('ree_sim_cache');
        setHasSavedSession(false);

        const now = Date.now();
        timeSpentPerQuestion.current[currentIndex] = (timeSpentPerQuestion.current[currentIndex] || 0) + (now - lastActiveTime.current);
        endTimeRef.current = null; 

        const finalQs = questionsRef.current;
        const finalAns = currentAnswersRef.current;
        const finalConf = currentConfidencesRef.current;
        const timeSpent = timeSpentPerQuestion.current;

        // BATTLE MODE: questions arrive sanitized (no answer keys), so local
        // grading is impossible — and telemetry is persisted server-side by
        // the battle socket (mode BATTLE), so syncing here would double-count
        // attempts. Lock in the answers, hand the attempt list to the socket
        // layer (via diagnostics.pendingAttempts), and wait for the server's
        // battle-graded / battle-complete events to fill in the real score.
        if (config.battleId) {
            const timeTakenActual = totalExamTime.current - timeRemaining;
            const mappedQuestions = finalQs.map((q, idx) => ({
                ...q, userAnswer: finalAns[idx] ?? null, userConf: finalConf[idx] || 'HIGH'
            }));
            const pendingAttempts = finalQs.map((q, idx) => ({
                questionId: q.id,
                userAnswer: finalAns[idx] ?? null,
                confidenceLevel: finalConf[idx] || 'MED',
                timeSpentMs: Math.round(timeSpent[idx]) || 0,
            })).filter((a) => a.questionId);

            setSession(prev => ({
                ...prev, isFinished: true, isActive: true, answers: finalAns,
                questions: mappedQuestions,
                diagnostics: {
                    pending: true, score: null, verdict: 'GRADING',
                    timeTakenSecs: timeTakenActual, totalItems: finalQs.length,
                    correctItems: null, subjectScores: {}, weakTopics: [],
                    chronoAnomalies: [], blindSpots: [], pendingAttempts,
                },
            }));
            setCurrentIndex(0);
            toast.success('Answers locked in. Awaiting server grading…', { id: loadingToastId });
            return;
        }

        let correct = 0;
        const subjBreakdown = { Math: {c:0, t:0}, ESAS: {c:0, t:0}, EE: {c:0, t:0} };
        const topicBreakdown = {};

        // Session's lifecycle id, not a fresh UUID per submit — the backend
        // upserts the ExamSession row keyed on this id, and the deterministic
        // clientAttemptId below makes a retried submit a no-op server-side.
        const sessionId = useStore.getState().currentSessionId || crypto.randomUUID();

        const attemptsPayload = finalQs.map((q, idx) => {
            const isCorrect = finalAns[idx] === q.answer;
            if (isCorrect) correct++;

            let sKey = q.subject === 'Mathematics' ? 'Math' : q.subject;
            if (subjBreakdown[sKey]) {
                subjBreakdown[sKey].t += 1;
                if (isCorrect) subjBreakdown[sKey].c += 1;
            }

            if (!topicBreakdown[q.subtopic]) topicBreakdown[q.subtopic] = { t:0, c:0 };
            topicBreakdown[q.subtopic].t += 1;
            if (isCorrect) topicBreakdown[q.subtopic].c += 1;

            return {
                questionId: q.id, subject: q.subject, subtopic: q.subtopic,
                isCorrect: isCorrect, confidenceLevel: finalConf[idx] || 'HIGH',
                // Send the selected option so the server re-grades against its own
                // answer key — offline client grading is never trusted for stats.
                // Omitted (not null) when unanswered — schema userAnswer is optional string.
                ...(finalAns[idx] != null ? { userAnswer: finalAns[idx] } : {}),
                // `timeSpent[idx]` is ALREADY milliseconds (accumulated as
                // Date.now() - lastActiveTime). The old `* 1000` inflated it 1000×,
                // so every attempt recorded ~hours and poisoned the per-question
                // time averages / Speed Mapping. Send the raw ms; 10s fallback.
                timeSpentMs: Math.round(timeSpent[idx]) || 10000,
                clientAttemptId: `${sessionId}:${q.id}`,
            };
        });

        if (currentUser) {
            // A fully self-describing telemetry batch — carries its own sessionId,
            // BOARD_SIM mode, subject, and deterministic clientAttemptIds, so it
            // replays exactly-once even hours later.
            const bulkBody = { sessionId, targetSubject: config.subject, mode: 'BOARD_SIM', attempts: attemptsPayload };
            // Deferred (offline / circuit-breaker) submits are tagged offline so
            // the server flags the rows and logs any client/server grading
            // discrepancy when it re-grades on sync.
            const offlineBulkBody = { ...bulkBody, attempts: attemptsPayload.map((a) => ({ ...a, offline: true })) };

            if (isOnline) {
                try {
                    await syncTelemetryBatch(currentUser.uid, sessionId, config.subject, 'BOARD_SIM', attemptsPayload);
                    const freshProfile = await getAnalyticsProfile(currentUser.uid);
                    if (freshProfile?.data) {
                        setStats({
                            ...useStore.getState().stats,
                            ...freshProfile.data.profile,
                            activityCalendar: freshProfile.data.activityCalendar,
                            microTopics: freshProfile.data.microTopics,
                            matrix: freshProfile.data.matrix
                        });
                    }
                } catch (syncError) {
                    console.warn("Cloud Sync Failed", syncError);
                    if (syncError?.message === '[OFFLINE]') {
                        // Circuit breaker tripped despite navigator.onLine — defer.
                        useStore.getState().queuePendingWrite('/api/analytics/telemetry-bulk', 'POST', offlineBulkBody);
                        toast('Offline — exam queued; analytics will sync on reconnect.', { icon: '📡' });
                    } else {
                        toast.error(`Telemetry sync failed: ${syncError?.message || 'unknown'}. Results saved locally.`);
                    }
                }
            } else {
                // Fully offline mock exam — defer the batch with its correct
                // session + mode so it lands exactly like an online submit later.
                useStore.getState().queuePendingWrite('/api/analytics/telemetry-bulk', 'POST', offlineBulkBody);
                toast('Offline — exam saved locally; analytics will sync on reconnect.', { icon: '📡' });
            }
        }

        const score = Math.round((correct / finalQs.length) * 100);
        const verdict = score >= 70 ? 'PASSED' : (score >= 60 ? 'CONDITIONAL PASS' : 'FAILED');
        const timeTakenActual = totalExamTime.current - timeRemaining;

        const subjectScores = {
            Math: subjBreakdown.Math.t > 0 ? Math.round((subjBreakdown.Math.c / subjBreakdown.Math.t) * 100) : null,
            ESAS: subjBreakdown.ESAS.t > 0 ? Math.round((subjBreakdown.ESAS.c / subjBreakdown.ESAS.t) * 100) : null,
            EE: subjBreakdown.EE.t > 0 ? Math.round((subjBreakdown.EE.c / subjBreakdown.EE.t) * 100) : null
        };

        const mappedQuestions = finalQs.map((q, idx) => ({ ...q, userAnswer: finalAns[idx] || null, userConf: finalConf[idx] || 'HIGH' }));

        const diagnosticsPayload = {
            score, verdict, timeTakenSecs: timeTakenActual, subjectScores,
            weakTopics: Object.entries(topicBreakdown).filter(([_, d]) => d.t > 0 && (d.c / d.t) < 0.6).map(([t]) => t),
            totalItems: finalQs.length, correctItems: correct,
            chronoAnomalies: mappedQuestions.filter((_, idx) => (timeSpent[idx] || 0) > 180000),
            blindSpots: mappedQuestions.filter((q) => (q.userConf === 'HIGH') && q.userAnswer !== q.answer)
        };

        setSession(prev => ({ 
            ...prev, isFinished: true, isActive: true, 
            score, verdict, diagnostics: diagnosticsPayload, answers: finalAns,
            questions: mappedQuestions 
        }));
        
        setCurrentIndex(0);
        await saveSimulationRecord({
            date: new Date().toISOString(), score, verdict, subjectScores,
            mode: config.mode, targetSubject: config.subject, totalQs: finalQs.length, timeTaken: timeTakenActual
        });

        toast.success('Simulation telemetry verified and saved.', { id: loadingToastId });

    } catch (err) {
        toast.error(`Error: ${err.message}`, { id: loadingToastId });
    } finally {
        // Clear the session pointer in the store so the next simulation
        // start gets a fresh id (and any pending debounced queue drains).
        try { await endStoreSession(); } catch (_) {}
        setIsSubmitting(false);
    }
  };

  const handleFlagQuestion = async () => {
    const currentQ = session.questions[currentIndex];
    if (!currentQ || !currentQ.id) return toast.error("Cannot flag dynamic items.");
    try {
        await updateQuestionInBank(currentQ.id, { isFlagged: true });
        toast.success("Anomaly reported.");
    } catch (error) { toast.error("Flag failed."); }
  };

  const startMultiplayerBattle = async (battleId) => {
    setSession(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchMultiplayerBattle(battleId);
      if (!data?.battle) throw new Error('Battle not found');

      const battle = data.battle;
      const pool = shuffleArray(battle.questions || []).map(q =>
        q.options?.length > 0 ? { ...q, options: shuffleArray(q.options) } : q
      );

      if (pool.length === 0) throw new Error('No questions in battle');

      const timeLimitSecs = battle.timeLimitSecs || 1800;

      setConfig({
        mode: battle.config?.mode || 'custom',
        subject: battle.config?.subject || 'EE',
        count: pool.length,
        isPrcStandard: battle.config?.isPrcStandard || false,
        source: 'library',
        timeLimitMins: Math.round(timeLimitSecs / 60),
        cognitiveFocus: 'mixed',
        battleId
      });

      timeSpentPerQuestion.current = {};
      currentAnswersRef.current = {};
      currentConfidencesRef.current = {};
      questionsRef.current = pool;
      lastActiveTime.current = Date.now();
      totalExamTime.current = timeLimitSecs;
      endTimeRef.current = Date.now() + timeLimitSecs * 1000;

      setSession({
        isActive: true, isFinished: false, questions: pool, answers: {},
        confidences: {}, loading: false, error: '', diagnostics: null
      });
      setCurrentIndex(0);
      setTimeRemaining(timeLimitSecs);
      setBookmarks(new Set());
      setIsSubmitting(false);
      gradesAppliedRef.current = false;

      toast.success(`Battle loaded: ${pool.length} items, ${Math.round(timeLimitSecs / 60)} min`);
    } catch (err) {
      setSession(prev => ({ ...prev, loading: false, error: err.message }));
      toast.error(err.message);
    }
  };

  // Server ack for OUR submission (battle-graded): authoritative score before
  // the full answer key exists (opponents may still be playing). Keeps the
  // per-question review pending until applyBattleGrades.
  const applyServerScore = ({ score, total }) => {
    setSession(prev => {
      if (!prev.isFinished || !prev.diagnostics?.pending) return prev;
      const pct = total > 0 ? Math.round((score / total) * 100) : 0;
      const verdict = pct >= 70 ? 'PASSED' : (pct >= 60 ? 'CONDITIONAL PASS' : 'FAILED');
      return {
        ...prev, score: pct, verdict,
        diagnostics: { ...prev.diagnostics, score: pct, verdict, correctItems: score },
      };
    });
  };

  // battle-complete revealed the answer key — patch the sanitized questions
  // with real answers and compute the full local diagnostics for the review
  // screen. Also persists the local ledger record (skipped at submit time
  // because the score wasn't known yet).
  const gradesAppliedRef = useRef(false);
  const applyBattleGrades = (answerKey, explanationKey = null) => {
    if (!session.isFinished || !session.diagnostics?.pending || !answerKey) return;
    if (gradesAppliedRef.current) return;
    gradesAppliedRef.current = true;

    const { mappedQuestions, diagnostics } = computeBattleDiagnostics({
      questions: session.questions,
      answerKey,
      explanationKey: explanationKey || {},
      timeSpentPerQuestion: timeSpentPerQuestion.current,
      timeTakenSecs: session.diagnostics.timeTakenSecs || 0,
    });

    setSession(prev => ({
      ...prev,
      questions: mappedQuestions,
      score: diagnostics.score,
      verdict: diagnostics.verdict,
      diagnostics: { ...diagnostics, pending: false },
    }));

    saveSimulationRecord({
      date: new Date().toISOString(),
      score: diagnostics.score, verdict: diagnostics.verdict,
      subjectScores: diagnostics.subjectScores,
      mode: 'battle', targetSubject: config.subject,
      totalQs: diagnostics.totalItems, timeTaken: diagnostics.timeTakenSecs,
    }).catch(() => {});
  };

  // Offline reviewer PDF — pulls the same question pool the user would face
  // if they hit "Initiate Simulation" right now, and dumps it to a printable
  // PDF (one question per page, four options labelled A-D, blank answer key
  // page at the end). LaTeX delimiters are stripped to plain text since
  // jsPDF cannot render KaTeX glyphs; this is a study-on-paper artefact,
  // not a perfect render of the on-screen exam.
  // Export a print-ready PRC-style board-exam packet (questionnaire + answer
  // sheet + answer key). Heavy PDF/layout code lives in ./examPaper and is
  // dynamically imported so jsPDF stays out of the simulator's initial chunk.
  const exportOfflinePDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const toastId = toast.loading('Compiling board-exam paper…');
    try {
      const subjectMap = { ee: 'EE', esas: 'ESAS', math: 'Mathematics', mathematics: 'Mathematics', blended: 'Blended' };
      const subject = subjectMap[String(config.subject || '').toLowerCase()] || config.subject || 'EE';
      const count = config.isPrcStandard ? 100 : (config.count || 20);
      const pool = await fetchVaultQuestions(subject, 'All', count);
      if (!pool || pool.length === 0) {
        throw new Error('No questions available for the selected configuration.');
      }

      const { generateExamPaper } = await import('./examPaper');
      const res = await generateExamPaper({ pool, subject, config });
      toast.success(`Exam paper ready — ${res.items} items, ${res.pages} pages (${res.setLabel}).`, { id: toastId });
    } catch (err) {
      console.error('Exam paper export failed:', err);
      toast.error(err?.message || 'Failed to export exam paper.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    config, setConfig, session, setSession,
    currentIndex, setCurrentIndex, timeRemaining, showTime, setShowTime,
    bookmarks, toggleBookmark, startSimulation, startMultiplayerBattle, handleSelectOption,
    handleSelectConfidence, handleIndexChange, submitExam, applyServerScore, applyBattleGrades,
    hasSavedSession, resumeSimulation, handleFlagQuestion,
    exportOfflinePDF, isExporting, isSubmitting
  };
};