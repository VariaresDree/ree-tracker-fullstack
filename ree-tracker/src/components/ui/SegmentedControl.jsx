import { useRef } from 'react';
import { cn } from './cn';

// Radiogroup-semantics picker for every 2–4 option choice (mode pickers,
// volume, Day/Week/Month…). Roving tabindex + arrow keys, 44px targets on
// touch, single-accent selected state — replaces the ad-hoc button rows.
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  size = 'md',
  fullWidth = false,
  columns,
  className,
}) {
  const refs = useRef([]);
  const idx = options.findIndex((o) => o.value === value);

  const move = (delta) => {
    if (!options.length) return;
    let next = idx;
    // Skip disabled options while cycling.
    for (let step = 0; step < options.length; step++) {
      next = (next + delta + options.length) % options.length;
      if (!options[next].disabled) break;
    }
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'grid gap-1.5 p-1 bg-bg border border-border rounded-[var(--radius-default)]',
        fullWidth && 'w-full',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${columns || options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (idx === -1 && i === 0) ? 0 : -1}
            ref={(el) => (refs.current[i] = el)}
            disabled={opt.disabled}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] font-medium transition-colors btn-press',
              'disabled:opacity-40 disabled:pointer-events-none pointer-coarse:min-h-11',
              size === 'sm' ? 'min-h-8 px-2.5 text-xs' : 'min-h-9 px-3 text-sm',
              selected
                ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_45%,transparent)]'
                : 'text-muted2 hover:text-textMain hover:bg-surface2 border border-transparent'
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {Icon && <Icon size={14} strokeWidth={1.75} aria-hidden="true" />}
              {opt.label}
            </span>
            {opt.hint && <span className="text-[11px] font-normal text-muted">{opt.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
