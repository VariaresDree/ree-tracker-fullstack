// src/features/syllabus/SubjectTiles.jsx
//
// The tracker's overview: a ring per subject, always three in a row, which also
// switches the list below it, and that subject's topics by mastery band. Drawn in
// plain HTML and SVG, so this tab needs no chart library and works offline. Every
// mark has its number beside it, so colour never carries meaning alone.
import { Ring, cn } from '../../components/ui';

/** @param {{ tiles: Array<{ subject, label, percent, covered, total }> }} props */
export function SubjectRings({ tiles, active, onPick }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {tiles.map((t) => (
        <button
          key={t.subject}
          type="button"
          aria-pressed={t.subject === active}
          aria-label={`${t.subject}: ${t.covered} of ${t.total} topics covered`}
          onClick={() => onPick(t.subject)}
          className={cn(
            'flex flex-col items-center gap-1 min-w-0 p-2 rounded-[var(--radius-default)] border cursor-pointer transition-colors',
            t.subject === active
              ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_45%,transparent)]'
              : 'border-transparent hover:bg-surface2',
          )}
        >
          <Ring percent={t.percent} label={`${t.subject}: ${t.covered} of ${t.total} topics covered`} />
          <span className="text-sm font-semibold text-textMain">{t.label}</span>
          <span className="text-xs text-muted2 tabular-nums">{t.covered}/{t.total}</span>
        </button>
      ))}
    </div>
  );
}

// Mastery's own colours, as on Progress › Topics, from Novice up.
const BANDS = [
  { key: 'mastered', label: 'Mastered', fill: 'var(--color-reeGreen)' },
  { key: 'proficient', label: 'Proficient', fill: 'var(--color-reeCyan)' },
  { key: 'developing', label: 'Developing', fill: 'var(--color-reeAmber)' },
  { key: 'novice', label: 'Novice', fill: 'var(--color-reeRed)' },
  { key: 'none', label: 'No answers', fill: 'var(--border-light)' },
];

export function MasteryStrip({ counts, subject }) {
  const shown = BANDS.filter((b) => counts[b.key] > 0);
  const words = shown.map((b) => `${b.label} ${counts[b.key]}`).join(', ');
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div role="img" aria-label={`${subject} topics by mastery: ${words}`} className="flex gap-0.5 h-2.5">
        {shown.map((b) => (
          <span key={b.key} title={`${b.label}: ${counts[b.key]}`} className="rounded-[2px] min-w-1 first:rounded-l-full last:rounded-r-full" style={{ flexGrow: counts[b.key], flexBasis: 0, background: b.fill }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted2">
        {shown.map((b) => (
          <li key={b.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: b.fill }} />
            {b.label} <span className="tabular-nums text-textMain">{counts[b.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
