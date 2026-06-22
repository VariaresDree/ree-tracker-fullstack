// src/features/active-recall/MCQMode.jsx
import React from 'react';
import LatexRenderer from '../../components/LatexRenderer';
import ReferencePanel from '../../components/ReferencePanel';

export default function MCQMode({ session, setSession, handleAnswerSelection }) {
  const currentQ = session.questions[session.currentIndex];
  
  return (
    <div className="flex flex-col gap-6 relative z-10 animate-in fade-in">
      
      {/* 🚀 Target Lock Confidence */}
      {!session.isAnswered && (
        <div className="mb-2">
          <div className="text-[0.65rem] text-muted uppercase tracking-widest font-black mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-reeAmber rounded-full animate-pulse"></span> Target Lock Confidence
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['LOW', 'MED', 'HIGH'].map((level, idx) => {
              const isSelected = session.confidence === level;
              const activeColor = level === 'HIGH' ? 'reeGreen' : level === 'MED' ? 'reeBlue' : 'reeRed';
              return (
                <button 
                  key={level} 
                  onClick={() => setSession(prev => ({ ...prev, confidence: level }))} 
                  className={`py-3.5 rounded-2xl border-2 text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                    isSelected ? `bg-surface3 border-textMain text-textMain shadow-md scale-[1.02]` : `bg-surface2/30 border-border2/50 text-muted hover:border-textMain/40 hover:text-textMain hover:bg-surface2 hover:-translate-y-0.5`
                  }`}
                >
                  {level} <span className="opacity-30 text-[0.55rem] font-mono">[{['Q','W','E'][idx]}]</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 🚀 Options Matrix (Flawlessly Aligned) */}
      <div className="flex flex-col gap-3.5">
        {currentQ.options?.map((opt, i) => {
          const isSelected = session.selectedOption === opt;
          const isCorrectAnswer = opt === currentQ.answer;
          
          let btnStyle = "bg-surface2/20 border-border2/40 hover:border-reeBlue/40 text-muted hover:text-textMain cursor-pointer transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:bg-surface3/50";
          let innerContentStyle = "";
          let IconComponent = null;

          if (session.isAnswered) {
            if (isCorrectAnswer) {
                btnStyle = "bg-[#0f291e] border-reeGreen/60 text-reeGreen shadow-[0_0_20px_rgba(34,197,94,0.15)] font-bold scale-[1.01]";
                IconComponent = (
                    <div className="w-7 h-7 bg-reeGreen rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                );
            } else if (isSelected) {
                btnStyle = "bg-[#2a1215] border-reeRed/50 text-reeRed/70 opacity-90";
                innerContentStyle = "line-through decoration-reeRed/40";
                IconComponent = (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-reeRed shrink-0">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                );
            } else {
                btnStyle = "bg-surface/10 border-border2/20 text-muted opacity-30 cursor-not-allowed";
            }
          }

          return (
            <button 
              key={i} 
              disabled={session.isAnswered} 
              onClick={() => handleAnswerSelection(opt)} 
              className={`p-5 sm:p-6 rounded-2xl border text-left flex items-center w-full group ${btnStyle}`}
            >
              {/* 🚀 Clean Typography Letter (No Box) */}
              <span className={`w-8 shrink-0 font-black font-mono text-base sm:text-lg tracking-wider transition-colors duration-300 ${
                  session.isAnswered && isCorrectAnswer ? 'text-reeGreen' : 
                  session.isAnswered && isSelected ? 'text-reeRed/70' : 
                  'text-muted/60 group-hover:text-reeBlue'
              }`}>
                {String.fromCharCode(65 + i)}.
              </span>
              
              {/* 🚀 Aggressive CSS Reset for Flawless Horizontal Alignment ([&_p]:!m-0) */}
              <div className={`flex-1 flex items-center overflow-x-auto math-scroll-mobile [&_p]:!m-0 [&_.katex-display]:!m-0 [&_.katex-display]:!py-0 ${innerContentStyle}`}>
                <LatexRenderer content={opt} />
              </div>
              
              {/* Dynamic Result Icons */}
              {IconComponent && <div className="ml-4 animate-in zoom-in duration-300">{IconComponent}</div>}
            </button>
          );
        })}
      </div>

      <ReferencePanel question={currentQ} />
    </div>
  );
}