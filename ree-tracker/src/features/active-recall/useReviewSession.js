// src/features/active-recall/useReviewSession.js
import { useState, useEffect, useRef } from 'react';
import { generateQuestionsAI, generateMasterExplanation } from '../../services/geminiApi';
import { logSRSRecord, updateQuestionCache, fetchReviewQuestions, updateQuestionInBank } from '../../services/dbQueries';
import { TOS } from '../../config/constants';
import { calculateUpdatedStats } from '../../utils/irtMath';
import { useSRS } from '../../hooks/useSRS';
import { useStore } from '../../store/useStore';
import { get, set } from 'idb-keyval'; 
import toast from 'react-hot-toast';

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const useReviewSession = (currentUser, stats, isOnline) => {
  const { calculateNextReview } = useSRS();
  
  // Removed incrementDailyQuota to enforce atomic synchronization
  const setStats = useStore(state => state.setStats); 

  const [seenIds, setSeenIds] = useState(new Set());

  useEffect(() => {
    const loadMemoryMatrix = async () => {
      try {
        const stored = await get('ree_seen_q_ids');
        if (stored) setSeenIds(new Set(stored));
      } catch (err) {
        console.error("Failed to load memory matrix", err);
      }
    };
    loadMemoryMatrix();
  }, []);

  const persistSeenId = async (id) => {
    if (!id) return;
    setSeenIds(prevSet => {
      let memoryArray = Array.from(prevSet);
      if (!memoryArray.includes(id)) {
        memoryArray.push(id);
        if (memoryArray.length > 5000) {
          memoryArray = memoryArray.slice(memoryArray.length - 5000);
        }
      }
      set('ree_seen_q_ids', memoryArray).catch(console.error);
      return new Set(memoryArray);
    });
  };

  const [config, setConfig] = useState({
    sessionMode: 'mcq',
    cognitiveFocus: 'mixed', 
    studyMode: 'subtopic',
    subject: 'EE',
    subtopic: TOS['EE'][0],
    source: 'library'
  });

  const [session, setSession] = useState({
    isActive: false, currentQ: null, confidence: null, isAnswered: false, wrongSelection: null, 
    feedback: '', aiResponse: '', aiLoading: false, showAi: false, showOffline: false, isFlipped: false
  });

  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const libraryCache = useRef([]);

  useEffect(() => {
    let interval = null;
    if (timerActive && !session.isAnswered && !session.isFlipped) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    } else clearInterval(interval);
    return () => clearInterval(interval);
  }, [timerActive, session.isAnswered, session.isFlipped]);

  const getRandomTopic = () => {
    const subjects = Object.keys(TOS);
    const randSubj = subjects[Math.floor(Math.random() * subjects.length)];
    const topics = TOS[randSubj];
    return { subject: randSubj, subtopic: topics[Math.floor(Math.random() * topics.length)] };
  };

  const loadNextQuestion = async () => {
    setSession(prev => ({
      ...prev, isActive: true, isAnswered: false, confidence: null, wrongSelection: null, 
      feedback: '', showAi: false, showOffline: false, aiResponse: '', aiLoading: true, isFlipped: false
    }));
    setTimer(0);
    setTimerActive(false);

    try {
      let newQ = null;

      if (config.source === 'library' || config.studyMode === 'bleeding') {
        if (libraryCache.current.length === 0) {
          if (config.studyMode === 'bleeding') {
            const activeBlindSpotIds = stats?.blindSpots || [];
            if (activeBlindSpotIds.length === 0) {
              setSession(prev => ({ ...prev, feedback: '✓ Bleeding Edge Queue Cleared!', aiLoading: false }));
              toast.info('Bleeding Edge queue cleared. No blind spots.');
              return;
            }
          }
          
          const rawQuestions = await fetchReviewQuestions(config.studyMode, config.subject, config.subtopic, stats?.blindSpots);
          
          let unseenQuestions = rawQuestions.filter(q => !seenIds.has(q.id));
          
          if (unseenQuestions.length === 0 && rawQuestions.length > 0) {
              toast.success("Module Mastered! You've seen every question. Resetting cycle...");
              set('ree_seen_q_ids', []).catch(console.error);
              setSeenIds(new Set());
              unseenQuestions = rawQuestions; 
          }

          libraryCache.current = unseenQuestions;
          
          if (libraryCache.current.length === 0) {
            toast.error("No questions found for this topic.");
            setSession(prev => ({ ...prev, feedback: 'Review pool exhausted for these parameters.', aiLoading: false }));
            return;
          }
        }

        let pool = libraryCache.current;

        if (config.cognitiveFocus === 'conceptual') {
            const conceptualPool = pool.filter(q => q.type === 'conceptual');
            if (conceptualPool.length > 0) pool = conceptualPool;
        } else if (config.cognitiveFocus === 'calculation') {
            const mathPool = pool.filter(q => q.type === 'calculation');
            if (mathPool.length > 0) pool = mathPool;
        } 
        
        if (config.sessionMode === 'flashcard' && config.cognitiveFocus === 'mixed') {
          const conceptualPool = pool.filter(q => q.type === 'conceptual');
          if (conceptualPool.length > 0) pool = conceptualPool;
        }

        if (pool.length > 0) {
          pool = shuffleArray(pool);
          newQ = pool[0];
          libraryCache.current = libraryCache.current.filter(q => q.id !== newQ.id);
        }

      } else {
        if (!isOnline) {
          setSession(prev => ({ ...prev, feedback: '📡 Offline Mode: Cannot generate dynamic AI questions.', aiLoading: false }));
          return;
        }

        let targetSubj = config.subject;
        let targetTopic = config.subtopic;

        if (config.studyMode === 'interleaved') {
          const randoms = getRandomTopic();
          targetSubj = randoms.subject;
          targetTopic = randoms.subtopic;
        } else if (config.studyMode === 'subject') {
          targetTopic = TOS[targetSubj][Math.floor(Math.random() * TOS[targetSubj].length)];
        }

        const newQs = await generateQuestionsAI(targetSubj, targetTopic, config.source === 'web');
        
        if (newQs && newQs.length > 0) {
          if (config.cognitiveFocus === 'conceptual') newQ = newQs.find(q => q.type === 'conceptual') || newQs[0];
          else if (config.cognitiveFocus === 'calculation') newQ = newQs.find(q => q.type === 'calculation') || newQs[0];
          else if (config.sessionMode === 'flashcard') newQ = newQs.find(q => q.type === 'conceptual') || newQs[0];
          else newQ = newQs[0];
        }
      }

      if (newQ) {
        if (newQ.options && newQ.options.length > 0) {
          newQ = { ...newQ, options: shuffleArray(newQ.options) };
        }
        
        setSession(prev => ({ ...prev, currentQ: newQ, aiLoading: false }));
        setTimerActive(true);
      } else {
        setSession(prev => ({ ...prev, feedback: 'Review pool empty for these parameters.', aiLoading: false }));
        toast.error('No questions available. Adjust settings.');
      }
    } catch (error) {
      console.error("Boot Error:", error);
      setSession(prev => ({ ...prev, feedback: 'System error during initialization.', aiLoading: false }));
    }
  };

  const commitTelemetry = async (isCorrect, confLevel, topic, subject, qId, timeUsed) => {
    if (!currentUser?.uid) return;
    
    // CRITICAL FIX: Pull root quotas from store so they increment correctly instead of sticking at 1
    const storeState = useStore.getState();
    const fullPayload = {
        ...(storeState.stats || {}),
        dailyMath: storeState.dailyMath,
        dailyESAS: storeState.dailyESAS,
        dailyEE: storeState.dailyEE,
        lastActiveDate: storeState.lastActiveDate
    };

    // The atomic payload perfectly calculates quotas, calendar, heatmaps, and velocity in one go
    const updatedStats = calculateUpdatedStats(fullPayload, isCorrect, confLevel, topic || 'Uncategorized', subject, qId, timeUsed);
    
    try { 
        setStats(updatedStats); 
    } 
    catch (error) { toast.error('Failed to update local matrix.'); }
  };

  const handleAnswerSelection = async (selectedOption, formatTime, overrideConfidence = null) => {
    if (session.isAnswered) return;
    const finalConfidence = overrideConfidence || session.confidence;
    if (!finalConfidence) { toast.error('Target lock required: Select confidence vector.'); return; }

    setTimerActive(false);
    const isCorrect = selectedOption === session.currentQ.answer;

    persistSeenId(session.currentQ.id);

    setSession(prev => ({
      ...prev, isAnswered: true, wrongSelection: isCorrect ? null : selectedOption,
      confidence: finalConfidence, 
      feedback: isCorrect ? `✓ Correct! Resolution Time: ${formatTime(timer)}` : `✗ Incorrect. Locked into Bleeding Edge Queue.`,
      showAi: false, showOffline: false
    }));

    await commitTelemetry(isCorrect, finalConfidence, session.currentQ.subtopic, session.currentQ.subject, session.currentQ.id, timer);
  };

  const handleFlashcardReveal = () => { setSession(prev => ({ ...prev, isFlipped: true })); setTimerActive(false); };

  const handleFlashcardRating = async (rating) => {
    let isCorrect = false; let mappedConfidence = 'low';
    if (rating === 'easy') { isCorrect = true; mappedConfidence = 'high'; }
    else if (rating === 'hard') { isCorrect = true; mappedConfidence = 'med'; }
    else if (rating === 'again') { isCorrect = false; mappedConfidence = 'high'; }

    persistSeenId(session.currentQ.id);

    setSession(prev => ({
      ...prev, isAnswered: true, showAi: false, showOffline: false,
      feedback: rating === 'again' ? 'Logged to Bleeding Edge Matrix.' : 'Mastery compiled.'
    }));

    const newSrsPayload = calculateNextReview(rating, session.currentQ.srsData || null);
    
    if (currentUser?.uid && session.currentQ.id) {
      try {
        await logSRSRecord(currentUser.uid, session.currentQ.id, {
          ...newSrsPayload, questionId: session.currentQ.id, subject: session.currentQ.subject,
          subtopic: session.currentQ.subtopic, sourceText: session.currentQ.text
        });
      } catch (err) { toast.error('SRS update failed.'); }
    }
    
    await commitTelemetry(isCorrect, mappedConfidence, session.currentQ.subtopic, session.currentQ.subject, session.currentQ.id, timer);
  };

  // --- OFFLINE-RESILIENT AI EXPLANATION HANDLER ---
  const handleFetchAI = async () => {
    if (session.showAi && session.aiResponse) { 
        setSession(prev => ({ ...prev, showAi: false })); 
        return; 
    }
    if (session.aiResponse) {
        setSession(prev => ({ ...prev, showAi: true, showOffline: false })); 
        return;
    }

    const cachedData = session.currentQ.cachedExplanation || session.currentQ.fixedExplanation;

    if (!isOnline && !cachedData) {
        toast.error("Matrix Disconnected: No cached data available.");
        return;
    }

    setSession(prev => ({ ...prev, aiLoading: true, showAi: true, showOffline: false }));

    try {
        if (session.currentQ.cachedExplanation) { 
            setSession(prev => ({ ...prev, aiResponse: session.currentQ.cachedExplanation, aiLoading: false })); 
            return; 
        }

        if (!isOnline && session.currentQ.fixedExplanation) {
            setSession(prev => ({ ...prev, aiResponse: session.currentQ.fixedExplanation, aiLoading: false })); 
            return; 
        }

        const resp = await generateMasterExplanation(session.currentQ);
        if (session.currentQ.id) await updateQuestionCache(session.currentQ.id, resp);
        setSession(prev => ({ ...prev, aiResponse: resp, aiLoading: false, currentQ: { ...prev.currentQ, cachedExplanation: resp } }));
    } catch (err) {
        toast.error("AI Generation failed. Matrix may be offline.");
        setSession(prev => ({ ...prev, aiLoading: false, showAi: false }));
    }
  };

  const handleRefreshAI = async () => {
    setSession(prev => ({ ...prev, aiLoading: true }));
    try {
        const resp = await generateMasterExplanation(session.currentQ, true);
        if (session.currentQ.id) await updateQuestionCache(session.currentQ.id, resp);
        setSession(prev => ({ ...prev, aiResponse: resp, aiLoading: false, currentQ: { ...prev.currentQ, cachedExplanation: resp } }));
    } catch (err) {
        toast.error("AI Refresh failed.");
        setSession(prev => ({ ...prev, aiLoading: false }));
    }
  };

  const handleFlagQuestion = async () => {
    if (!session.currentQ || !session.currentQ.id) {
        toast.error("Cannot flag dynamic AI generated questions yet.");
        return;
    }
    try {
        await updateQuestionInBank(session.currentQ.id, { isFlagged: true });
        setSession(prev => ({ ...prev, currentQ: { ...prev.currentQ, isFlagged: true } }));
        toast.success("Anomaly reported to Admin Matrix.");
    } catch (error) { toast.error("Failed to flag anomaly. Check connection."); }
  };

  return {
    config, setConfig, session, setSession, timer, libraryCache,
    loadNextQuestion, handleAnswerSelection, handleFlashcardReveal,
    handleFlashcardRating, handleFetchAI, handleRefreshAI,
    handleFlagQuestion
  };
};