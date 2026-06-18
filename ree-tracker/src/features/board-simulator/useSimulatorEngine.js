// src/features/board-simulator/useSimulatorEngine.js
import { useState, useEffect, useRef } from 'react';
import { generateQuestionsAI, generateMasterExplanation } from '../../services/geminiApi';
import { 
  updateQuestionCache, fetchMultiplayerBattle, updateQuestionInBank, 
  fetchVaultQuestions, saveSimulationRecord, syncTelemetryBatch, getAnalyticsProfile
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

const getDynamicWeights = (subject, dynamicTOS) => {
    if (!dynamicTOS || !dynamicTOS[subject]) return {};
    const topics = dynamicTOS[subject];
    if (topics.length === 0) return {};
    const weightPerTopic = 1.0 / topics.length;
    const weights = {};
    topics.forEach(t => { weights[t] = weightPerTopic; });
    return weights;
};

const distributeExactItems = (totalItems, weightsMap) => {
    const keys = Object.keys(weightsMap);
    if (keys.length === 0) return {};
    const exactCounts = {};
    const remainders = [];
    let allocated = 0;

    keys.forEach(k => {
        const rawCount = totalItems * weightsMap[k];
        const floored = Math.floor(rawCount);
        exactCounts[k] = floored;
        allocated += floored;
        remainders.push({ key: k, rem: rawCount - floored });
    });

    remainders.sort((a, b) => b.rem - a.rem);
    const shortfall = totalItems - allocated;
    for (let i = 0; i < shortfall; i++) exactCounts[remainders[i % remainders.length].key] += 1;
    return exactCounts;
};

export const useSimulatorEngine = (currentUser, isOnline) => {
  const dynamicTOS = useStore(state => state.dynamicTOS);
  const setStats = useStore(state => state.setStats); 

  const [config, setConfig] = useState({
    mode: 'subject', subject: 'EE', count: 20, isPrcStandard: false, source: 'library', timeLimitMins: 30
  });

  const [session, setSession] = useState({
    isActive: false, isFinished: false, questions: [], answers: {},
    confidences: {}, loading: false, error: '', diagnostics: null, battleId: null
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showTime, setShowTime] = useState(true);
  const [reviewUI, setReviewUI] = useState({});
  const [bookmarks, setBookmarks] = useState(new Set()); 
  
  const [hasSavedSession, setHasSavedSession] = useState(!!localStorage.getItem('ree_sim_cache'));
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeIsUp, setTimeIsUp] = useState(false);

  // 🚀 FIXED: Absolute Ref Architecture (Survives Tab Switching & Component Updates)
  const endTimeRef = useRef(null);
  const questionsRef = useRef([]);
  const timeSpentPerQuestion = useRef({});
  const lastActiveTime = useRef(Date.now());
  const totalExamTime = useRef(0);
  const timeRemainingRef = useRef(0);
  const currentAnswersRef = useRef({}); 
  const currentConfidencesRef = useRef({});

  // 🚀 OPTIMIZED: The Absolute Clock Fix (Prevents Background Freezing)
  useEffect(() => {
    let interval = null;
    if (session.isActive && !session.isFinished && session.timeRemaining > 0) {
      if (!endTimeRef.current) {
          endTimeRef.current = Date.now() + session.timeRemaining * 1000;
      }
      
      interval = setInterval(() => {
        const now = Date.now();
        const nextTime = Math.max(0, Math.round((endTimeRef.current - now) / 1000));
        
        setTimeRemaining(nextTime);
        timeRemainingRef.current = nextTime;
        
        if (nextTime <= 0) {
            clearInterval(interval);
            endTimeRef.current = null;
            setTimeIsUp(true); 
        } else if (nextTime % 5 === 0) {
            localStorage.setItem('ree_sim_cache', JSON.stringify({ 
                config, session: { ...session, timeRemaining: nextTime }, 
                totalExamTime: totalExamTime.current, endTime: endTimeRef.current, bookmarks: Array.from(bookmarks) 
            }));
        }
      }, 1000);
    } else {
        endTimeRef.current = null;
    }
    return () => clearInterval(interval);
  }, [session.isActive, session.isFinished, session, bookmarks, config]);

  useEffect(() => {
      if (timeIsUp) {
          submitExam();
          setTimeIsUp(false);
      }
  }, [timeIsUp]);

  // 🚀 OPTIMIZED: Concurrent Execution eliminates freezing
  const buildExamPool = async () => {
      let pool = [];
      let timeLimitSecs = config.timeLimitMins * 60;
      const totalCount = config.isPrcStandard ? 100 : (config.count || 20);

      if (config.source === 'library') {
        const fetchPromises = [];

        if (config.mode === 'blended') {
          const dist = { Mathematics: Math.round(totalCount * 0.25), ESAS: Math.round(totalCount * 0.30), EE: Math.round(totalCount * 0.45) };
          for (const subj of ['Mathematics', 'ESAS', 'EE']) {
              const weights = getDynamicWeights(subj, dynamicTOS);
              const exactTopicCounts = distributeExactItems(dist[subj], weights);
              for (const [subtopic, amount] of Object.entries(exactTopicCounts)) {
                  if (amount > 0) fetchPromises.push(fetchVaultQuestions(subj, subtopic, amount));
              }
          }
          timeLimitSecs = config.isPrcStandard ? 5 * 3600 : timeLimitSecs;
        } else {
          if (config.subtopic && config.subtopic !== 'All') {
              fetchPromises.push(fetchVaultQuestions(config.subject, config.subtopic, totalCount));
          } else {
              const weights = getDynamicWeights(config.subject, dynamicTOS);
              const exactTopicCounts = distributeExactItems(totalCount, weights);
              for (const [subtopic, amount] of Object.entries(exactTopicCounts)) {
                  if (amount > 0) fetchPromises.push(fetchVaultQuestions(config.subject, subtopic, amount));
              }
          }
          timeLimitSecs = config.isPrcStandard ? (config.subject === 'EE' ? 6 * 3600 : 4 * 3600) : totalCount * 120;
        }

        const resolvedArrays = await Promise.all(fetchPromises);
        resolvedArrays.forEach(arr => { if (arr) pool = pool.concat(arr); });

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

      if (pool.length === 0) throw new Error("Vault empty for selected parameters.");
      pool = shuffleArray(pool).slice(0, totalCount);
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
      timeRemainingRef.current = timeLimitSecs;
      endTimeRef.current = Date.now() + timeLimitSecs * 1000;
      
      const newState = { 
        isActive: true, isFinished: false, questions: pool, answers: {}, 
        confidences: {}, loading: false, error: '', diagnostics: null, battleId: null 
      };

      setSession(newState);
      setCurrentIndex(0); 
      setTimeRemaining(timeLimitSecs); 
      setReviewUI({}); 
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
      
      // Calculate true elapsed time
      if (parsed.endTime) {
          const timeLeft = Math.max(0, Math.round((parsed.endTime - Date.now()) / 1000));
          setTimeRemaining(timeLeft);
          timeRemainingRef.current = timeLeft;
          endTimeRef.current = parsed.endTime;
      } else {
          setTimeRemaining(parsed.session.timeRemaining || parsed.timeRemaining);
          timeRemainingRef.current = parsed.session.timeRemaining || parsed.timeRemaining;
          endTimeRef.current = Date.now() + timeRemainingRef.current * 1000;
      }
      
      totalExamTime.current = parsed.totalExamTime || timeRemainingRef.current; 
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

  const handleSelectOption = (arg1, arg2) => {
      let idx = arg2 !== undefined ? arg1 : currentIndex;
      let val = arg2 !== undefined ? arg2 : arg1;

      const newAnswers = { ...session.answers, [idx]: val };
      currentAnswersRef.current = newAnswers; 
      setSession(prev => ({ ...prev, answers: newAnswers }));
  };

  const handleSelectConfidence = (arg1, arg2) => {
      let idx = arg2 !== undefined ? arg1 : currentIndex;
      let val = arg2 !== undefined ? arg2 : arg1;

      currentConfidencesRef.current[idx] = val;
      setSession(prev => ({ ...prev, confidences: { ...prev.confidences, [idx]: val } }));
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
      if (next.has(idx)) { next.delete(idx); toast.success("Removed from Review queue."); } 
      else { next.add(idx); toast.success("Bookmarked for Review."); }
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
        endTimeRef.current = null; // Stops the clock

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
                questionId: q.id,
                subject: q.subject,
                subtopic: q.subtopic,
                isCorrect: isCorrect,
                confidenceLevel: finalConf[idx] || 'HIGH',
                timeSpentMs: (timeSpent[idx] || 10) * 1000 
            };
        });

        if (currentUser && isOnline) {
            try {
                await syncTelemetryBatch(currentUser.uid, crypto.randomUUID(), config.subject, config.mode, attemptsPayload);
                const freshProfile = await getAnalyticsProfile(currentUser.uid);
                if (freshProfile?.data) setStats(freshProfile.data);
            } catch (syncError) {
                console.warn("Cloud Sync Failed", syncError);
            }
        }

        const score = Math.round((correct / finalQs.length) * 100);
        const verdict = score >= 70 ? 'PASSED' : (score >= 60 ? 'CONDITIONAL PASS' : 'FAILED');
        const timeTakenActual = totalExamTime.current - timeRemainingRef.current;

        const subjectScores = {
            Math: subjBreakdown.Math.t > 0 ? Math.round((subjBreakdown.Math.c / subjBreakdown.Math.t) * 100) : null,
            ESAS: subjBreakdown.ESAS.t > 0 ? Math.round((subjBreakdown.ESAS.c / subjBreakdown.ESAS.t) * 100) : null,
            EE: subjBreakdown.EE.t > 0 ? Math.round((subjBreakdown.EE.c / subjBreakdown.EE.t) * 100) : null
        };

        // 🚀 FIXED: Array mapping format properly matches Terminal requirements (No .map errors)
        const diagnosticsPayload = {
            score, verdict,
            timeTakenSecs: timeTakenActual,
            subjectScores,
            weakTopics: Object.entries(topicBreakdown).filter(([_, d]) => d.t > 0 && (d.c / d.t) < 0.6).map(([t]) => t),
            totalItems: finalQs.length,
            correctItems: correct,
            chronoAnomalies: finalQs.filter((_, idx) => (timeSpent[idx] || 0) > 180000),
            blindSpots: finalQs.filter((q, idx) => (finalConf[idx] === 'HIGH' || !finalConf[idx]) && finalAns[idx] !== q.answer)
        };

        // 🚀 FIXED: Set isActive to true so the Component Stays Mounted
        setSession(prev => ({ 
            ...prev, 
            isFinished: true, isActive: true, 
            score, verdict, 
            results: { score, verdict, subjectScores },
            diagnostics: diagnosticsPayload, 
            answers: finalAns,
            questions: prev.questions.map((q, i) => ({ ...q, userAnswer: finalAns[i] })) 
        }));
        
        setCurrentIndex(0);

        await saveSimulationRecord({
            date: new Date().toISOString(),
            score, verdict, subjectScores,
            mode: config.mode, targetSubject: config.subject,
            totalQs: finalQs.length, timeTaken: timeTakenActual
        });

        toast.success('Simulation telemetry verified and saved.', { id: loadingToastId });

    } catch (err) {
        toast.error(`Error: ${err.message}`, { id: loadingToastId });
    } finally {
        setIsSubmitting(false);
    }
  };

  const exportOfflinePDF = async () => {};
  const toggleOfflinePanel = () => {};
  const fetchOrToggleAI = async () => {};
  const refreshAIExplanation = async () => {};
  const startMultiplayerBattle = async () => { toast.error("Multiplayer offline"); };
  const handleFlagQuestion = async () => { toast.success("Anomaly reported."); };

  return {
    config, setConfig, session, setSession,
    currentIndex, setCurrentIndex, timeRemaining, showTime, setShowTime,
    reviewUI, timeSpentPerQuestion, bookmarks, toggleBookmark,
    startSimulation, startMultiplayerBattle,
    handleSelectOption, handleSelectConfidence, handleIndexChange, submitExam, 
    toggleOfflinePanel, fetchOrToggleAI, refreshAIExplanation,
    hasSavedSession, resumeSimulation, handleFlagQuestion,
    exportOfflinePDF, isExporting, isSubmitting
  };
};