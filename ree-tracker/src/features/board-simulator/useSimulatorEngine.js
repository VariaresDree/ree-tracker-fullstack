// src/features/board-simulator/useSimulatorEngine.js
import { useState, useEffect, useRef } from 'react';
import { db } from '../../config/firebaseDb';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { generateQuestionsAI, generateMasterExplanation } from '../../services/geminiApi';
import { 
  updateQuestionCache,
  createMultiplayerBattle,
  fetchMultiplayerBattle,
  submitBattleScore,
  updateQuestionInBank,
  syncLiveBattleProgress
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
  const dynamicTOS = useStore(state => state.dynamicTOS);

  const [config, setConfig] = useState({
    mode: 'subject',
    subject: 'EE',
    count: 20,
    isPrcStandard: false,
    source: 'library',
    timeLimitMins: 30
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
  
  const [hasSavedSession, setHasSavedSession] = useState(!!localStorage.getItem('ree_sim_backup'));
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeSpentPerQuestion = useRef({});
  const lastActiveTime = useRef(Date.now());
  const totalExamTime = useRef(0);
  
  const currentAnswersRef = useRef({}); 
  const currentConfidencesRef = useRef({});

  // =========================================================================
  // FIX: DECOUPLED TIMER LOGIC
  // =========================================================================
  
  // 1. The Clock Tick (No longer tied to currentIndex, eliminating the reset bug)
  useEffect(() => {
    let interval = null;
    if (session.isActive && !session.isFinished) {
      interval = setInterval(() => {
        setTimeRemaining(t => (t > 0 ? t - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session.isActive, session.isFinished]);

  // 2. The Time-Out Trigger (Safely executes submit when clock hits 0)
  useEffect(() => {
    if (session.isActive && !session.isFinished && timeRemaining === 0 && totalExamTime.current > 0) {
       submitExam();
    }
  }, [timeRemaining, session.isActive, session.isFinished]);

  // =========================================================================

  const buildExamPool = async () => {
      let pool = [];
      let timeLimitSecs = config.timeLimitMins * 60;

      if (config.source === 'library') {
        const qRef = collection(db, "questions");
        const snap = await getDocs(query(qRef, limit(500)));
        const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(q => q.isFlagged !== true);

        if (config.mode === 'blended') {
          const mPool = allDocs.filter(q => q.subject === 'Mathematics').sort(() => 0.5 - Math.random()).slice(0, 25);
          const esPool = allDocs.filter(q => q.subject === 'ESAS').sort(() => 0.5 - Math.random()).slice(0, 30);
          const eePool = allDocs.filter(q => q.subject === 'EE').sort(() => 0.5 - Math.random()).slice(0, 45);
          if (mPool.length < 25 || esPool.length < 30 || eePool.length < 45) {
            throw new Error(`Insufficient library data for a Full Blended Mock.`);
          }
          pool = [...mPool, ...esPool, ...eePool].sort(() => 0.5 - Math.random());
          if (config.isPrcStandard) timeLimitSecs = 5 * 3600;
        } else {
          const subjectDocs = allDocs.filter(q => q.subject === config.subject);
          const targetCount = config.isPrcStandard ? 100 : config.count;
          if (subjectDocs.length < targetCount) throw new Error(`Only ${subjectDocs.length} questions available for ${config.subject}.`);
          pool = subjectDocs.sort(() => 0.5 - Math.random()).slice(0, targetCount);
          if (config.isPrcStandard) timeLimitSecs = config.subject === 'EE' ? 6 * 3600 : 4 * 3600;
          else if (!config.battleMode) timeLimitSecs = config.count * 144;
        }
      } else {
        if (!isOnline) throw new Error("Offline mode: Must use Local Library Vault.");
        if (config.mode === 'blended' || config.isPrcStandard) throw new Error("Full Board Mocks require Local Library Vault.");
        for (let i = 0; i < Math.ceil(config.count / 3); i++) {
          const subT = dynamicTOS[config.subject][Math.floor(Math.random() * dynamicTOS[config.subject].length)];
          const newQs = await generateQuestionsAI(config.subject, subT, false);
          pool = [...pool, ...newQs];
        }
        pool = pool.slice(0, config.count);
        if (!config.battleMode) timeLimitSecs = pool.length * 144;
      }

      return { pool: pool.map(q => q.options?.length > 0 ? { ...q, options: shuffleArray(q.options) } : q), timeLimitSecs };
  };

  const startSimulation = async () => {
    setSession(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const { pool, timeLimitSecs } = await buildExamPool();
      
      timeSpentPerQuestion.current = {};
      currentAnswersRef.current = {};
      currentConfidencesRef.current = {};
      lastActiveTime.current = Date.now();
      totalExamTime.current = timeLimitSecs;
      
      setSession({ isActive: true, isFinished: false, questions: pool, answers: {}, confidences: {}, loading: false, error: '', diagnostics: null, battleId: null });
      setCurrentIndex(0); setTimeRemaining(timeLimitSecs); setReviewUI({}); setBookmarks(new Set());
      setIsSubmitting(false);
      
      localStorage.removeItem('ree_sim_backup');
      setHasSavedSession(false);
    } catch (err) {
      setSession(prev => ({ ...prev, loading: false, error: err.message }));
      toast.error(err.message);
    }
  };

  const startMultiplayerBattle = async (battleId) => {
    setSession(prev => ({ ...prev, loading: true, error: '' }));
    try {
        const battleData = await fetchMultiplayerBattle(battleId);
        const pool = battleData.questions;
        const timeLimitSecs = battleData.timeLimitSecs;
        
        timeSpentPerQuestion.current = {};
        currentAnswersRef.current = {};
        currentConfidencesRef.current = {};
        lastActiveTime.current = Date.now();
        totalExamTime.current = timeLimitSecs;
        
        setSession({ isActive: true, isFinished: false, questions: pool, answers: {}, confidences: {}, loading: false, error: '', diagnostics: null, battleId: battleId });
        setCurrentIndex(0); setTimeRemaining(timeLimitSecs); setReviewUI({}); setBookmarks(new Set());
        setIsSubmitting(false);
        
        toast.success("Battle Initiated! Good luck.");
    } catch (err) {
        setSession(prev => ({ ...prev, loading: false, error: err.message }));
        toast.error(err.message);
    }
  };

  const exportOfflinePDF = async () => {
    setIsExporting(true);
    setSession(prev => ({ ...prev, loading: true }));
    try {
        const { pool } = await buildExamPool();
        const title = config.mode === 'blended' ? 'Full Blended PRC Mock' : `${config.subject}`;
        
        const { generateOfflineExamPDF } = await import('../../utils/pdfEngine');
        generateOfflineExamPDF(pool, title);
        
        toast.success("Offline PDF Compiled. Check your downloads.");
    } catch (err) {
        toast.error("Failed to compile PDF: " + err.message);
    } finally {
        setIsExporting(false);
        setSession(prev => ({ ...prev, loading: false }));
    }
  };

  const resumeSimulation = () => {
    const saved = localStorage.getItem('ree_sim_backup');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed.config);
      setSession(parsed.session);
      setCurrentIndex(parsed.currentIndex);
      setTimeRemaining(parsed.timeRemaining);
      totalExamTime.current = parsed.totalExamTime || parsed.timeRemaining; 
      
      currentAnswersRef.current = parsed.session.answers || {};
      currentConfidencesRef.current = parsed.session.confidences || {};
      
      if (parsed.bookmarks) setBookmarks(new Set(parsed.bookmarks));
      
      lastActiveTime.current = Date.now();
      
      localStorage.removeItem('ree_sim_backup');
      setHasSavedSession(false);
      toast.success("Matrix restored. Resuming simulation.");
    }
  };

  const handleSelectOption = (option) => {
      const newAnswers = { ...session.answers, [currentIndex]: option };
      currentAnswersRef.current = newAnswers; 
      
      const newState = { ...session, answers: newAnswers };
      setSession(newState);

      if (session.battleId) {
          let liveCorrect = 0;
          session.questions.forEach((q, idx) => {
              if (newAnswers[idx] === q.answer) liveCorrect++;
          });
          syncLiveBattleProgress(session.battleId, currentUser, liveCorrect, Object.keys(newAnswers).length)
              .catch(err => console.error("Live sync failed", err));
      }

      localStorage.setItem('ree_sim_backup', JSON.stringify({
          session: newState, config, currentIndex, timeRemaining,
          totalExamTime: totalExamTime.current, bookmarks: Array.from(bookmarks)
      }));
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
        localStorage.removeItem('ree_sim_backup');
        setHasSavedSession(false);

        const now = Date.now();
        timeSpentPerQuestion.current[currentIndex] = (timeSpentPerQuestion.current[currentIndex] || 0) + (now - lastActiveTime.current);

        const finalizedAnswers = currentAnswersRef.current;
        const finalizedConfidences = currentConfidencesRef.current;

        // 1. Construct a lightweight payload (NO MATH OR GRADING DONE HERE)
        const attemptsPayload = session.questions.map((q, idx) => ({
            idx,
            questionId: q.id,
            userAnswer: finalizedAnswers[idx],
            confidence: finalizedConfidences[idx] || 'low',
            timeSpentSecs: Math.floor((timeSpentPerQuestion.current[idx] || 0) / 1000),
            isBookmarked: bookmarks.has(idx)
        }));

        // 2. Dispatch to the Backend API securely
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/exams/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: currentUser.uid,
                attempts: attemptsPayload,
                config: config,
                timeRemaining: timeRemaining,
                totalExamTime: totalExamTime.current
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Server rejected telemetry payload.");
        }

        // 3. Receive the graded diagnostics and new stats from the server
        const { diagnostics, newStats } = await response.json();

        // 4. Update Client UI State with Server Results
        setSession(prev => ({ 
            ...prev, 
            isFinished: true, 
            isActive: false, 
            diagnostics,
            answers: finalizedAnswers,
            questions: prev.questions.map((q, i) => ({ ...q, userAnswer: finalizedAnswers[i] })) 
        }));
        setCurrentIndex(0);

        // 5. Update Zustand store directly with the server-calculated stats
        useStore.getState().setStats(newStats);

        toast.success('Simulation telemetry verified and saved.', { id: loadingToastId });

    } catch (err) {
        toast.error(`Error: ${err.message}`, { id: loadingToastId });
        console.error("Submit Exam Error:", err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const toggleOfflinePanel = () => {
    setReviewUI(prev => {
      const current = prev[currentIndex] || {};
      return { ...prev, [currentIndex]: { ...current, activePanel: current.activePanel === 'offline' ? null : 'offline' } };
    });
  };

  const fetchOrToggleAI = async (question) => {
    setReviewUI(prev => {
      const current = prev[currentIndex] || {};
      if (current.aiResponse) return { ...prev, [currentIndex]: { ...current, activePanel: current.activePanel === 'ai' ? null : 'ai' } };
      return { ...prev, [currentIndex]: { ...current, activePanel: 'ai', loading: true } };
    });

    const currentData = reviewUI[currentIndex] || {};
    if (!currentData.aiResponse) {
      let finalResponse = question.cachedExplanation || await generateMasterExplanation(question);
      if (!question.cachedExplanation && question.id) {
        await updateQuestionCache(question.id, finalResponse);
        question.cachedExplanation = finalResponse;
      }
      setReviewUI(prev => ({ ...prev, [currentIndex]: { ...prev[currentIndex], aiResponse: finalResponse, loading: false } }));
    }
  };

  const refreshAIExplanation = async (question) => {
    setReviewUI(prev => ({ ...prev, [currentIndex]: { ...prev[currentIndex], loading: true } }));
    const newResponse = await generateMasterExplanation(question);
    if (question.id) {
      await updateQuestionCache(question.id, newResponse);
      question.cachedExplanation = newResponse;
    }
    setReviewUI(prev => ({ ...prev, [currentIndex]: { ...prev[currentIndex], aiResponse: newResponse, loading: false } }));
  };

  const handleFlagQuestion = async () => {
    const currentQ = session.questions[currentIndex];
    if (!currentQ || !currentQ.id) return toast.error("Cannot flag dynamic or un-indexed questions.");
    try {
        await updateQuestionInBank(currentQ.id, { isFlagged: true });
        setSession(prev => {
            const updatedQuestions = [...prev.questions];
            updatedQuestions[currentIndex] = { ...currentQ, isFlagged: true };
            return { ...prev, questions: updatedQuestions };
        });
        toast.success("Anomaly reported to Admin Matrix.");
    } catch (error) {
        toast.error("Failed to flag anomaly. Check connection.");
    }
  };

  return {
    config, setConfig, session, setSession,
    currentIndex, setCurrentIndex, timeRemaining, showTime, setShowTime,
    reviewUI, timeSpentPerQuestion, bookmarks, toggleBookmark,
    startSimulation, startMultiplayerBattle,
    handleSelectOption, handleSelectConfidence, handleIndexChange, submitExam, 
    toggleOfflinePanel, fetchOrToggleAI, refreshAIExplanation,
    hasSavedSession, resumeSimulation,
    handleFlagQuestion,
    exportOfflinePDF, isExporting, isSubmitting
  };
};