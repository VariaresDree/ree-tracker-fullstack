// src/features/board-simulator/SimulatorActive.jsx
//
// Board Simulator (and Combat / multiplayer) answering surface. Owns the
// exam-mode chrome — top toolbar, 1-100 question navigator, scratchpad,
// bookmark/flag controls, post-exam solutions (offline + AI), action nav.
// The actual prompt + confidence selector + choices + correct/incorrect
// reveal are delegated to the shared QuestionCard so this surface stays in
// lockstep with Active Review and Gauntlet.

import React, { useState, useEffect, useRef } from 'react';
import LatexRenderer from '../../components/LatexRenderer';
import Scratchpad from '../../components/Scratchpad';
import QuestionCard from '../quiz/QuestionCard';
import { generateMasterExplanation } from '../../services/geminiApi';
import toast from 'react-hot-toast';

export default function SimulatorActive({ engine, requestTerminate, isOnline }) {
  const {
    session, currentIndex, handleIndexChange, timeRemaining, showTime, setShowTime,
    handleSelectConfidence, handleSelectOption, bookmarks, toggleBookmark,
    handleFlagQuestion, submitExam,
  } = engine;

  const [showScratchpad, setShowScratchpad] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Local state for post-exam solution toggles
  const [activeSolution, setActiveSolution] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);

  const navScrollRef = useRef(null);

  const q = session.questions[currentIndex];
  const userAns = session.answers[currentIndex];
  const isReview = session.isFinished;
  const isCorrect = isReview ? userAns === q?.answer : false;
  const totalQuestions = session.questions.length;
  const isBookmarked = bookmarks.has(currentIndex);
  const isCriticalTime = timeRemaining < 300;

  // Reset review panels on navigation
  useEffect(() => {
    setActiveSolution(null);
    setAiLoading(false);
    setAiResponse(null);
  }, [currentIndex]);

  // Keep the active question centered in the horizontal navigator
  useEffect(() => {
    if (navScrollRef.current) {
      const activeBtn = navScrollRef.current.querySelector(`[data-index="${currentIndex}"]`);
      if (activeBtn) {
        const container = navScrollRef.current;
        const scrollTarget = activeBtn.offsetLeft - container.offsetWidth / 2 + activeBtn.offsetWidth / 2;
        container.scrollTo({ left: scrollTarget, behavior: 'smooth' });
      }
    }
  }, [currentIndex]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggleAI = async () => {
    if (activeSolution === 'ai') { setActiveSolution(null); return; }
    setActiveSolution('ai');
    if (q.cachedExplanation || aiResponse) return;

    setAiLoading(true);
    try {
      const resp = await generateMasterExplanation(q);
      setAiResponse(resp);
      q.cachedExplanation = resp;
    } catch (err) {
      toast.error('AI Core unreachable.');
      setActiveSolution(null);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!isReview && totalQuestions > 0) {
      const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isReview, totalQuestions]);

  // Simulator-owned keyboard handler — arrow keys for question nav, plus
  // confidence (Q/W/E) and option hotkeys (1-4 / A-D). QuestionCard's own
  // hotkeys prop is OFF here to avoid double-binding.
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || showScratchpad || showSubmitConfirm) return;
      const key = e.key.toLowerCase();

      if (key === 'arrowleft') { if (currentIndex > 0) handleIndexChange(currentIndex - 1); return; }
      if (key === 'arrowright') { if (currentIndex < totalQuestions - 1) handleIndexChange(currentIndex + 1); return; }

      if (!isReview && q) {
        if (key === 'q') handleSelectConfidence('LOW');
        if (key === 'w') handleSelectConfidence('MED');
        if (key === 'e') handleSelectConfidence('HIGH');
        if (['1', 'a'].includes(key) && q.options?.[0]) handleSelectOption(q.options[0]);
        if (['2', 'b'].includes(key) && q.options?.[1]) handleSelectOption(q.options[1]);
        if (['3', 'c'].includes(key) && q.options?.[2]) handleSelectOption(q.options[2]);
        if (['4', 'd'].includes(key) && q.options?.[3]) handleSelectOption(q.options[3]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalQuestions, isReview, showScratchpad, showSubmitConfirm, q, handleSelectConfidence, handleSelectOption, handleIndexChange]);

  if (!q) return <div className="flex justify-center p-12"><span className="telemetry-spinner !w-12 !h-12 border-reeBlue"></span></div>;

  // Per-question action icons (scratchpad / flag / bookmark) — injected into
  // QuestionCard's headerSlot so they sit next to the subject eyebrow.
  const itemActions = (
    <div className="flex gap-2">
      <button
        type="button"
        aria-label="Toggle scratchpad"
        onClick={() => setShowScratchpad(!showScratchpad)}
        className="w-10 h-10 rounded-xl bg-surface2/50 hover:bg-surface3 border border-border2/60 flex items-center justify-center transition-colors text-muted hover:text-textMain cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-velocity)]"
      >✏️</button>
      <button
        type="button"
        aria-label={q?.isFlagged ? 'Already flagged' : 'Flag question'}
        onClick={handleFlagQuestion}
        disabled={q?.isFlagged}
        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-velocity)] ${q?.isFlagged ? 'bg-reeRed/10 border-reeRed/30 text-reeRed' : 'bg-surface2/50 hover:bg-surface3 border-border2/60 text-muted hover:text-reeRed cursor-pointer'}`}
      >🚩</button>
      <button
        type="button"
        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
        onClick={() => toggleBookmark(currentIndex)}
        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-velocity)] ${isBookmarked ? 'bg-reeAmber/10 border-reeAmber/40 text-reeAmber shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-110' : 'bg-surface2/50 hover:bg-surface3 border-border2/60 text-muted hover:text-reeAmber'}`}
      >🔖</button>
    </div>
  );

  return (
    <>
      {/* Submit confirmation modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-bg/95 backdrop-blur-xl" onClick={() => setShowSubmitConfirm(false)}></div>
          <div className="relative bg-surface border border-border2/80 p-8 md:p-12 rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] max-w-lg w-full text-center flex flex-col items-center animate-in zoom-in-95 duration-300">
            <span className="text-6xl mb-6 drop-shadow-lg">⚠️</span>
            <h3 className="text-2xl sm:text-3xl font-black text-textMain mb-4 tracking-tight">Initialize Submission?</h3>
            <p className="text-sm text-gray-300 mb-10 font-medium leading-relaxed">
              Are you sure you want to finalize your simulation? You cannot change your answers after submission.
            </p>
            <div className="flex flex-col sm:flex-row w-full gap-4">
              <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 py-4 sm:py-5 bg-surface2 hover:bg-surface3 border border-border2/60 text-textMain rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer">Return to Exam</button>
              <button onClick={() => { setShowSubmitConfirm(false); submitExam(); }} className="flex-1 py-4 sm:py-5 bg-reeRed hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(239,68,68,0.4)] transition-all cursor-pointer">Submit Exam</button>
            </div>
          </div>
        </div>
      )}

      <div className={`flex flex-col gap-6 max-w-5xl mx-auto w-full animate-in fade-in duration-500 pb-12 z-0 relative transition-all duration-500 origin-center ${showSubmitConfirm ? 'scale-95 blur-md opacity-40 pointer-events-none' : 'scale-100 blur-none opacity-100'}`}>

        {/* Top toolbar — exit / hotkey status / locked count / timer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface/90 backdrop-blur-xl border border-border2/60 px-6 py-4 rounded-2xl shadow-sm sticky top-4 z-50">
          {!isReview ? (
            <button onClick={requestTerminate} className="px-6 py-2.5 rounded-lg border-2 border-reeRed/30 bg-reeRed/10 text-reeRed text-[0.7rem] font-black uppercase tracking-widest hover:bg-reeRed/20 hover:border-reeRed/50 transition-all cursor-pointer flex items-center gap-2 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-reeRed animate-pulse"></div> Exit
            </button>
          ) : (
            <button onClick={() => engine.setSession((prev) => ({ ...prev, isFinished: false, isActive: false, questions: [] }))} className="px-6 py-2.5 rounded-lg border-2 border-border2 bg-surface2 text-textMain text-[0.7rem] font-black uppercase tracking-widest hover:bg-surface3 transition-all cursor-pointer flex items-center gap-2 shadow-sm">
              <span>🚪</span> Exit Review
            </button>
          )}

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex text-[0.65rem] font-black text-muted uppercase tracking-widest bg-surface2/40 px-3 py-1.5 rounded-md border border-border2/50 items-center gap-2">
              <span className="w-1.5 h-1.5 bg-reeGreen rounded-full animate-pulse"></span> Hotkeys Active
            </div>
            <div className="hidden sm:flex text-[0.65rem] font-black text-reeBlue uppercase tracking-widest bg-reeBlue/10 px-3 py-1.5 rounded-md border border-reeBlue/20">
              {isReview ? 'Review Mode' : `${Object.keys(session.answers).length} / ${totalQuestions} Locked`}
            </div>

            {!isReview && (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTime(!showTime)} aria-label={showTime ? 'Hide time' : 'Show time'} className="text-xl text-muted hover:text-textMain transition-colors cursor-pointer mr-2">
                  {showTime ? '👁️' : '🙈'}
                </button>
                <div className={`text-lg sm:text-xl font-black font-mono tracking-widest px-4 py-1 rounded-lg border transition-all duration-300 ${!showTime ? 'blur-sm opacity-20' : ''} ${isCriticalTime ? 'bg-reeRed/10 text-reeRed border-reeRed/30 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-surface/50 text-textMain border-border2/60 shadow-inner'}`}>
                  {formatTime(timeRemaining)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Horizontal 1-N navigator */}
        <div className="bg-surface/80 backdrop-blur-md border border-border2/50 rounded-2xl p-4 shadow-sm relative z-10">
          <div
            ref={navScrollRef}
            className="flex overflow-x-auto gap-2.5 pb-4 items-center px-2 scroll-smooth [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-surface2/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-500/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 transition-all"
          >
            {session.questions.map((_, idx) => {
              const isAnswered = !!session.answers[idx];
              const isCurrent = idx === currentIndex;
              const isMarked = bookmarks.has(idx);

              let btnClass = 'bg-surface2/30 border-border2/40 text-muted hover:border-textMain/40 hover:text-textMain';
              if (!isReview) {
                if (isAnswered) btnClass = 'bg-reeBlue/10 border-reeBlue/40 text-reeBlue font-bold shadow-sm';
                if (isCurrent) btnClass = 'bg-reeBlue border-reeBlue text-white font-black shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-110';
              } else {
                const ans = session.answers[idx];
                if (!ans) btnClass = 'bg-surface/40 border-border2/30 text-muted opacity-50';
                else if (ans === session.questions[idx].answer) btnClass = 'bg-reeGreen/10 border-reeGreen/40 text-reeGreen font-bold shadow-sm';
                else btnClass = 'bg-reeRed/10 border-reeRed/40 text-reeRed font-bold shadow-sm';
                if (isCurrent) btnClass += ' border-[2px] border-textMain shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-110 z-10 opacity-100';
              }

              return (
                <button
                  key={idx}
                  data-index={idx}
                  onClick={() => handleIndexChange(idx)}
                  aria-label={`Go to item ${idx + 1}`}
                  className={`w-10 h-10 shrink-0 rounded-xl border text-xs transition-all duration-300 cursor-pointer flex items-center justify-center relative ${btnClass}`}
                >
                  {idx + 1}
                  {isMarked && <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-reeAmber rounded-full border-2 border-surface shadow-sm"></div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Exam canvas: QuestionCard owns the prompt + confidence + choices + reveal */}
        <div className={`p-8 sm:p-12 bg-surface/90 backdrop-blur-2xl border rounded-[2rem] shadow-2xl flex flex-col relative overflow-hidden transition-colors duration-700 ${isReview && isCorrect ? 'border-reeGreen/30 shadow-[0_0_40px_rgba(34,197,94,0.05)]' : isReview && !isCorrect ? 'border-reeRed/30 shadow-[0_0_40px_rgba(239,68,68,0.05)]' : 'border-border2/60'}`}>
          <Scratchpad isOpen={showScratchpad} onClose={() => setShowScratchpad(false)} />

          <QuestionCard
            question={q}
            selectedOption={userAns ?? null}
            confidence={session.confidences[currentIndex] ?? null}
            state={isReview ? 'reviewing' : 'answering'}
            showConfidence={true}
            requireConfidence={false}
            hotkeys={false}
            index={currentIndex}
            onSelect={handleSelectOption}
            onConfidenceChange={handleSelectConfidence}
            headerSlot={itemActions}
          />

          {/* ReferencePanel intentionally NOT rendered during the answer
              phase — Reference Constants would function as a cheat code that
              undermines the simulator's calibration analytics. */}

          {/* Post-exam solutions */}
          {isReview && (
            <div className="mt-8 pt-8 border-t border-border2/40 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col sm:flex-row gap-4">
                {q.fixedExplanation && (
                  <button
                    onClick={() => setActiveSolution(activeSolution === 'offline' ? null : 'offline')}
                    className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 cursor-pointer shadow-sm flex items-center justify-center gap-2 hover:-translate-y-0.5 ${activeSolution === 'offline' ? 'bg-reeCyan/10 border-reeCyan/40 text-reeCyan' : 'bg-surface2 border-border2/60 text-gray-200 hover:border-reeCyan/30 hover:bg-surface3'}`}
                  >
                    💾 {activeSolution === 'offline' ? 'Hide Matrix Solution' : 'Reveal Matrix Solution'}
                  </button>
                )}
                <button
                  onClick={handleToggleAI}
                  disabled={!isOnline && !q.cachedExplanation && !aiResponse}
                  className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 shadow-sm flex items-center justify-center gap-2 ${(!isOnline && !q.cachedExplanation && !aiResponse) ? 'bg-surface/50 border-border2/30 text-gray-500 cursor-not-allowed' : activeSolution === 'ai' ? 'bg-reePurple/10 border-reePurple/40 text-reePurple cursor-pointer' : 'bg-surface2 border-border2/60 text-reePurple hover:border-reePurple/30 hover:bg-surface3 cursor-pointer hover:-translate-y-0.5'}`}
                >
                  {aiLoading ? <span className="telemetry-spinner !w-3 !h-3 border-reePurple"></span> : '✨'} AI Deep Derivation
                </button>
              </div>

              {activeSolution === 'offline' && q.fixedExplanation && (
                <div className="p-6 sm:p-8 rounded-[1.5rem] bg-surface2 border border-reeCyan/30 shadow-inner animate-in fade-in slide-in-from-top-2">
                  <div className="text-[0.65rem] font-black text-reeCyan uppercase tracking-widest mb-4">Matrix Derivation</div>
                  <div className="text-base text-gray-200 leading-relaxed [&_p]:!m-0 [&_.katex-display]:!m-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <LatexRenderer content={q.fixedExplanation} />
                  </div>
                </div>
              )}

              {activeSolution === 'ai' && (aiResponse || q.cachedExplanation) && (
                <div className="p-6 sm:p-8 rounded-[1.5rem] bg-surface2 border border-reePurple/30 shadow-inner relative animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-5 border-b border-reePurple/20 pb-3">
                    <div className="text-[0.65rem] font-black text-reePurple uppercase tracking-widest flex items-center gap-2">
                      <span className="animate-pulse">✨</span> Gemini Core Analysis
                    </div>
                  </div>
                  <div className="text-base text-gray-200 leading-relaxed [&_p]:!m-0 [&_.katex-display]:!m-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <LatexRenderer content={aiResponse || q.cachedExplanation} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action navigation */}
          <div className="flex justify-between items-center pt-8 mt-4 border-t border-border2/50">
            <button
              onClick={() => handleIndexChange(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="px-8 py-4 rounded-full border-2 border-border2/60 bg-surface2 text-gray-300 text-xs font-black uppercase tracking-widest hover:bg-surface3 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              ← Previous
            </button>

            {!isReview && currentIndex === totalQuestions - 1 ? (
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="px-10 py-4 rounded-full bg-reeRed hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(239,68,68,0.4)] transition-all cursor-pointer hover:-translate-y-1 flex items-center gap-2"
              >
                Submit Exam 🏁
              </button>
            ) : (
              <button
                onClick={() => handleIndexChange(currentIndex + 1)}
                disabled={currentIndex === totalQuestions - 1}
                className={`px-10 py-4 rounded-full text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-2 ${currentIndex === totalQuestions - 1 ? 'bg-surface border border-border2 text-gray-500 cursor-not-allowed' : 'bg-reeBlue hover:bg-blue-600 text-white shadow-[0_4px_15px_rgba(59,130,246,0.3)] cursor-pointer hover:-translate-y-1'}`}
              >
                Next Item →
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
