// src/features/active-recall/FlashcardMode.jsx
import React from 'react';
import LatexRenderer from '../../components/LatexRenderer';

export default function FlashcardMode({ session, handleFlashcardReveal, handleFlashcardRating }) {
  const currentQ = session.questions[session.currentIndex];

  return (
    <div className="mt-auto flex flex-col gap-6 relative z-10 animate-in fade-in">
      {!session.isFlipped ? (
        <button onClick={handleFlashcardReveal} className="w-full py-12 bg-surface2/20 hover:bg-surface2/40 border-2 border-dashed border-border2/60 hover:border-reeAmber/50 rounded-3xl text-muted hover:text-reeAmber font-black tracking-widest uppercase transition-all duration-300 cursor-pointer shadow-sm hover:-translate-y-1">
          Tap or Press [SPACE] to Reveal Answer
        </button>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-8">
          
          {/* Answer Reveal */}
          <div className="p-8 sm:p-12 border-t border-border2/40 bg-gradient-to-b from-reeGreen/10 to-transparent rounded-[2rem] text-center shadow-[0_0_40px_rgba(34,197,94,0.03)] overflow-x-auto math-scroll-mobile">
            <div className="text-[0.65rem] text-reeGreen font-black uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 bg-reeGreen rounded-full animate-pulse"></span> Target Knowledge Acquired
            </div>
            {/* 🚀 Margin stripped rendering */}
            <div className="text-2xl text-white font-bold drop-shadow-sm [&_p]:!m-0 [&_.katex-display]:!m-0 [&_.katex-display]:!py-0">
              <LatexRenderer content={currentQ.answer} />
            </div>
          </div>
          
          {/* Rating Matrix */}
          {!session.isAnswered && (
            <div className="flex flex-col gap-4">
              <div className="text-[0.65rem] text-muted uppercase tracking-widest font-black flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-reeBlue rounded-full animate-pulse"></span> Assess Memory Retrieval
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button onClick={() => handleFlashcardRating('again')} className="py-4 bg-surface2/30 border-2 border-border2/50 text-reeRed rounded-2xl text-xs font-black uppercase hover:bg-reeRed/10 hover:border-reeRed/50 cursor-pointer transition-all shadow-sm hover:-translate-y-0.5">
                    Again <span className="block mt-1 opacity-40 font-mono text-[0.55rem]">[1]</span>
                </button>
                <button onClick={() => handleFlashcardRating('hard')} className="py-4 bg-surface2/30 border-2 border-border2/50 text-reeAmber rounded-2xl text-xs font-black uppercase hover:bg-reeAmber/10 hover:border-reeAmber/50 cursor-pointer transition-all shadow-sm hover:-translate-y-0.5">
                    Hard <span className="block mt-1 opacity-40 font-mono text-[0.55rem]">[2]</span>
                </button>
                <button onClick={() => handleFlashcardRating('good')} className="py-4 bg-surface2/30 border-2 border-border2/50 text-reeBlue rounded-2xl text-xs font-black uppercase hover:bg-reeBlue/10 hover:border-reeBlue/50 cursor-pointer transition-all shadow-sm hover:-translate-y-0.5">
                    Good <span className="block mt-1 opacity-40 font-mono text-[0.55rem]">[3]</span>
                </button>
                <button onClick={() => handleFlashcardRating('easy')} className="py-4 bg-surface2/30 border-2 border-border2/50 text-reeGreen rounded-2xl text-xs font-black uppercase hover:bg-reeGreen/10 hover:border-reeGreen/50 cursor-pointer transition-all shadow-[0_0_15px_rgba(34,197,94,0.05)] hover:-translate-y-0.5 hover:shadow-lg">
                    Easy <span className="block mt-1 opacity-40 font-mono text-[0.55rem]">[4]</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}