// src/features/active-recall/FlashcardMode.jsx
import React from 'react';
import LatexRenderer from '../../components/LatexRenderer';

export default function FlashcardMode({ session, handleFlashcardReveal, handleFlashcardRating }) {
  return (
    <div className="mt-auto flex flex-col gap-4 relative z-10">
      {!session.isFlipped ? (
        <button onClick={handleFlashcardReveal} className="w-full py-8 bg-surface2 hover:bg-surface3 border-2 border-dashed border-border2 rounded-xl text-muted font-bold tracking-widest uppercase transition-colors cursor-pointer">
          Tap to Reveal Answer
        </button>
      ) : (
        <div className="page-fade-in flex flex-col gap-6">
          <div className="p-6 bg-reeGreen/10 border border-reeGreen/30 rounded-xl text-center shadow-[0_0_15px_rgba(34,197,94,0.05)] overflow-x-auto math-scroll-mobile">
            <div className="text-[0.65rem] text-reeGreen font-bold uppercase tracking-widest mb-3">Verified Answer</div>
            <div className="text-lg md:text-xl text-textMain font-bold">
              <LatexRenderer content={session.currentQ.answer} />
            </div>
          </div>
          {!session.isAnswered && (
            <div className="flex flex-col gap-3">
              <div className="text-[0.65rem] text-center text-muted uppercase tracking-widest font-bold">Rate Recall Difficulty</div>
              <div className="flex gap-3">
                <button onClick={() => handleFlashcardRating('again')} className="flex-1 py-3.5 bg-reeRed/10 border border-reeRed/30 text-reeRed rounded-lg text-xs font-bold uppercase hover:bg-reeRed/20 cursor-pointer transition-colors">Again (Wrong)</button>
                <button onClick={() => handleFlashcardRating('hard')} className="flex-1 py-3.5 bg-reeAmber/10 border border-reeAmber/30 text-reeAmber rounded-lg text-xs font-bold uppercase hover:bg-reeAmber/20 cursor-pointer transition-colors">Hard</button>
                <button onClick={() => handleFlashcardRating('easy')} className="flex-1 py-3.5 bg-reeGreen/10 border border-reeGreen/30 text-reeGreen rounded-lg text-xs font-bold uppercase hover:bg-reeGreen/20 cursor-pointer transition-colors">Easy</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}