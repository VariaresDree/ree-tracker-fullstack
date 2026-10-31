// src/features/reference/QuickSheet.jsx
//
// Formula cards › Quick sheet: a subject's (or a topic's) formulas and
// constants as one scannable reviewer, with no flipping. Each row is the
// name, the formula or value, and its unit; tap Study to drill a group as
// cards. It replaces the "All cards" sheet, which laid out every card as a
// flip card with Fronts/Backs, topic chips and fold controls: the same
// content, much harder to scan.
import { useMemo } from 'react';
import { Button, StatusPill } from '../../components/ui';
import { LayoutGrid } from '../../components/ui/icons';
import LatexRenderer from '../../components/LatexRenderer';
import { withMathDelimiters } from '../../utils/mathDelimiters';
import { GENERAL, groupCards } from './groupCards';

const countLabel = (n) => `${n} card${n === 1 ? '' : 's'}`;

function SheetRow({ card }) {
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
    </li>
  );
}

/**
 * `cards`: already filtered to what's on show. `by`: 'topic' groups a
 * subject's cards by topic (in syllabus order), 'subtopic' a topic's by
 * subtopic. `onStudy(cards)` drills a group as flip cards.
 */
export default function QuickSheet({ cards, scopeLabel, by = 'topic', topicOrder = [], onStudy }) {
  const groups = useMemo(() => groupCards(cards, { by, topicOrder }), [cards, by, topicOrder]);
  const single = groups.length === 1 && groups[0].label === GENERAL;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted2">
        Every formula and constant in <span className="font-semibold text-textMain">{scopeLabel}</span> at a glance. Cover the right side and say each one.
      </p>
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
                <ul className="divide-y divide-border">{sg.cards.map((c) => <SheetRow key={c.id} card={c} />)}</ul>
              </div>
            ))
          ) : (
            <ul className="divide-y divide-border">{(g.subgroups[0]?.cards || g.cards).map((c) => <SheetRow key={c.id} card={c} />)}</ul>
          )}
        </section>
      ))}
    </div>
  );
}
