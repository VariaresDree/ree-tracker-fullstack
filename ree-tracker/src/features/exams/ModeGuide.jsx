// src/features/exams/ModeGuide.jsx
//
// "Which mode do I use?" — the four ways to study, side by side. New learners
// met four entry points (Practice, Mock board, Gauntlet, Battles) with nothing
// saying how they differ: which one shows answers as you go, which one is
// timed, which one can lock you out. Shown in full on the placement result
// (with the one to start with marked), and folded on Exams and Practice.
import { Link } from 'react-router-dom';
import { Badge, cn } from '../../components/ui';
import { ChevronDown } from '../../components/ui/icons';
import { MODES } from './modes';

function ModeList({ start, headingLevel = 3 }) {
  const Heading = `h${headingLevel}`;
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {MODES.map((m) => {
        const Icon = m.icon;
        const isStart = m.id === start;
        return (
          <li key={m.id}>
            <Link
              to={m.to}
              className={cn(
                'h-full flex gap-3 p-4 rounded-[var(--radius-lg)] border transition-colors',
                isStart
                  ? 'border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]'
                  : 'border-border bg-surface2/30 hover:bg-surface2',
              )}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-0.5 text-[var(--accent-text)]" />
              <span className="flex flex-col gap-1 min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <Heading className="text-sm font-semibold text-textMain">{m.name}</Heading>
                  {isStart && <Badge tone="velocity">Start here</Badge>}
                </span>
                <span className="text-xs font-medium text-muted2">{m.when}</span>
                <span className="text-xs text-muted2 leading-relaxed">{m.how}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * @param {{ start?: string, folded?: boolean, headingLevel?: number }} props
 *   start: the mode to mark "Start here"; folded: a disclosure that opens on
 *   tap (Exams and Practice), instead of the open card (placement result).
 */
export default function ModeGuide({ start, folded = false, headingLevel = 3 }) {
  if (folded) {
    return (
      <details className="group rounded-[var(--radius-lg)] border border-border bg-surface/60">
        <summary className="flex items-center justify-between gap-2 min-h-11 px-4 cursor-pointer list-none text-sm font-medium text-textMain [&::-webkit-details-marker]:hidden">
          Which mode do I use?
          <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" className="text-muted2 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4">
          <ModeList start={start} headingLevel={headingLevel} />
        </div>
      </details>
    );
  }
  return (
    <section aria-labelledby="mode-guide-heading" className="flex flex-col gap-3">
      <h2 id="mode-guide-heading" className="text-base font-semibold text-textMain">Which mode do I use?</h2>
      <ModeList start={start} headingLevel={headingLevel} />
    </section>
  );
}
