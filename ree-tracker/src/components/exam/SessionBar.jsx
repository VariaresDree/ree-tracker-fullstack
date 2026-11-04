// src/components/exam/SessionBar.jsx
//
// The one bar that stays in view while a session runs: where you are, the clock
// and the way out, in a single row at every width. A phone used to stack the
// exam banner, two toolbar rows and the navigator above the question.
//
// `index` and `total` say which item this is; `about` when the total is an
// estimate (the placement test). `answered` is left out of the row on the very
// narrowest phones, where it doesn't fit and the navigator shows it anyway.
import { COPY, itemOf } from '../../features/quiz/examCopy';

/** "Submit exam", or "Submit" where three buttons won't fit its full width on a
 *  line. Give the button the full name as its aria-label. */
export function SubmitLabel() {
  const [verb, noun] = COPY.submit.split(' ');
  // One inline run: a Button is a flex row, and its gap would split two children.
  return <span>{verb}<span className="max-[359px]:hidden">{` ${noun}`}</span></span>;
}

export default function SessionBar({ index, total, about = false, answered, action, detail, children }) {
  return (
    <div
      data-session-bar=""
      className="sticky top-[var(--sticky-top,0.75rem)] z-30 flex items-center gap-2 sm:gap-3 min-h-12 px-2 sm:px-4 py-1 bg-surface/90 backdrop-blur-xl reduce-transparency:bg-surface reduce-transparency:backdrop-blur-none border border-border2/60 rounded-[var(--radius-lg)] shadow-sm"
    >
      {action}
      <span className="shrink-0 text-xs sm:text-sm font-semibold text-textMain tabular-nums">
        <span className={about ? '' : 'max-sm:sr-only'}>{itemOf(index, total, { about })}</span>
        {!about && <span aria-hidden="true" className="sm:hidden">{index + 1}/{total}</span>}
      </span>
      {answered != null && (
        <span className="shrink-0 text-xs text-muted2 tabular-nums max-[359px]:hidden">{answered} answered</span>
      )}
      {detail}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2 min-w-0">{children}</div>
    </div>
  );
}
