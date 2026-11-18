// src/features/reference/QuickSheet.jsx
//
// Formula cards › Quick sheet: a subject's (or a topic's) formulas and
// constants as one scannable reviewer, with no flipping. Each row is the
// name, the formula or value, and its unit; tap Study to drill a group as
// cards. It replaces the "All cards" sheet, which laid out every card as a
// flip card with Fronts/Backs, topic chips and fold controls: the same
// content, much harder to scan. Hide answers makes it a self-test (say each one,
// tap to check), and Print this sheet opens it on /print/formulas.
//
// 2026-11-18: a subject's sheet is up to 900 rows, so rows are typeset 25 at a
// time as they near the screen (LazyMount), with KaTeX straight from a shared
// cache (fastMath). Each formula shows one result per line, and the symbol line
// that repeated the formula's start is gone.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, StatusPill } from '../../components/ui';
import { Eye, EyeOff, LayoutGrid, Printer } from '../../components/ui/icons';
import { withMathDelimiters } from '../../utils/mathDelimiters';
import { GENERAL, groupCards } from './groupCards';
import { CardMath, FitLines } from './CardBody';
import { formulaLines } from './fastMathText';
import LazyMount from './LazyMount';
import { chunked } from './fastMathText';

const ROWS_PER_CHUNK = 25;
const ROW_HEIGHT = 72;

const countLabel = (n) => `${n} card${n === 1 ? '' : 's'}`;

function SheetRow({ card, hidden, onReveal }) {
  const isConstant = card.kind === 'constant';
  const main = isConstant ? card.valueUnit : card.formulaLatex;
  // A formula's unit is its valueUnit; a constant's value already carries it.
  const unit = !isConstant ? card.valueUnit : null;
  return (
    <li className="flex flex-col gap-1 py-3 min-w-0 sm:grid sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-4 sm:items-baseline">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-textMain [overflow-wrap:anywhere]">
          {card.name}
          {isConstant && <span className="ml-2 text-xs font-normal text-muted2">constant</span>}
        </p>
      </div>
      {hidden ? (
        <button
          type="button"
          onClick={() => onReveal(card.id)}
          aria-label={`Tap to reveal ${card.name}`}
          className="min-h-11 w-full px-3 text-left text-sm text-muted2 rounded-[var(--radius-default)] border border-dashed border-border hover:bg-surface2 cursor-pointer transition-colors"
        >
          Tap to reveal
        </button>
      ) : (
      <div className="min-w-0 flex flex-col gap-0.5">
        {main ? (
          <FitLines lines={formulaLines(withMathDelimiters(main))} className="text-fluid-base text-textMain [&_.katex-display]:!text-left [&_.katex-display>.katex]:!text-left" />
        ) : card.dimensionless ? (
          <p className="text-sm text-muted2">Dimensionless</p>
        ) : null}
        {unit && (
          <p className="text-xs text-muted2">
            Unit: <CardMath value={unit} inline />
          </p>
        )}
      </div>
      )}
    </li>
  );
}

/**
 * `cards`: already filtered to what's on show. `by`: 'topic' groups a
 * subject's cards by topic (in syllabus order), 'subtopic' a topic's by
 * subtopic. `onStudy(cards)` drills a group as flip cards. `printTo`: where
 * Print this sheet goes.
 */
export default function QuickSheet({ cards, scopeLabel, by = 'topic', topicOrder = [], onStudy, printTo }) {
  const groups = useMemo(() => groupCards(cards, { by, topicOrder }), [cards, by, topicOrder]);
  const single = groups.length === 1 && groups[0].label === GENERAL;
  const [hiding, setHiding] = useState(false);
  const [revealed, setRevealed] = useState(() => new Set());
  const reveal = (id) => setRevealed((seen) => new Set(seen).add(id));
  const toggleHiding = () => {
    setHiding((h) => !h);
    setRevealed(new Set());
  };
  const row = (c) => <SheetRow key={c.id} card={c} hidden={hiding && !revealed.has(c.id)} onReveal={reveal} />;
  // Rows in chunks, each typeset when it nears the screen; the page's first is drawn at once.
  const rows = (list, top) => chunked(list, ROWS_PER_CHUNK).map((chunk, i) => (
    <LazyMount key={chunk[0].id} eager={top && i === 0} estimate={chunk.length * ROW_HEIGHT}>
      <ul className="divide-y divide-border">{chunk.map(row)}</ul>
    </LazyMount>
  ));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted2">
        Every formula and constant in <span className="font-semibold text-textMain">{scopeLabel}</span> at a glance. Hide the answers and say each one.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" aria-pressed={hiding} onClick={toggleHiding}>
          {hiding
            ? <><Eye size={14} strokeWidth={1.75} aria-hidden="true" /> Show all</>
            : <><EyeOff size={14} strokeWidth={1.75} aria-hidden="true" /> Hide answers</>}
        </Button>
        {printTo && (
          <Button size="sm" variant="secondary" as={Link} to={printTo}>
            <Printer size={14} strokeWidth={1.75} aria-hidden="true" /> Print this sheet
          </Button>
        )}
      </div>
      {groups.map((g, gi) => (
        <section key={g.label} aria-label={single ? scopeLabel : g.label} className="flex flex-col gap-1">
          {!single && (
            <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <h3 className="text-fluid-base font-bold text-textMain min-w-0 [overflow-wrap:anywhere]">{g.label}</h3>
              <div className="flex items-center gap-2 shrink-0">
                <StatusPill tone="neutral" dot={false}>{countLabel(g.cards.length)}</StatusPill>
                <Button size="sm" variant="ghost" onClick={() => onStudy(g.cards)} aria-label={`Study the ${g.label} cards`}>
                  <LayoutGrid size={14} strokeWidth={1.75} aria-hidden="true" /> Study
                </Button>
              </div>
            </div>
          )}
          {g.subgroups.length > 1 || (g.subgroups.length === 1 && g.subgroups[0].label !== GENERAL) ? (
            g.subgroups.map((sg, si) => (
              <div key={sg.label} className="flex flex-col">
                <p className="text-eyebrow pt-3">{sg.label}</p>
                {rows(sg.cards, gi === 0 && si === 0)}
              </div>
            ))
          ) : (
            rows(g.subgroups[0]?.cards || g.cards, gi === 0)
          )}
        </section>
      ))}
    </div>
  );
}
