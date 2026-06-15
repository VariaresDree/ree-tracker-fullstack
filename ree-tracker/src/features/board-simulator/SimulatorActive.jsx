// src/features/board-simulator/SimulatorActive.jsx
import React, { useState, useEffect } from 'react'; 
import LatexRenderer from '../../components/LatexRenderer';
import Scratchpad from '../../components/Scratchpad'; 
import SmartText from '../../components/SmartText'; 

export default function SimulatorActive({
  engine, formatTime, requestTerminate, isOnline
}) {
  const {
    session, currentIndex, handleIndexChange, timeRemaining, showTime, setShowTime,
    handleSelectConfidence, handleSelectOption, reviewUI, toggleOfflinePanel,
    fetchOrToggleAI, refreshAIExplanation, timeSpentPerQuestion,
    bookmarks, toggleBookmark,
    handleFlagQuestion 
  } = engine;

  const [showScratchpad, setShowScratchpad] = useState(false); 

  const q = session.questions[currentIndex];
  const userAns = session.answers[currentIndex];
  const isReview = session.isFinished;
  const isCorrect = isReview ? userAns === q.answer : false;
  const expState = isReview ? (reviewUI[currentIndex] || {}) : {};
  const totalQuestions = session.questions.length;
  const isBookmarked = bookmarks.has(currentIndex);

  useEffect(() => {
    if (!isReview && totalQuestions > 0) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Simulation in progress. Progress will be lost if not saved!';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isReview, totalQuestions]);

  // CRITICAL FIX: Power User Keyboard Telemetry Integration
  useEffect(() => {
    const handleKeyDown = (e) => {
        // Prevent hotkeys if typing in inputs or if scratchpad is open
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        if (showScratchpad) return;

        const key = e.key.toLowerCase();

        // 1. Simulator Navigation
        if (key === 'arrowleft') {
            if (currentIndex > 0) handleIndexChange(currentIndex - 1);
            return;
        }
        if (key === 'arrowright') {
            if (currentIndex < totalQuestions - 1) handleIndexChange(currentIndex + 1);
            return;
        }

        // 2. Active Combat Logging (Only if not in Review Mode)
        if (!isReview && q) {
            // Confidence Targeting: Q, W, E
            if (key === 'q') handleSelectConfidence('low');
            if (key === 'w') handleSelectConfidence('med');
            if (key === 'e') handleSelectConfidence('high');

            // Option Selection: 1/A, 2/B, 3/C, 4/D
            if (['1', 'a'].includes(key) && q.options?.[0]) handleSelectOption(q.options[0]);
            if (['2', 'b'].includes(key) && q.options?.[1]) handleSelectOption(q.options[1]);
            if (['3', 'c'].includes(key) && q.options?.[2]) handleSelectOption(q.options[2]);
            if (['4', 'd'].includes(key) && q.options?.[3]) handleSelectOption(q.options[3]);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalQuestions, isReview, showScratchpad, q, handleSelectConfidence, handleSelectOption, handleIndexChange]);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in">
      {/* Question Navigator */}
      <div className="p-4 md:p-6 bg-surface border border-border2 rounded-2xl shadow-lg sticky top-2 z-50 transition-all">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-5">
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-block text-[0.6rem] font-bold uppercase tracking-widest text-muted2 border border-border2 px-2 py-0.5 rounded bg-surface2">
              ⌨️ Hotkeys Active
            </span>
            <span className="text-xs font-bold text-muted uppercase tracking-widest font-mono hidden sm:block">QUESTION NAVIGATOR</span>
            {!isReview ? (
              <span className="text-xs font-mono text-reeCyan bg-reeCyan/10 px-3 py-1 rounded-md border border-reeCyan/20">
                {Object.keys(session.answers).length} / {totalQuestions} Locked
              </span>
            ) : (
              <span className="text-xs font-mono text-textMain font-bold bg-surface2 px-3 py-1 rounded-md border border-border2">
                Reviewing Item {currentIndex + 1}
              </span>
            )}
          </div>
          {!isReview ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowTime(!showTime)} aria-label="Toggle timer visibility" className="text-muted hover:text-textMain transition-colors cursor-pointer">
                  {showTime ? '👁️' : '🙈'}
                </button>
                <span className={`font-mono text-lg font-black tracking-wider ${timeRemaining < 300 ? 'text-reeRed animate-pulse' : 'text-textMain'} ${!showTime && 'blur-sm opacity-20 transition-all duration-300'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="border-l border-border2 pl-4">
                <button onClick={requestTerminate} className="px-3 py-1.5 bg-surface2 hover:bg-reeRed/10 text-muted hover:text-reeRed border border-border2 hover:border-reeRed/30 rounded-lg text-[0.65rem] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5">
                  <span>🚪</span> Exit Simulation
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => engine.setSession(prev => ({...prev, isFinished: false, isActive: false, questions: []}))} className="px-4 py-2 bg-surface2 hover:bg-reeRed/10 text-muted hover:text-reeRed border border-border2 hover:border-reeRed/30 rounded-lg text-[0.65rem] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5">
              <span>🚪</span> Exit Simulation
            </button>
          )}
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-3 math-scroll-mobile">
          {session.questions.map((_, idx) => {
            let btnStyle = "bg-surface2 text-muted border-border2 hover:bg-surface3 hover:text-textMain";
            if (!isReview) {
              if (session.answers[idx]) btnStyle = "bg-reeCyan/10 text-reeCyan border-reeCyan/30 font-bold shadow-sm";
              if (currentIndex === idx) btnStyle = "bg-reeBlue text-white border-reeBlue shadow-lg scale-110 font-bold";
            } else {
              const ans = session.answers[idx];
              if (!ans) btnStyle = "bg-surface2 text-muted border-border2 opacity-50";
              else if (ans === session.questions[idx].answer) btnStyle = "bg-reeGreen/10 text-reeGreen border-reeGreen/30 font-bold shadow-sm";
              else btnStyle = "bg-reeRed/10 text-reeRed border-reeRed/30 font-bold shadow-sm";
              if (currentIndex === idx) btnStyle += " border-[3px] border-textMain shadow-lg scale-110 z-10 opacity-100";
            }
            return (
              <button key={idx} onClick={() => handleIndexChange(idx)} className={`relative w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-xs transition-all border cursor-pointer ${btnStyle}`}>
                {idx + 1}
                {bookmarks.has(idx) && <span className="absolute -top-1.5 -right-1.5 text-[0.65rem] drop-shadow-md">🔖</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Card w/ Tactical Toolbar */}
      <div className={`p-6 md:p-8 bg-surface border rounded-2xl shadow-xl min-h-[400px] flex flex-col relative transition-colors ${isReview && isCorrect ? 'border-reeGreen/30' : isReview && !isCorrect ? 'border-reeRed/30' : 'border-border2'}`}>
        
        {/* TACTICAL TOOLBAR OVERLAY */}
        <div className="absolute top-6 right-6 flex gap-2 z-[45]">
            <button 
                onClick={() => setShowScratchpad(true)}
                className="p-2 bg-surface2 hover:bg-surface3 border border-border2 rounded-lg text-muted hover:text-reeCyan transition-colors shadow-sm cursor-pointer flex items-center justify-center"
                title="Open Digital Scratchpad"
            >
                ✏️
            </button>
            
            <button 
                onClick={handleFlagQuestion}
                disabled={q?.isFlagged}
                className={`p-2 border rounded-lg transition-colors shadow-sm flex items-center justify-center ${
                    q?.isFlagged 
                    ? 'bg-reeAmber/20 border-reeAmber/50 text-reeAmber cursor-not-allowed' 
                    : 'bg-surface2 hover:bg-surface3 border-border2 text-muted hover:text-reeAmber cursor-pointer'
                }`}
                title={q?.isFlagged ? "Error Already Reported" : "Report Error to Admin"}
            >
                {q?.isFlagged ? '⚠️' : '🚩'}
            </button>
            
            <button 
                onClick={() => toggleBookmark(currentIndex)}
                className={`p-2 border rounded-lg transition-colors shadow-sm cursor-pointer flex items-center justify-center ${
                    isBookmarked 
                    ? 'bg-reeBlue/20 border-reeBlue/50 text-reeBlue' 
                    : 'bg-surface2 hover:bg-surface3 border-border2 text-muted hover:text-reeBlue'
                }`}
                title={isBookmarked ? "Remove Bookmark" : "Bookmark for Review Later"}
            >
                🔖
            </button>
        </div>

        {/* NATIVE CANVAS SCRATCHPAD */}
        <Scratchpad isOpen={showScratchpad} onClose={() => setShowScratchpad(false)} />

        <div className="flex items-center gap-3 border-b border-border2 pb-4 mb-6 pr-32">
          <span className="bg-surface2 text-muted px-2 py-1 rounded text-xs font-mono border border-border2">Item {currentIndex + 1}</span>
          <span className="text-[0.65rem] text-reeCyan font-bold uppercase tracking-widest bg-reeCyan/10 border border-reeCyan/20 px-2 py-0.5 rounded">
            {q.subject} › {q.subtopic}
          </span>
          {isReview && timeSpentPerQuestion.current[currentIndex] && (
            <span className="ml-auto text-[0.65rem] text-muted font-mono uppercase tracking-wider hidden sm:block">
              Time: {Math.floor(timeSpentPerQuestion.current[currentIndex] / 1000)}s
            </span>
          )}
        </div>
        
        {/* SMART TEXT PARSER */}
        <div className="text-sm md:text-base text-textMain mb-8 font-medium leading-relaxed overflow-x-auto math-scroll-mobile">
          <SmartText text={q.text} />
        </div>

        {!isReview && (
          <div className="mb-6 p-4 bg-bg border border-border2 rounded-xl">
            <div className="text-[0.65rem] text-muted uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-reeAmber rounded-full animate-pulse"></span> Target Lock Confidence
            </div>
            <div className="flex gap-3">
              {['low', 'med', 'high'].map((level, idx) => {
                const isSel = session.confidences[currentIndex] === level;
                return (
                  <button key={level} onClick={() => handleSelectConfidence(level)} className={`flex-1 py-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer relative ${isSel ? (level === 'high' ? 'bg-reeGreen/20 border-reeGreen text-reeGreen shadow-[0_0_8px_rgba(34,197,94,0.3)]' : level === 'med' ? 'bg-reeAmber/20 border-reeAmber text-reeAmber shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'bg-reeRed/20 border-reeRed text-reeRed shadow-[0_0_8px_rgba(239,68,68,0.3)]') : 'bg-bg border-border2 text-muted hover:border-muted2'}`}>
                    {level} <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.55rem] opacity-50 hidden sm:inline">[{['Q','W','E'][idx]}]</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 flex-1">
          {q.options && q.options.map((opt, oIdx) => {
            const isSelected = userAns === opt;
            let btnStyle = "bg-bg border-border2 hover:border-reeBlue hover:bg-surface2 text-textMain";
            if (!isReview && isSelected) {
              btnStyle = "bg-reeBlue/10 border-reeBlue shadow-[0_0_8px_rgba(59,130,246,0.2)]";
            } else if (isReview) {
              btnStyle = "bg-bg border-border2 opacity-40 cursor-default text-muted";
              if (opt === q.answer) btnStyle = "bg-reeGreen/10 border-reeGreen text-reeGreen shadow-[0_0_10px_rgba(34,197,94,0.15)] opacity-100 cursor-default";
              else if (isSelected && !isCorrect) btnStyle = "bg-reeRed/10 border-reeRed text-reeRed opacity-100 cursor-default";
            }
            return (
              <button key={oIdx} disabled={isReview} onClick={() => handleSelectOption(opt)} className={`p-4 rounded-xl border text-left transition-all text-sm flex items-start w-full relative ${!isReview ? 'cursor-pointer' : ''} ${btnStyle}`}>
                <span className={`font-bold mr-3 font-mono mt-1 ${(!isReview && isSelected) || (isReview && (opt === q.answer || isSelected)) ? 'opacity-100' : 'opacity-50'}`}>
                  {String.fromCharCode(65 + oIdx)}.
                </span>
                <div className="flex-1 overflow-x-auto math-scroll-mobile"><LatexRenderer content={opt} /></div>
              </button>
            );
          })}
        </div>

        {isReview && (
          <div className="mt-8 pt-6 border-t border-border2/50 flex flex-col gap-4 animate-in fade-in">
            {!isOnline && (
              <div className="text-[0.65rem] text-reeAmber font-bold uppercase tracking-wider text-center p-2 bg-reeAmber/10 rounded border border-reeAmber/30">
                📡 Telemetry Lost: Cloud AI derivations unavailable offline.
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              {q.fixedExplanation && (
                <button onClick={toggleOfflinePanel} className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer shadow-sm ${expState.activePanel === 'offline' ? 'bg-reeCyan/10 border-reeCyan/50 text-reeCyan' : 'bg-surface2 hover:bg-surface3 border-border2 hover:border-reeCyan/30 text-textMain'}`}>
                  {expState.activePanel === 'offline' ? 'Hide Solution' : '💾 Reveal Solution'}
                </button>
              )}
              <button onClick={() => fetchOrToggleAI(q)} disabled={!isOnline || expState.loading} className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border shadow-sm ${!isOnline ? 'bg-bg border-border2 text-muted opacity-50 cursor-not-allowed' : expState.activePanel === 'ai' ? 'bg-reePurple/10 border-reePurple/50 text-reePurple' : 'bg-reePurple/5 hover:bg-reePurple/10 border-reePurple/30 text-reePurple cursor-pointer'}`}>
                  {expState.loading ? <><span className="telemetry-spinner !w-3 !h-3"></span> Booting...</> : (expState.activePanel === 'ai' ? 'Hide AI Explanation' : '✨ Deep AI Derivation/Explanation')}
                </button>
            </div>
            <div className="mt-2">
              {expState.activePanel === 'offline' && q.fixedExplanation && (
                <div className="mt-2 p-5 rounded-xl border bg-surface border-reeCyan/30 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-[0.65rem] font-bold uppercase tracking-widest mb-3 text-reeCyan border-b border-reeCyan/20 pb-2">💾 Revealed Solution</h4>
                  <div className="p-4 bg-reeCyan/5 border border-reeCyan/10 rounded-lg text-textMain text-sm leading-relaxed font-medium overflow-x-auto math-scroll-mobile">
                    <LatexRenderer content={q.fixedExplanation} />
                  </div>
                </div>
              )}
              {expState.activePanel === 'ai' && expState.aiResponse && (
                <div className="mt-2 p-5 rounded-xl border bg-surface border-reePurple/30 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center border-b border-reePurple/20 pb-2 mb-3">
                    <h4 className="text-[0.65rem] font-bold uppercase tracking-widest text-reePurple">✨ Deep AI Derivation</h4>
                    <button onClick={() => refreshAIExplanation(q)} disabled={expState.loading} className="text-reePurple hover:text-reePurple border border-transparent hover:border-reePurple/30 bg-reePurple/5 hover:bg-reePurple/10 px-2 py-1 rounded text-[0.6rem] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer">
                      🔄 Regenerate
                    </button>
                  </div>
                  <div className="p-4 bg-reePurple/5 border border-reePurple/10 rounded-lg text-textMain text-sm leading-relaxed font-medium overflow-x-auto math-scroll-mobile">
                    <LatexRenderer content={expState.aiResponse} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="flex justify-between items-center mt-4 px-2">
        <button onClick={() => handleIndexChange(currentIndex - 1)} disabled={currentIndex === 0} className="px-6 py-3 bg-surface border border-border2 text-textMain text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface2 flex items-center gap-1">
          ← Previous <span className="hidden sm:inline opacity-50 ml-1 font-mono text-[0.55rem]">[←]</span>
        </button>
        {!isReview && currentIndex === totalQuestions - 1 ? (
          <button onClick={requestTerminate} className="px-8 py-3 bg-gradient-to-r from-reeRed to-reeAmber text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg hover:shadow-reeRed/30 transition-all cursor-pointer">
            Submit Exam
          </button>
        ) : (
          <button onClick={() => handleIndexChange(currentIndex + 1)} disabled={currentIndex === totalQuestions - 1} className={`px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1 ${isReview || currentIndex === totalQuestions - 1 ? 'bg-surface border border-border2 text-textMain hover:bg-surface2 disabled:opacity-30 disabled:cursor-not-allowed' : 'bg-reeBlue hover:bg-reeBlue2 text-white'}`}>
            Next → <span className="hidden sm:inline opacity-50 ml-1 font-mono text-[0.55rem]">[→]</span>
          </button>
        )}
      </div>
    </div>
  );
}