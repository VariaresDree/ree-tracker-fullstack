// src/features/active-recall/FlashcardMode.jsx
import LatexRenderer from '../../components/LatexRenderer';
import { KBD, cn } from '../../components/ui';

// SRS rating scale — colors map to how it felt: again=danger, hard=amber,
// good=signal, easy=success. Keyboard 1-4 mirrors the button order.
const RATINGS = [
  { id: 'again', label: 'Again', key: '1', accent: 'var(--accent-danger)' },
  { id: 'hard', label: 'Hard', key: '2', accent: 'var(--color-reeAmber)' },
  { id: 'good', label: 'Good', key: '3', accent: 'var(--accent-signal)' },
  { id: 'easy', label: 'Easy', key: '4', accent: 'var(--accent-success)' },
];

export default function FlashcardMode({ session, handleFlashcardReveal, handleFlashcardRating }) {
  const currentQ = session.questions[session.currentIndex];

  return (
    <div className="mt-auto flex flex-col gap-6 relative z-10 animate-in fade-in">
      {!session.isFlipped ? (
        <button
          onClick={handleFlashcardReveal}
          className="w-full py-12 bg-surface2/20 hover:bg-surface2/40 border-2 border-dashed border-border2/60 hover:border-[color-mix(in_srgb,var(--accent)_50%,transparent)] rounded-[var(--radius-xl)] text-muted hover:text-[var(--accent)] font-semibold transition-all duration-300 cursor-pointer shadow-sm hover:-translate-y-1 flex items-center justify-center gap-2"
        >
          Show answer <KBD>Space</KBD>
        </button>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-8">

          {/* Answer reveal */}
          <div
            className="p-8 sm:p-12 border-t border-border2/40 rounded-[var(--radius-xl)] text-center overflow-x-auto math-scroll-mobile"
            style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--accent-success) 10%, transparent), transparent)' }}
          >
            <div className="text-eyebrow mb-4 flex items-center justify-center gap-2" style={{ color: 'var(--accent-success)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-success)' }}></span> Answer
            </div>
            {/* 🚀 Margin stripped rendering */}
            <div className="text-2xl text-textMain font-bold drop-shadow-sm [&_p]:!m-0 [&_.katex-display]:!m-0 [&_.katex-display]:!py-0">
              <LatexRenderer content={currentQ.answer} />
            </div>
          </div>

          {/* SRS rating */}
          {!session.isAnswered && (
            <div className="flex flex-col gap-4">
              <div className="text-eyebrow">How well did you recall it?</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="group" aria-label="Recall rating">
                {RATINGS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleFlashcardRating(r.id)}
                    className={cn(
                      'py-4 bg-surface2/30 border-2 border-border2/50 rounded-[var(--radius-default)]',
                      'text-xs font-bold uppercase cursor-pointer transition-all shadow-sm hover:-translate-y-0.5',
                      'hover:bg-[color-mix(in_srgb,var(--rating-accent)_10%,transparent)]',
                      'hover:border-[color-mix(in_srgb,var(--rating-accent)_50%,transparent)]'
                    )}
                    style={{ color: r.accent, '--rating-accent': r.accent }}
                  >
                    {r.label} <span className="block mt-1 opacity-40 font-mono text-[11px] normal-case">[{r.key}]</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
