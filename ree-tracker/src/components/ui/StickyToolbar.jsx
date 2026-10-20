import { cn } from './cn';

// The bar that stays in view under the header while a session runs
// (Practice, the Gauntlet, the simulator): the clock, the counts, End. The
// three hand-rolled versions differed in blur, padding, shape and layer.
// It sits at --sticky-top (below the phone header or the exam banner) on the
// page-toolbar layer (z 30, index.css), and turns solid under reduced
// transparency.
export function StickyToolbar({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        'sticky top-[var(--sticky-top,0.75rem)] z-30 flex flex-wrap items-center justify-between gap-x-3 gap-y-2',
        'bg-surface/90 backdrop-blur-xl reduce-transparency:bg-surface reduce-transparency:backdrop-blur-none',
        'border border-border2/60 rounded-[var(--radius-lg)] shadow-sm px-3 sm:px-4 py-2.5',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export default StickyToolbar;
