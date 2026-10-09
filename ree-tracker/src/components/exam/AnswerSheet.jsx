// src/components/exam/AnswerSheet.jsx
//
// The PRC answer sheet on screen: a numbered row per item with A–D bubbles,
// shaded where answered — the view a board examinee checks before handing in.
// Tapping a row goes to that item. In review it also rings the correct bubble.
// Pure and props-driven, like ExamNavigator, which offers it as a second view.
import { sheetRowLabel } from './examAnnouncements';

const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * @param count            items on the sheet
 * @param currentIndex     the item on screen
 * @param onSelect(idx)    go to an item
 * @param letterOf(idx)    the letter answered, or null
 * @param correctLetterOf(idx) the key's letter (review only), or null
 * @param isMarked(idx)    marked for review
 * @param numberOf(idx)    the item's own number (default idx + 1)
 */
export default function AnswerSheet({ count, currentIndex, onSelect, letterOf, correctLetterOf, isMarked, numberOf }) {
  return (
    <div
      className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 max-h-[22rem] overflow-y-auto custom-scrollbar pr-1"
      role="list"
      aria-label="Answer sheet"
    >
      {Array.from({ length: count }).map((_, idx) => {
        const number = numberOf ? numberOf(idx) : idx + 1;
        const letter = letterOf?.(idx) || null;
        const correct = correctLetterOf?.(idx) || null;
        const marked = !!isMarked?.(idx);
        const current = idx === currentIndex;
        return (
          <div role="listitem" key={idx}>
            <button
              type="button"
              onClick={() => onSelect?.(idx)}
              aria-label={sheetRowLabel({ number, letter, correctLetter: correct, marked })}
              aria-current={current ? 'step' : undefined}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded-[var(--radius-sm)] text-xs cursor-pointer touch-target transition-colors ${current ? 'bg-surface3 ring-1 ring-[var(--accent-velocity)]' : 'hover:bg-surface2'}`}
            >
              <span className="w-7 text-right tabular-nums text-muted2 shrink-0">{number}</span>
              <span className="flex gap-1.5" aria-hidden="true">
                {LETTERS.map((l) => {
                  const shaded = letter === l;
                  const isKey = correct === l;
                  return (
                    <span
                      key={l}
                      className="w-5 h-5 rounded-full border flex items-center justify-center text-[0.65rem] font-semibold"
                      style={{
                        background: shaded ? 'var(--text-main)' : 'transparent',
                        color: shaded ? 'var(--bg-surface)' : 'var(--text-muted)',
                        borderColor: isKey ? 'var(--accent-success)' : 'var(--border-light)',
                        boxShadow: isKey ? '0 0 0 2px color-mix(in srgb, var(--accent-success) 45%, transparent)' : undefined,
                      }}
                    >
                      {l}
                    </span>
                  );
                })}
              </span>
              {marked && <span className="ml-auto w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--color-reeAmber)' }} aria-hidden="true" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
