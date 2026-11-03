// src/features/reference/QuickSheet.jsx
//
// Formula cards › Quick sheet: a subject's (or a topic's) formulas and
// constants as one scannable reviewer, with no flipping. Each row is the
// name, the formula or value, and its unit; tap Study to drill a group as
// cards. It replaces the "All cards" sheet, which laid out every card as a
// flip card with Fronts/Backs, topic chips and fold controls: the same
// content, much harder to scan. Hide answers makes it a self-test (say each one,
// tap to check), and Print this sheet opens it on /print/formulas.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, StatusPill } from '../../components/ui';
import { Eye, EyeOff, LayoutGrid, Printer } from '../../components/ui/icons';
import LatexRenderer from '../../components/LatexRenderer';
import { withMathDelimiters } from '../../utils/mathDelimiters';
import { GENERAL, groupCards } from './groupCards';

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
        {card.symbol && (
          <span className="text-xs text-muted2 [&_p]:!m-0">
            <LatexRenderer inline content={withMathDelimiters(card.symbol)} />
          </span>
        )}
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
          <div className="text-fluid-base text-textMain math-scroll-mobile min-w-0 [&_p]:!m-0">
            <LatexRenderer content={withMathDelimiters(main)} />
          </div>
        ) : card.dimensionless ? (
          <p className="text-sm text-muted2">Dimensionless</p>
        ) : null}
        {unit && (
          <p className="text-xs text-muted2 [&_p]:!m-0">
            Unit: <LatexRenderer inline content={withMathDelimiters(unit)} />
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
      {groups.map((g) => (
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
            g.subgroups.map((sg) => (
              <div key={sg.label} className="flex flex-col">
                <p className="text-eyebrow pt-3">{sg.label}</p>
                <ul className="divide-y divide-border">{sg.cards.map(row)}</ul>
              </div>
            ))
          ) : (
            <ul className="divide-y divide-border">{(g.subgroups[0]?.cards || g.cards).map(row)}</ul>
          )}
        </section>
      ))}
    </div>
  );
}
