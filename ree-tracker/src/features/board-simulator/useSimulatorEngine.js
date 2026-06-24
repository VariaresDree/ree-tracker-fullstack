// src/features/board-simulator/useSimulatorEngine.js
import { useState, useEffect, useRef } from 'react';
import { generateQuestionsAI, generateMasterExplanation } from '../../services/geminiApi';
import {
  updateQuestionCache, updateQuestionInBank, fetchVaultQuestions,
  saveSimulationRecord, syncTelemetryBatch, getAnalyticsProfile,
  fetchMultiplayerBattle
} from '../../services/dbQueries';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const useSimulatorEngine = (currentUser, isOnline) => {
  const { dynamicTOS, setStats } = useStore();

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
            localStorage.setItem('ree_sim_cache', JSON.stringify({ 
                config, session, totalExamTime: totalExamTime.current, endTime: endTimeRef.current, bookmarks: Array.from(bookmarks) 
            }));
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
              const dist = { Mathematics: Math.round(totalCount * 0.25), ESAS: Math.round(totalCount * 0.30), EE: Math.round(totalCount * 0.45) };
              for (const subj of ['Mathematics', 'ESAS', 'EE']) {
                  // Direct Deep Fetch: Pulling 2000 ensures we have enough data even after filtering
                  const raw = await fetchVaultQuestions(subj, 'All', 2000);
                  const filtered = applyFilter(raw || []);
                  const shuffled = shuffleArray(filtered).slice(0, dist[subj]);
                  pool = pool.concat(shuffled);
              }
              timeLimitSecs = config.isPrcStandard ? 5 * 3600 : timeLimitSecs;
          } else {
              // Direct Deep Fetch
              const targetSubtopic = config.subtopic === 'All' || !config.subtopic ? 'All' : config.subtopic;
              const raw = await fetchVaultQuestions(config.subject, targetSubtopic, 2000);
              const filtered = applyFilter(raw || []);
              pool = shuffleArray(filtered).slice(0, totalCount);
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
      
      const newState = { 
        isActive: true, isFinished: false, questions: pool, answers: {}, 
        confidences: {}, loading: false, error: '', diagnostics: null 
      };

      setSession(newState);
      setCurrentIndex(0); 
      setTimeRemaining(timeLimitSecs); 
      setBookmarks(new Set());
      setIsSubmitting(false);
      
      localStorage.setItem('ree_sim_cache', JSON.stringify({ 
          config, session: newState, totalExamTime: timeLimitSecs, endTime: endTimeRef.current, bookmarks: [] 
      }));
      setHasSavedSession(true);
    } catch (err) {
      setSession(prev => ({ ...prev, loading: false, error: err.message }));
      toast.error(err.message);
    }
  };

  const resumeSimulation = () => {
    const saved = localStorage.getItem('ree_sim_cache');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed.config);
      setSession(parsed.session);
      setCurrentIndex(parsed.currentIndex || 0);
      
      if (parsed.endTime) {
          const timeLeft = Math.max(0, Math.round((parsed.endTime - Date.now()) / 1000));
          setTimeRemaining(timeLeft);
          endTimeRef.current = parsed.endTime;
      } else {
          setTimeRemaining(parsed.session.timeRemaining || parsed.timeRemaining);
          endTimeRef.current = Date.now() + (parsed.session.timeRemaining || parsed.timeRemaining) * 1000;
      }
      
      totalExamTime.current = parsed.totalExamTime || timeRemaining; 
      questionsRef.current = parsed.session.questions || [];
      currentAnswersRef.current = parsed.session.answers || {};
      currentConfidencesRef.current = parsed.session.confidences || {};
      if (parsed.bookmarks) setBookmarks(new Set(parsed.bookmarks));
      
      lastActiveTime.current = Date.now();
      localStorage.removeItem('ree_sim_cache');
      setHasSavedSession(false);
      toast.success("Matrix restored. Resuming simulation.");
    }
  };

  const handleSelectOption = (opt) => {
      const newAnswers = { ...session.answers, [currentIndex]: opt };
      currentAnswersRef.current = newAnswers; 
      setSession(prev => ({ ...prev, answers: newAnswers }));
  };

  const handleSelectConfidence = (level) => {
      currentConfidencesRef.current[currentIndex] = level;
      setSession(prev => ({ ...prev, confidences: { ...prev.confidences, [currentIndex]: level } }));
  };
  
  const handleIndexChange = (newIdx) => {
    const now = Date.now();
    timeSpentPerQuestion.current[currentIndex] = (timeSpentPerQuestion.current[currentIndex] || 0) + (now - lastActiveTime.current);
    setCurrentIndex(newIdx);
    lastActiveTime.current = now;
  };
  
  const toggleBookmark = (idx) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(idx)) { next.delete(idx); toast.success("Removed Bookmark."); } 
      else { next.add(idx); toast.success("Bookmarked."); }
      return next;
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

        let correct = 0;
        const subjBreakdown = { Math: {c:0, t:0}, ESAS: {c:0, t:0}, EE: {c:0, t:0} };
        const topicBreakdown = {};

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
                timeSpentMs: (timeSpent[idx] || 10) * 1000 
            };
        });

        if (currentUser && isOnline) {
            try {
                await syncTelemetryBatch(currentUser.uid, crypto.randomUUID(), config.subject, 'BOARD_SIM', attemptsPayload);
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
                // Make sync failures visible — results are still saved to the local
                // ledger below, but the user/dev should know analytics didn't update.
                const msg = syncError?.message === '[OFFLINE]'
                    ? 'Offline — exam saved locally; analytics will sync later.'
                    : `Telemetry sync failed: ${syncError?.message || 'unknown'}. Results saved locally.`;
                toast.error(msg);
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

      toast.success(`Battle loaded: ${pool.length} items, ${Math.round(timeLimitSecs / 60)} min`);
    } catch (err) {
      setSession(prev => ({ ...prev, loading: false, error: err.message }));
      toast.error(err.message);
    }
  };

  const exportOfflinePDF = async () => {};

  return {
    config, setConfig, session, setSession,
    currentIndex, setCurrentIndex, timeRemaining, showTime, setShowTime,
    bookmarks, toggleBookmark, startSimulation, startMultiplayerBattle, handleSelectOption,
    handleSelectConfidence, handleIndexChange, submitExam,
    hasSavedSession, resumeSimulation, handleFlagQuestion,
    exportOfflinePDF, isExporting, isSubmitting
  };
};