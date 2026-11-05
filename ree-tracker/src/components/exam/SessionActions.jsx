// src/components/exam/SessionActions.jsx
//
// Previous and Next, kept in view at the foot of the screen: under a long
// solution, Next was a scroll away after every question. In the app's layout it
// sits above the phone's bottom bar, and comes down with it when the bar slides
// away (BottomBar marks <html> while it's hidden). It also clears the floating
// focus timer.
import { Button, cn } from '../ui';
import { COPY } from '../../features/quiz/examCopy';

export default function SessionActions({ className, children }) {
  return (
    <div
      data-session-actions=""
      className={cn(
        'sticky z-30 flex items-center gap-2 p-2 transition-[bottom] duration-200 motion-reduce:transition-none',
        'bottom-[calc(var(--bottom-bar-h,0px)+var(--fab-space,0px)+0.5rem)]',
        '[html[data-bottom-bar-hidden]_&]:bottom-[calc(env(safe-area-inset-bottom,0px)+var(--fab-space,0px)+0.5rem)]',
        'bg-surface/90 backdrop-blur-xl reduce-transparency:bg-surface reduce-transparency:backdrop-blur-none',
        'border border-border2/60 rounded-[var(--radius-lg)] shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Previous at the left, Next at the right, for a session you finish yourself. On
 * the last item Next becomes `reviewLabel`, which opens the submit dialog, so a
 * tap on the last item is never a dead button. Without `onReview` (reading back a
 * finished exam) Next just stops there.
 */
export function SessionNav({ atStart, atEnd, onPrevious, onNext, onReview, reviewLabel = COPY.reviewAndSubmit, disabled = false }) {
  return (
    <SessionActions>
      <Button variant="secondary" onClick={onPrevious} disabled={atStart}>{COPY.previous}</Button>
      {atEnd && onReview
        ? <Button className="ml-auto" onClick={onReview} disabled={disabled}>{reviewLabel}</Button>
        : <Button className="ml-auto" onClick={onNext} disabled={atEnd}>{COPY.next}</Button>}
    </SessionActions>
  );
}
