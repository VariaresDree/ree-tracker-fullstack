// src/pages/ActiveReview.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import LatexRenderer from '../components/LatexRenderer';
import toast from 'react-hot-toast';

import { useReviewSession } from '../features/active-recall/useReviewSession';
import ReviewSetup from '../features/active-recall/ReviewSetup';
import MCQMode from '../features/active-recall/MCQMode';
import FlashcardMode from '../features/active-recall/FlashcardMode';
import Scratchpad from '../components/Scratchpad'; 
import SmartText from '../components/SmartText'; 

import { saveBookmark, removeBookmark } from '../services/dbQueries';

export default function ActiveReview() {
  const isOnline = useNetworkStatus();
  const { currentUser } = useAuth();
  const stats = useStore(state => state.stats);

  const {
    config, setConfig, session, setSession, timer, libraryCache,
    loadNextQuestion, handleAnswerSelection, handleFlashcardReveal,
    handleFlashcardRating, handleFetchAI, handleRefreshAI,
    handleFlagQuestion 
  } = useReviewSession(currentUser, stats, isOnline);

  const [showScratchpad, setShowScratchpad] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    setShowScratchpad(false);
    setIsBookmarked(false);
  }, [session.currentQ?.id]);

  const toggleBookmark = async () => {
    if (!session.currentQ) return;
    
    try {
      if (!isBookmarked) {
        await saveBookmark(currentUser.uid, {
          id: session.currentQ.id,
          type: config.sessionMode === 'mcq' ? 'Question' : 'Flashcard',
          subject: session.currentQ.subject || 'General',
          subtopic: session.currentQ.subtopic || 'Uncategorized',
          content: session.currentQ.text || session.currentQ.question || "Encrypted Content",
          options: session.currentQ.options || [],
          answer: session.currentQ.answer || null,
          fixedExplanation: session.currentQ.fixedExplanation || null,
        });
        setIsBookmarked(true);
        toast.success("Secured in Bookmark Vault.");
      } else {
        await removeBookmark(currentUser.uid, session.currentQ.id);
        setIsBookmarked(false);
        toast.success("Removed from Vault.");
      }
    } catch (error) {
      toast.error("Failed to update Vault.");
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const confRef = useRef(session.confidence);
  useEffect(() => { confRef.current = session.confidence; }, [session.confidence]);

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        if (showScratchpad) return;

        const key = e.key.toLowerCase();

        if (session.isActive && session.currentQ) {
            if (!session.isAnswered) {
                if (key === 'q') { setSession(prev => ({ ...prev, confidence: 'low' })); confRef.current = 'low'; }
                if (key === 'w') { setSession(prev => ({ ...prev, confidence: 'med' })); confRef.current = 'med'; }
                if (key === 'e') { setSession(prev => ({ ...prev, confidence: 'high' })); confRef.current = 'high'; }
            }

            if (config.sessionMode === 'mcq' && !session.isAnswered) {
                if (['1', 'a'].includes(key) && session.currentQ.options?.[0]) handleAnswerSelection(session.currentQ.options[0], formatTime, confRef.current);
                if (['2', 'b'].includes(key) && session.currentQ.options?.[1]) handleAnswerSelection(session.currentQ.options[1], formatTime, confRef.current);
                if (['3', 'c'].includes(key) && session.currentQ.options?.[2]) handleAnswerSelection(session.currentQ.options[2], formatTime, confRef.current);
                if (['4', 'd'].includes(key) && session.currentQ.options?.[3]) handleAnswerSelection(session.currentQ.options[3], formatTime, confRef.current);
            }

            if (config.sessionMode === 'flashcard') {
                if (key === ' ' && !session.isFlipped) {
                    e.preventDefault(); 
                    handleFlashcardReveal();
                }
                if (session.isFlipped && !session.isAnswered) {
                    if (key === '1') handleFlashcardRating('again');
                    if (key === '2') handleFlashcardRating('hard');
                    if (key === '3') handleFlashcardRating('easy');
                }
            }

            if (session.isAnswered && key === 'arrowright') {
                loadNextQuestion();
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, config.sessionMode, showScratchpad, setSession, handleAnswerSelection, handleFlashcardReveal, handleFlashcardRating, loadNextQuestion]);

  // OFFLINE BUTTON LOCK LOGIC
  const hasCache = session.currentQ?.cachedExplanation || session.currentQ?.fixedExplanation;
  const isOfflineLocked = !isOnline && !hasCache;

  return (
    <div className="flex flex-col gap-6 page-fade-in pb-12 max-w-3xl mx-auto w-full">
      {!session.isActive ? (
        <ReviewSetup config={config} setConfig={setConfig} session={session} stats={stats} isOnline={isOnline} loadNextQuestion={loadNextQuestion} libraryCache={libraryCache} />
      ) : (
        <div className="flex flex-col gap-6">
          
          <div className="flex justify-between items-center bg-surface border border-border2 p-3 rounded-xl shadow-sm">
            <button onClick={() => setSession({...session, isActive: false})} className="px-4 py-1.5 bg-surface2 hover:bg-reeRed/10 text-muted hover:text-reeRed border border-border2 hover:border-reeRed/30 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-2">
              <span>🚪</span> Exit Session
            </button>
            <div className="flex gap-4 items-center pr-3">
              <span className="hidden sm:inline-block text-[0.6rem] font-bold uppercase tracking-widest text-muted2 border border-border2 px-2 py-0.5 rounded bg-surface2">
                ⌨️ Hotkeys Active
              </span>
              <span className={`text-[0.65rem] uppercase tracking-widest font-bold border px-2 py-0.5 rounded ${config.sessionMode === 'mcq' ? 'text-reeBlue border-reeBlue/30 bg-reeBlue/10' : 'text-reePurple border-reePurple/30 bg-reePurple/10'}`}>
                {config.sessionMode === 'mcq' ? 'MCQ Mode' : 'Flashcard'}
              </span>
              <span className={`text-sm font-mono font-bold ${timer > 180 ? 'text-reeRed animate-pulse' : 'text-muted2'}`}>
                {formatTime(timer)}
              </span>
            </div>
          </div>

          {session.currentQ && (
            <div className="p-6 md:p-8 bg-surface border border-border2 rounded-2xl shadow-lg min-h-[400px] flex flex-col relative overflow-hidden">
              
              <div className="absolute top-6 right-6 flex gap-2 z-[45]">
                  <button onClick={() => setShowScratchpad(true)} className="p-2 bg-surface2 hover:bg-surface3 border border-border2 rounded-lg text-muted hover:text-reeCyan transition-colors shadow-sm cursor-pointer flex items-center justify-center" title="Open Digital Scratchpad">✏️</button>
                  <button onClick={handleFlagQuestion} disabled={session.currentQ?.isFlagged} className={`p-2 border rounded-lg transition-colors shadow-sm flex items-center justify-center ${session.currentQ?.isFlagged ? 'bg-reeAmber/20 border-reeAmber/50 text-reeAmber cursor-not-allowed' : 'bg-surface2 hover:bg-surface3 border-border2 text-muted hover:text-reeAmber cursor-pointer'}`} title={session.currentQ?.isFlagged ? "Error Already Reported" : "Report Error to Admin"}>
                      {session.currentQ?.isFlagged ? '⚠️' : '🚩'}
                  </button>
                  <button onClick={toggleBookmark} className={`p-2 border rounded-lg transition-colors shadow-sm cursor-pointer flex items-center justify-center ${isBookmarked ? 'bg-reeBlue/20 border-reeBlue/50 text-reeBlue' : 'bg-surface2 hover:bg-surface3 border-border2 text-muted hover:text-reeBlue'}`} title={isBookmarked ? "Remove Bookmark" : "Bookmark for Review Later"}>🔖</button>
              </div>

              <Scratchpad isOpen={showScratchpad} onClose={() => setShowScratchpad(false)} />

              <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 pointer-events-none text-9xl">
                {session.currentQ.type === 'conceptual' ? '🧠' : '🧮'}
              </div>

              <div className="flex justify-between items-start border-b border-border2 pb-4 mb-6 relative z-10 pr-32">
                <div className="flex flex-col gap-1">
                  <span className="text-[0.6rem] text-muted2 font-mono uppercase tracking-widest">Vector Target</span>
                  <span className="text-xs text-reeCyan font-bold bg-reeCyan/10 px-2 py-0.5 rounded border border-reeCyan/20">
                    {session.currentQ.subject === 'ESAS' ? 'ESAS' : session.currentQ.subject} › {session.currentQ.subtopic}
                  </span>
                </div>
              </div>

              <div className="text-sm md:text-base text-textMain mb-8 font-medium relative z-10 leading-relaxed overflow-x-auto math-scroll-mobile">
                <SmartText text={session.currentQ.text} />
              </div>

              {config.sessionMode === 'flashcard' ? (
                <FlashcardMode session={session} handleFlashcardReveal={handleFlashcardReveal} handleFlashcardRating={handleFlashcardRating} />
              ) : (
                <MCQMode session={session} setSession={setSession} handleAnswerSelection={handleAnswerSelection} formatTime={formatTime} timer={timer} />
              )}

              {session.feedback && (
                <div className={`mt-6 text-center font-bold text-xs uppercase tracking-widest bg-surface2 p-3 rounded-lg border page-fade-in relative z-10 ${session.wrongSelection || session.feedback.includes('Queue') ? 'text-reeRed border-reeRed/30' : 'text-reeGreen border-reeGreen/30'}`}>
                  {session.feedback}
                </div>
              )}

              {session.isAnswered && (
                <div className="mt-6 flex flex-col gap-4 page-fade-in relative z-10">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {session.currentQ.fixedExplanation && (
                      <button onClick={() => setSession(prev => ({ ...prev, showOffline: !prev.showOffline, showAi: false }))} className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer shadow-sm ${session.showOffline ? 'bg-reeCyan/10 border-reeCyan/50 text-reeCyan' : 'bg-surface2 hover:bg-surface3 border-border2 hover:border-reeCyan/30 text-textMain'}`}>
                        {session.showOffline ? 'Hide Solution' : '💾 Reveal Solution'}
                      </button>
                    )}
                    
                    {/* DYNAMIC OFFLINE/ONLINE AI BUTTON */}
                    <button 
                        onClick={handleFetchAI} 
                        disabled={isOfflineLocked || session.aiLoading} 
                        className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border shadow-sm ${
                            isOfflineLocked 
                                ? 'bg-bg border-border2 text-muted opacity-50 cursor-not-allowed' 
                                : session.showAi 
                                    ? 'bg-reePurple/10 border-reePurple/50 text-reePurple' 
                                    : !isOnline && hasCache
                                        ? 'bg-reePurple/5 hover:bg-reePurple/10 border-reePurple/30 text-reePurple cursor-pointer'
                                        : 'bg-surface2 hover:bg-surface3 border-border2 text-reePurple cursor-pointer'
                        }`}
                    >
                        {session.aiLoading ? (
                            <><span className="telemetry-spinner !w-3 !h-3"></span> Booting...</>
                        ) : session.showAi ? (
                            'Hide AI Explanation'
                        ) : !isOnline && hasCache ? (
                            '💡 View Cached Analysis (Offline)'
                        ) : (
                            '✨ Deep AI Derivation'
                        )}
                    </button>
                  </div>

                  {session.showOffline && session.currentQ.fixedExplanation && (
                    <div className="p-5 rounded-xl border bg-surface border-reeCyan/30 animate-in fade-in slide-in-from-top-2">
                      <div className="p-4 bg-reeCyan/5 border border-reeCyan/10 rounded-lg text-textMain text-sm leading-relaxed overflow-x-auto math-scroll-mobile"><LatexRenderer content={session.currentQ.fixedExplanation} /></div>
                    </div>
                  )}

                  {session.showAi && session.aiResponse && (
                    <div className="p-5 rounded-xl border bg-surface border-reePurple/30 animate-in fade-in slide-in-from-top-2">
                      <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center gap-2">
                             <span className="text-[0.65rem] font-bold text-reePurple uppercase tracking-widest">Deep AI Analysis</span>
                             {!isOnline && <span className="text-[0.55rem] bg-reePurple/10 text-reePurple px-2 py-0.5 rounded border border-reePurple/20 font-bold uppercase tracking-widest">Offline Cache</span>}
                         </div>
                        <button onClick={handleRefreshAI} disabled={session.aiLoading || !isOnline} className="text-reePurple hover:bg-reePurple/10 px-2 py-1 rounded text-[0.6rem] font-bold uppercase transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">🔄 Regenerate</button>
                      </div>
                      <div className="p-4 bg-reePurple/5 border border-reePurple/10 rounded-lg text-textMain text-sm leading-relaxed overflow-x-auto math-scroll-mobile"><LatexRenderer content={session.aiResponse} /></div>
                    </div>
                  )}
                </div>
              )}

              {session.isAnswered && (
                <div className="mt-8 flex justify-end border-t border-border2 pt-5 relative z-10 page-fade-in">
                  <button onClick={loadNextQuestion} disabled={session.aiLoading} className="px-8 py-3 bg-reeBlue hover:bg-reeBlue2 text-white rounded-xl text-sm font-bold tracking-wider uppercase shadow-md transition-colors cursor-pointer disabled:opacity-60 relative">
                    Next Item ⏭ <span className="absolute -top-2 -right-2 bg-surface2 text-muted text-[0.55rem] px-1.5 py-0.5 rounded border border-border2 hidden sm:block">[→]</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}