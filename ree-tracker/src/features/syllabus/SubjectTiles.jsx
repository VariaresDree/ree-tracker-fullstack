// src/features/syllabus/SubjectTiles.jsx
//
// The tracker's overview: a tile per subject, which also switches the list below
// it, and that subject's topics by mastery band. Drawn in plain HTML and SVG, so
// this tab needs no chart library and works offline. Every mark has its number
// beside it, so colour never carries meaning alone.
import { cn } from '../../components/ui';

const RING = 56;
const STROKE = 6;

function Ring({ percent, label }) {
  const r = (RING - STROKE) / 2;
  const length = 2 * Math.PI * r;
  const value = Math.round(percent);
  return (
    <span role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="relative shrink-0 inline-flex items-center justify-center" style={{ width: RING, height: RING }}>
      <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`} aria-hidden="true" className="-rotate-90">
        <circle cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke="var(--border-light)" strokeWidth={STROKE} />
        {value > 0 && (
          <circle cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={`${(value / 100) * length} ${length}`} />
        )}
      </svg>
      <span aria-hidden="true" className="absolute text-xs font-semibold tabular-nums text-textMain">{value}%</span>
    </span>
  );
}

/** @param {{ tiles: Array<{ subject, label, percent, covered, total, share, subtopics, items }> }} props */
export function SubjectTiles({ tiles, active, onPick }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 @2xl:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <button
            key={t.subject}
            type="button"
            aria-pressed={t.subject === active}
            onClick={() => onPick(t.subject)}
            className={cn(
              'flex items-center gap-3 min-w-0 p-3 text-left rounded-[var(--radius-default)] border cursor-pointer transition-colors',
              t.subject === active
                ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_45%,transparent)]'
                : 'border-border hover:bg-surface2',
            )}
          >
            <Ring percent={t.percent} label={`${t.subject}: ${t.covered} of ${t.total} topics covered`} />
            <span className="min-w-0 flex flex-col gap-0.5 text-xs text-muted2">
              <span className="text-sm text-textMain font-semibold">
                {t.label}<span className="font-normal text-muted2"> · {t.share}% of the exam</span>
              </span>
              <span className="tabular-nums">{t.covered} of {t.total} topics covered</span>
              {t.subtopics.total > 0 && <span className="tabular-nums">{t.subtopics.done} of {t.subtopics.total} subtopics</span>}
              {t.items.total > 0 && <span className="tabular-nums">{t.items.covered} of {t.items.total} board items</span>}
            </span>
          </button>
        ))}
      </div>
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
      <span className="text-eyebrow">Topics by mastery</span>
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
