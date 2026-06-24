// src/pages/ActiveReview.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import LatexRenderer from '../components/LatexRenderer';
import Scratchpad from '../components/Scratchpad'; 
import ReviewSetup from '../features/active-recall/ReviewSetup';
import MCQMode from '../features/active-recall/MCQMode';
import FlashcardMode from '../features/active-recall/FlashcardMode';
import { useReviewSession } from '../features/active-recall/useReviewSession';

export default function ActiveReview() {
  const isOnline = useNetworkStatus();
  const { currentUser } = useAuth();
  
  const {
    config, setConfig, session, setSession, elapsedTime, bookmarks,
    startSession, endSession, loadNextQuestion, 
    handleAnswerSelection, handleFlashcardReveal, handleFlashcardRating,
    toggleBookmark, handleFlagQuestion, fetchOrToggleAI, safeTOS, isSubmitting
  } = useReviewSession(currentUser, isOnline);

  const [showScratchpad, setShowScratchpad] = useState(false);
  const currentQ = session.questions[session.currentIndex];

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (!session.isActive || !currentQ || showScratchpad) return;
        const key = e.key.toLowerCase();

        if (config.sessionMode === 'mcq') {
            if (!session.isAnswered) {
                if (key === 'q') setSession(prev => ({ ...prev, confidence: 'LOW' }));
                if (key === 'w') setSession(prev => ({ ...prev, confidence: 'MED' }));
                if (key === 'e') setSession(prev => ({ ...prev, confidence: 'HIGH' }));

                if (session.confidence) {
                    if (key === '1' && currentQ.options?.[0]) handleAnswerSelection(currentQ.options[0]);
                    if (key === '2' && currentQ.options?.[1]) handleAnswerSelection(currentQ.options[1]);
                    if (key === '3' && currentQ.options?.[2]) handleAnswerSelection(currentQ.options[2]);
                    if (key === '4' && currentQ.options?.[3]) handleAnswerSelection(currentQ.options[3]);
                }
            } else if (key === 'enter' || key === 'arrowright') {
                loadNextQuestion();
            }
        }

        if (config.sessionMode === 'flashcard') {
            if (key === ' ' && !session.isFlipped) {
                e.preventDefault(); 
                handleFlashcardReveal();
            } else if (session.isFlipped && !session.isAnswered) {
                if (key === '1') handleFlashcardRating('again');
                if (key === '2') handleFlashcardRating('hard');
                if (key === '3') handleFlashcardRating('good');
                if (key === '4') handleFlashcardRating('easy');
            } else if (session.isAnswered && (key === 'enter' || key === 'arrowright')) {
                loadNextQuestion();
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, config.sessionMode, showScratchpad, currentQ, handleAnswerSelection, handleFlashcardReveal, handleFlashcardRating, loadNextQuestion, setSession]);

  const formatTime = (secs) => `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  if (!session.isActive) {
      return <ReviewSetup config={config} setConfig={setConfig} isOnline={isOnline} startSession={startSession} session={session} safeTOS={safeTOS} />;
  }

  if (!currentQ) return <div className="flex justify-center items-center h-64"><span className="telemetry-spinner !w-12 !h-12 border-reeBlue"></span></div>;

  const isBookmarked = bookmarks.has(currentQ.id);
  const isCalculation = currentQ.type === 'calculation';
  
  // 🚀 FIXED: Dynamic Check for the Last Question in the Session
  const isLastQuestion = session.currentIndex + 1 >= session.questions.length;

  return (
    <div className="flex flex-col gap-6 page-fade-in pb-12 max-w-4xl mx-auto w-full relative z-0">
      <Scratchpad isOpen={showScratchpad} onClose={() => setShowScratchpad(false)} />

      <div className="flex justify-between items-center bg-surface/60 backdrop-blur-xl border border-border2/50 px-6 py-4 rounded-full shadow-sm z-10">
        <button onClick={endSession} disabled={isSubmitting} className="px-5 py-2 rounded-full border border-reeRed/30 bg-reeRed/10 text-reeRed text-[0.65rem] font-black uppercase tracking-widest hover:bg-reeRed/20 hover:border-reeRed/50 transition-all cursor-pointer flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-reeRed"></div> EXIT
        </button>
        <div className="flex items-center gap-4">
            <div className="hidden sm:flex px-4 py-2 rounded-full border border-border2/60 bg-surface2/50 text-muted text-[0.6rem] font-black uppercase tracking-widest items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-reeGreen animate-pulse"></div> Hotkeys Active
            </div>
            <div className={`px-4 py-2 rounded-full text-[0.6rem] font-black uppercase tracking-widest ${config.sessionMode === 'mcq' ? 'bg-reeBlue/10 text-reeBlue' : 'bg-reePurple/10 text-reePurple'}`}>
                {config.sessionMode} Mode
            </div>
            <div className={`text-sm font-black w-14 text-right ${elapsedTime > 180 ? 'text-reeRed animate-pulse' : 'text-white'}`}>
                {formatTime(elapsedTime)}
            </div>
        </div>
      </div>

      <div className="p-8 sm:p-10 bg-surface/80 backdrop-blur-2xl border border-border2/60 rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden transition-colors duration-700">

          <div className="absolute -top-12 -right-10 text-[14rem] opacity-[0.02] pointer-events-none select-none z-0">
              {isCalculation ? '🧮' : '🧠'}
          </div>

          {/* Prompt + subject eyebrow + Item N badge are owned by QuestionCard
              (inside MCQMode below) — the standalone block that used to live
              here rendered them a second time, hence the visible duplicate.
              Item action icons (scratchpad / flag / bookmark) are injected
              through QuestionCard's `headerSlot` so they sit next to the
              eyebrow with no overlap. */}

          {config.sessionMode === 'mcq' ? (
              <MCQMode
                  session={session}
                  setSession={setSession}
                  handleAnswerSelection={handleAnswerSelection}
                  index={session.currentIndex}
                  headerSlot={
                    <div className="flex gap-2">
                      <button onClick={() => setShowScratchpad(!showScratchpad)} aria-label="Open scratchpad" className="w-10 h-10 rounded-full bg-surface2/50 hover:bg-surface3 border border-border2/60 flex items-center justify-center transition-colors text-muted hover:text-textMain cursor-pointer">✏️</button>
                      <button onClick={handleFlagQuestion} disabled={currentQ.isFlagged} aria-label={currentQ.isFlagged ? 'Already flagged' : 'Flag question'} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${currentQ.isFlagged ? 'bg-reeRed/10 border-reeRed/30 text-reeRed' : 'bg-surface2/50 hover:bg-surface3 border-border2/60 text-muted hover:text-reeRed cursor-pointer'}`}>🚩</button>
                      <button onClick={toggleBookmark} aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${isBookmarked ? 'bg-reeAmber/10 border-reeAmber/40 text-reeAmber shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-surface2/50 hover:bg-surface3 border-border2/60 text-muted hover:text-reeAmber'}`}>🔖</button>
                    </div>
                  }
              />
          ) : (
              // Flashcard mode still has its own flip surface; the prompt
              // rendering there is handled inside FlashcardMode.
              <>
                  <div className="text-xl sm:text-2xl font-medium text-white leading-relaxed relative z-10 mb-10 overflow-x-auto math-scroll-mobile drop-shadow-sm [&_p]:!m-0 [&_.katex-display]:!m-0 [&_.katex-display]:!py-0">
                      <LatexRenderer content={currentQ.text || currentQ.question} />
                  </div>
                  <FlashcardMode session={session} handleFlashcardReveal={handleFlashcardReveal} handleFlashcardRating={handleFlashcardRating} />
              </>
          )}

          {session.isAnswered && (
              <div className="mt-10 pt-8 border-t border-border2/40 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 relative z-10">
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                      {currentQ.fixedExplanation && (
                          <button onClick={() => setSession(p => ({ ...p, showOffline: !p.showOffline, showAi: false }))} className={`flex-1 py-4 rounded-full text-xs font-black uppercase tracking-widest transition-all border cursor-pointer shadow-sm flex items-center justify-center gap-2 hover:-translate-y-0.5 ${session.showOffline ? 'bg-reeCyan/10 border-reeCyan/40 text-reeCyan' : 'bg-surface2/50 hover:bg-surface3 border-border2/60 text-textMain hover:border-reeCyan/30'}`}>
                              💾 {session.showOffline ? 'Hide Matrix Solution' : 'Reveal Matrix Solution'}
                          </button>
                      )}
                      <button onClick={fetchOrToggleAI} disabled={session.aiLoading || (!isOnline && !currentQ.cachedExplanation)} className={`flex-1 py-4 rounded-full text-xs font-black uppercase tracking-widest transition-all border cursor-pointer shadow-sm flex items-center justify-center gap-2 hover:-translate-y-0.5 ${session.showAi ? 'bg-reePurple/10 border-reePurple/40 text-reePurple' : 'bg-surface2/50 hover:bg-surface3 border-border2/60 text-reePurple hover:border-reePurple/30'}`}>
                          {session.aiLoading ? <span className="telemetry-spinner !w-3 !h-3"></span> : '✨'} AI Deep Derivation
                      </button>
                  </div>

                  {session.showOffline && currentQ.fixedExplanation && (
                      <div className="p-6 rounded-3xl bg-surface2/40 border border-reeCyan/30 shadow-inner">
                          <div className="text-[0.65rem] font-black text-reeCyan uppercase tracking-widest mb-3">Matrix Derivation</div>
                          <div className="text-sm text-textMain/90 leading-relaxed [&_p]:!m-0 [&_.katex-display]:!m-0"><LatexRenderer content={currentQ.fixedExplanation} /></div>
                      </div>
                  )}

                  {session.showAi && session.aiResponse && (
                      <div className="p-6 rounded-3xl bg-surface2/40 border border-reePurple/30 shadow-inner">
                          <div className="text-[0.65rem] font-black text-reePurple uppercase tracking-widest mb-3 flex items-center gap-2">
                              <span className="animate-pulse">✨</span> Gemini Core Analysis
                          </div>
                          <div className="text-sm text-textMain/90 leading-relaxed [&_p]:!m-0 [&_.katex-display]:!m-0"><LatexRenderer content={session.aiResponse} /></div>
                      </div>
                  )}

                  <div className="flex justify-between items-center mt-4">
                      <div className="text-[0.65rem] font-black text-muted uppercase tracking-widest bg-surface2/50 border border-border2/60 px-5 py-2.5 rounded-full">
                          Streak: <span className="text-reeGreen text-sm">{session.correctHits}</span> / {session.totalAnswered}
                      </div>
                      
                      {/* 🚀 FIXED: Dynamic Button sets accurate psychological expectation */}
                      <button onClick={loadNextQuestion} className={`px-8 py-4 text-white font-black rounded-full text-xs uppercase tracking-widest transition-all cursor-pointer hover:-translate-y-0.5 flex items-center gap-3 ${isLastQuestion ? 'bg-reeGreen hover:bg-green-500 shadow-[0_4px_20px_rgba(34,197,94,0.3)]' : 'bg-reeBlue hover:bg-blue-500 shadow-[0_4px_20px_rgba(59,130,246,0.3)]'}`}>
                          {isLastQuestion ? 'Complete Session 🏁' : 'Next Target ➔'}
                      </button>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}