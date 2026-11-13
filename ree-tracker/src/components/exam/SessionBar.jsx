// src/components/exam/SessionBar.jsx
//
// The one bar that stays in view while a session runs: where you are, the clock
// and the ways out, in a single row at every width. A phone used to stack the
// exam banner, two toolbar rows and the navigator above the question.
//
// `index` and `total` say which item this is; `about` when the total is an
// estimate (the placement test). `answered` is left out of the row where it won't
// fit, and the navigator shows it anyway. `submit` sits last, beside the clock,
// and never shrinks: ExamLayout clips what overflows, and a clipped Submit looks
// like no Submit at all.
import { Button } from '../ui';
import { LogOut } from '../ui/icons';
import { COPY, itemOf } from '../../features/quiz/examCopy';

/** Finishing the session. It only opens the dialog, so one tap ends nothing.
 *  Quiet until every item is answered, when it's the obvious next step. */
export function SubmitButton({ allAnswered = false, label = COPY.submitShort, name = COPY.submit, ...rest }) {
  return (
    <Button size="sm" variant={allAnswered ? 'primary' : 'outline'} className="shrink-0" aria-label={name} {...rest}>
      {label}
    </Button>
  );
}

/** Leaving a session: just the icon on a phone, where the row has no room. */
export function LeaveButton({ tone, onClick }) {
  return (
    <Button variant="ghost" tone={tone} size="sm" className="shrink-0 max-sm:px-2 pointer-coarse:min-w-11" aria-label="Leave" title="Leave" onClick={onClick}>
      <LogOut size={15} strokeWidth={1.75} aria-hidden="true" />
      <span className="max-sm:hidden">Leave</span>
    </Button>
  );
}

export default function SessionBar({ index, total, about = false, noun, answered, action, detail, submit, children }) {
  return (
    <div
      data-session-bar=""
      className="sticky top-[var(--sticky-top,0.75rem)] z-30 flex items-center gap-2 sm:gap-3 min-h-12 px-2 sm:px-4 py-1 bg-surface/90 backdrop-blur-xl reduce-transparency:bg-surface reduce-transparency:backdrop-blur-none border border-border2/60 rounded-[var(--radius-lg)] shadow-sm"
    >
      {action}
      <span className="shrink-0 text-xs sm:text-sm font-semibold text-textMain tabular-nums">
        <span className={about ? '' : 'max-sm:sr-only'}>{itemOf(index, total, { about, noun })}</span>
        {!about && <span aria-hidden="true" className="sm:hidden">{index + 1}/{total}</span>}
      </span>
      {answered != null && (
        <span className={`shrink-0 text-xs text-muted2 tabular-nums ${submit ? 'max-sm:hidden' : 'max-[359px]:hidden'}`}>{answered} answered</span>
      )}
      {detail}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2 min-w-0">{children}{submit}</div>
    </div>
  );
}
