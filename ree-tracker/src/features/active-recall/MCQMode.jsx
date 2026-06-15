// src/features/active-recall/MCQMode.jsx
import React from 'react';
import LatexRenderer from '../../components/LatexRenderer';

export default function MCQMode({ session, setSession, handleAnswerSelection, formatTime, timer }) {
  return (
    <div className="mt-auto flex flex-col gap-6 relative z-10">
      {!session.isAnswered && (
        <div>
          <div className="text-[0.65rem] text-muted uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-reeAmber rounded-full animate-pulse"></span> Target Lock Confidence
          </div>
          <div className="flex gap-3">
            {['low', 'med', 'high'].map((level, idx) => {
              const isSelected = session.confidence === level;
              return (
                <button 
                  key={level} 
                  onClick={() => setSession(prev => ({ ...prev, confidence: level }))} 
                  className={`flex-1 py-2 rounded-md border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer relative ${
                    isSelected 
                      ? (level === 'high' ? 'bg-reeGreen/20 border-reeGreen text-reeGreen shadow-[0_0_8px_rgba(34,197,94,0.3)]' 
                        : level === 'med' ? 'bg-reeAmber/20 border-reeAmber text-reeAmber shadow-[0_0_8px_rgba(245,158,11,0.3)]' 
                        : 'bg-reeRed/20 border-reeRed text-reeRed shadow-[0_0_8px_rgba(239,68,68,0.3)]') 
                      : 'bg-bg border-border2 text-muted hover:border-muted2'
                  }`}
                >
                  {level} 
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.55rem] opacity-50 hidden sm:inline">
                    [{['Q','W','E'][idx]}]
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {session.currentQ.options && session.currentQ.options.map((opt, i) => {
          let btnStyle = "bg-bg border-border2 hover:border-reeBlue hover:bg-surface2 text-textMain cursor-pointer";
          if (session.isAnswered) {
            if (opt === session.currentQ.answer) btnStyle = "bg-reeGreen/10 border-reeGreen text-reeGreen shadow-[0_0_10px_rgba(34,197,94,0.1)] cursor-default";
            else if (opt === session.wrongSelection) btnStyle = "bg-reeRed/10 border-reeRed text-reeRed cursor-default";
            else btnStyle = "bg-bg border-border2 text-muted opacity-40 cursor-default";
          }
          return (
            <button key={i} disabled={session.isAnswered} onClick={() => handleAnswerSelection(opt, formatTime)} className={`p-4 rounded-xl border text-left transition-all text-sm flex items-start w-full ${btnStyle}`}>
              <span className={`font-bold mr-3 font-mono mt-1 ${session.isAnswered && (opt === session.currentQ.answer || opt === session.wrongSelection) ? 'opacity-100' : 'opacity-50'}`}>
                {String.fromCharCode(65 + i)}.
              </span>
              <div className="flex-1 overflow-x-auto math-scroll-mobile">
                <LatexRenderer content={opt} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}