// src/components/exam/ExamNavigator.jsx
// Shared horizontal 1-N exam navigator (the Board Simulator's strip), so the
// Gauntlet and the Simulator present the same answering chrome. Pure &
// props-driven — no engine coupling.
//   count         : number of items
//   currentIndex  : active item
//   onSelect(idx) : jump to an item
//   isAnswered(idx) -> bool
//   reviewStateOf(idx) -> 'correct' | 'incorrect' | 'skipped' | null  (review mode)
//   isMarked(idx) -> bool  (bookmark dot; optional)
import { Check, X } from '../ui/icons';

export default function ExamNavigator({ count, currentIndex, onSelect, isAnswered, reviewStateOf, isMarked }) {
  return (
    <div className="bg-surface/80 backdrop-blur-md border border-border2/50 rounded-2xl p-4 shadow-sm relative z-10">
      <div className="flex overflow-x-auto gap-2.5 pb-4 items-center px-2 scroll-smooth [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-surface2/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-500/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 transition-all">
        {Array.from({ length: count }).map((_, idx) => {
          const answered = !!isAnswered?.(idx);
          const isCurrent = idx === currentIndex;
          const reviewState = reviewStateOf?.(idx) ?? null;
          const marked = !!isMarked?.(idx);

          // Encode correct/incorrect beyond color (WCAG 1.4.1) with a ✓/✗ glyph
          // + the aria-label.
          let btnClass = 'bg-surface2/30 border-border2/40 text-muted hover:border-textMain/40 hover:text-textMain';
          if (!reviewState) {
            if (answered) btnClass = 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_40%,transparent)] text-[var(--accent)] font-bold shadow-sm';
            if (isCurrent) btnClass = 'bg-[var(--accent)] border-[var(--accent)] text-white font-bold elevate-1 scale-110';
          } else if (reviewState === 'skipped') {
            btnClass = 'bg-surface/40 border-border2/30 text-muted opacity-50';
          } else if (reviewState === 'correct') {
            btnClass = 'bg-[color-mix(in_srgb,var(--accent-success)_10%,transparent)] border-[color-mix(in_srgb,var(--accent-success)_40%,transparent)] text-[var(--accent-success)] font-bold shadow-sm';
          } else {
            btnClass = 'bg-[color-mix(in_srgb,var(--accent-danger)_10%,transparent)] border-[color-mix(in_srgb,var(--accent-danger)_40%,transparent)] text-[var(--accent-danger)] font-bold shadow-sm';
          }
          if (reviewState && isCurrent) btnClass += ' border-[2px] border-textMain scale-110 z-10 opacity-100';

          return (
            <button
              key={idx}
              data-index={idx}
              onClick={() => onSelect?.(idx)}
              aria-label={`Go to item ${idx + 1}${reviewState ? `, ${reviewState}` : ''}`}
              className={`w-10 h-10 pointer-coarse:w-11 pointer-coarse:h-11 shrink-0 rounded-[var(--radius-default)] border text-xs transition-all duration-300 cursor-pointer flex items-center justify-center relative ${btnClass}`}
            >
              {idx + 1}
              {reviewState === 'correct' && <Check aria-hidden strokeWidth={3} className="absolute -bottom-1 -left-1 w-3 h-3" style={{ color: 'var(--accent-success)' }} />}
              {reviewState === 'incorrect' && <X aria-hidden strokeWidth={3} className="absolute -bottom-1 -left-1 w-3 h-3" style={{ color: 'var(--accent-danger)' }} />}
              {marked && <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full border-2 border-surface shadow-sm" style={{ background: 'var(--color-reeAmber)' }}></div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
