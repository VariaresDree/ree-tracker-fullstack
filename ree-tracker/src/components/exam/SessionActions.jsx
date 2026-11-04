// src/components/exam/SessionActions.jsx
//
// Previous, Next and Submit, kept in view at the foot of the screen: under a long
// solution, Next was a scroll away after every question. In the app's layout it
// sits above the phone's bottom bar, and comes down with it when the bar slides
// away (BottomBar marks <html> while it's hidden). It also clears the floating
// focus timer.
import { cn } from '../ui';

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
