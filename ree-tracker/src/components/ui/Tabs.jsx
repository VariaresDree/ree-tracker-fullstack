import { useRef } from 'react';
import { cn } from './cn';

// Page-level tab row (Arena, Profile, Materials). Real tablist semantics
// with arrow-key movement — same pattern HeatmapChart's subject tabs proved
// out — plus 44px touch targets and horizontal scroll on narrow screens.
export function Tabs({ tabs, active, onChange, label, className }) {
  const refs = useRef([]);
  const idx = tabs.findIndex((t) => t.id === active);

  const move = (delta) => {
    if (!tabs.length) return;
    const next = (idx + delta + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      move(-1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('flex gap-1 overflow-x-auto border-b border-border', className)}
    >
      {tabs.map((t, i) => {
        const on = t.id === active;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            ref={(el) => (refs.current[i] = el)}
            onClick={() => onChange(t.id)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap min-h-11 px-4 text-sm font-medium',
              'rounded-t-[var(--radius-default)] transition-colors border-b-2 -mb-px',
              on
                ? 'text-[var(--accent)] border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]'
                : 'text-muted2 border-transparent hover:text-textMain hover:bg-surface2'
            )}
          >
            {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
