import { useTicker } from '../../motion/useTicker';
import { cn } from './cn';

// Display-typography hero numeric. Animates from previous render to new value.
export function Stat({ value, suffix = '', precision = 0, label, className }) {
  const live = useTicker(Number(value) || 0, 600);
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted">
          {label}
        </span>
      )}
      <span className="text-display text-textMain text-4xl leading-none tabular-nums">
        {live.toFixed(precision)}
        {suffix && (
          <span className="text-muted2 text-2xl ml-1 font-sans">{suffix}</span>
        )}
      </span>
    </div>
  );
}
