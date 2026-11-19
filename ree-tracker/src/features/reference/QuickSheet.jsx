// src/features/reference/QuickSheet.jsx
//
// Formula cards › the formula sheet: a topic's (or a search's) formulas and
// constants as panels of rows, with no flipping. Each panel is a syllabus
// subtopic (or a topic, for a search), so related formulas sit together instead
// of as a wall of small cards; each row is the name and the formula, and tapping
// it opens what the symbols mean, what it's for and the board tip. Hide formulas
// makes it a self-test (say each one, tap to check); Study drills a panel as
// cards; Print this sheet opens it on /print/formulas.
//
// 2026-11-19: this is the only way to browse cards now. The flip-card grid
// (uneven heights, "Tap to flip" on every card, a units link under some) and the
// Cards / Quick sheet switch are gone; the flip card lives on in Study, drills
// and Today's loop, where recalling before turning it over is the point.
//
// A topic is up to 150 rows, so rows are typeset 25 at a time as they near the
// screen (LazyMount), with KaTeX from a shared cache (fastMath). A row's details
// are built when it opens.
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { ChevronDown, Eye, EyeOff, LayoutGrid, Printer } from '../../components/ui/icons';
import { withMathDelimiters } from '../../utils/mathDelimiters';
import { GENERAL, groupCards } from './groupCards';
import CardBody, { CardMath, FitLines } from './CardBody';
import { chunked, formulaLines } from './fastMathText';
import LazyMount from './LazyMount';
import UnitsLink from './UnitsLink';

const ROWS_PER_CHUNK = 25;
const ROW_HEIGHT = 72;

const sourceOf = (s) => s?.title && `${s.title}${s.edition ? ` (${s.edition})` : ''}${s.section ? ` · ${s.section}` : ''}`;

function SheetRow({ card, hidden, onReveal }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const isConstant = card.kind === 'constant';
  const main = isConstant ? card.valueUnit : card.formulaLatex;
  // A formula's unit is its valueUnit; a constant's value already carries it.
  const unit = !isConstant ? card.valueUnit : null;
  const name = (
    <span className="text-sm font-semibold text-textMain [overflow-wrap:anywhere]">
      {card.name}
      {isConstant && <span className="ml-2 text-xs font-normal text-muted2">constant</span>}
    </span>
  );
  const grid = 'flex flex-col gap-1 min-w-0 sm:grid sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto] sm:gap-4 sm:items-baseline';

  if (hidden) {
    return (
      <li className={`py-3 ${grid}`}>
        {name}
        <button
          type="button"
          onClick={() => onReveal(card.id)}
          aria-label={`Tap to reveal ${card.name}`}
          className="min-h-11 w-full px-3 text-left text-sm text-muted2 rounded-[var(--radius-default)] border border-dashed border-border hover:bg-surface2 cursor-pointer transition-colors"
        >
          Tap to reveal
        </button>
      </li>
    );
  }

  return (
    <li className="min-w-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((o) => !o)}
        className={`w-full py-3 text-left cursor-pointer rounded-[var(--radius-sm)] hover:bg-surface2/50 transition-colors ${grid}`}
      >
        {name}
        <span className="min-w-0 flex flex-col gap-0.5">
          {main ? (
            <FitLines lines={formulaLines(withMathDelimiters(main))} className="text-fluid-base text-textMain [&_.katex-display]:!text-left [&_.katex-display>.katex]:!text-left" />
          ) : card.dimensionless ? (
            <span className="text-sm text-muted2">Dimensionless</span>
          ) : null}
          {unit && (
            <span className="text-xs text-muted2">Unit: <CardMath value={unit} inline /></span>
          )}
        </span>
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" className={`hidden sm:block self-center shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={detailsId} hidden={!open} className="pb-4 sm:pl-[calc(13rem+1rem)] flex flex-col gap-3 min-w-0">
        {open && (
          <>
            <CardBody card={card} withAnswer={false} />
            <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
              {sourceOf(card.source) ? <span className="text-xs text-muted2 [overflow-wrap:anywhere]">{sourceOf(card.source)}</span> : <span />}
              <UnitsLink card={card} />
            </div>
          </>
        )}
      </div>
    </li>
  );
}

// Rows in chunks, each typeset when it nears the screen; `eager` draws the first at once.
function Rows({ cards, eager, hidden, onReveal }) {
  return chunked(cards, ROWS_PER_CHUNK).map((chunk, i) => (
    <LazyMount key={chunk[0].id} eager={eager && i === 0} estimate={chunk.length * ROW_HEIGHT}>
      <ul className="divide-y divide-border">
        {chunk.map((c) => <SheetRow key={c.id} card={c} hidden={hidden(c)} onReveal={onReveal} />)}
      </ul>
    </LazyMount>
  ));
}

const named = (g) => g.subgroups.length > 1 || (g.subgroups.length === 1 && g.subgroups[0].label !== GENERAL);

// A group's rows, under its smaller named groups when it has them.
function GroupRows({ group, eager, hidden, onReveal }) {
  if (!named(group)) return <Rows cards={group.subgroups[0]?.cards || group.cards} eager={eager} hidden={hidden} onReveal={onReveal} />;
  return group.subgroups.map((sg, i) => (
    <div key={sg.label} className="flex flex-col">
      <p className="text-eyebrow pt-3">{sg.label} · {sg.cards.length}</p>
      <Rows cards={sg.cards} eager={eager && i === 0} hidden={hidden} onReveal={onReveal} />
    </div>
  ));
}

/** One subtopic's formulas as rows, for a lesson section: no panel, no controls. */
export function FormulaList({ cards }) {
  const group = useMemo(() => groupCards(cards, { by: 'subtopic' }), [cards]);
  return group.map((g) => <GroupRows key={g.label} group={g} eager hidden={() => false} onReveal={() => {}} />);
}

const anchorOf = (g) => `cards-${g.id || 'other'}`;

/**
 * `cards`: already filtered to what's on show. `by`: 'subtopic' puts a topic's
 * cards in a panel per syllabus subtopic, 'topic' a search's in a panel per
 * topic. `onStudy(cards)` drills a panel as flip cards. `printTo`: where Print
 * this sheet goes. `actions`: more buttons for the control row.
 */
export default function QuickSheet({ cards, scopeLabel, by = 'topic', topicOrder = [], onStudy, printTo, actions = null }) {
  const groups = useMemo(() => groupCards(cards, { by, topicOrder }), [cards, by, topicOrder]);
  const single = groups.length === 1 && groups[0].label === GENERAL;
  const [hiding, setHiding] = useState(false);
  const [revealed, setRevealed] = useState(() => new Set());
  const reveal = (id) => setRevealed((seen) => new Set(seen).add(id));
  const hidden = (c) => hiding && !revealed.has(c.id);
  const toggleHiding = () => {
    setHiding((h) => !h);
    setRevealed(new Set());
  };
  // A topic's subtopics: one line of jumps that scrolls sideways, not a block of chips.
  const jumps = by === 'subtopic' && groups.length > 1 && groups.some((g) => g.id);

  return (
    <div className="flex flex-col gap-5">
      {/* On a phone, two equal buttons a row (an odd last one spans both), not a
          ragged wrap; one row from sm up. */}
      <div className="grid grid-cols-2 gap-2 [&>*]:w-full [&>*:last-child:nth-child(odd)]:col-span-2 sm:flex sm:flex-wrap sm:[&>*]:w-auto">

        <Button size="sm" variant="secondary" aria-pressed={hiding} onClick={toggleHiding}>
          {hiding
            ? <><Eye size={14} strokeWidth={1.75} aria-hidden="true" /> Show formulas</>
            : <><EyeOff size={14} strokeWidth={1.75} aria-hidden="true" /> Hide formulas</>}
        </Button>
        {actions}
        {printTo && (
          <Button size="sm" variant="secondary" as={Link} to={printTo}>
            <Printer size={14} strokeWidth={1.75} aria-hidden="true" /> Print this sheet
          </Button>
        )}
      </div>

      {jumps && (
        <nav aria-label="On this page" className="flex flex-col gap-1.5 min-w-0">
          <p className="text-eyebrow">On this page</p>
          <ul className="flex gap-1 overflow-x-auto overscroll-x-contain -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {groups.map((g) => (
              <li key={anchorOf(g)} className="shrink-0">
                <Button as="a" href={`#${anchorOf(g)}`} size="sm" variant="ghost" className="whitespace-nowrap">
                  {g.label} <span className="tabular-nums text-muted2">{g.cards.length}</span>
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {single ? (
        <Card as="section" padding="md" aria-label={scopeLabel}>
          <GroupRows group={groups[0]} eager hidden={hidden} onReveal={reveal} />
        </Card>
      ) : groups.map((g, gi) => (
        <Card
          key={anchorOf(g) + g.label}
          as="section"
          padding="md"
          id={by === 'subtopic' ? anchorOf(g) : undefined}
          aria-labelledby={`${anchorOf(g)}-${gi}-h`}
          className="flex flex-col gap-1 scroll-mt-20 min-w-0"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
            <h3 id={`${anchorOf(g)}-${gi}-h`} className="text-fluid-base font-bold text-textMain min-w-0 [overflow-wrap:anywhere]">
              {g.label} <span className="ml-1 text-xs font-normal text-muted2 tabular-nums">{g.cards.length}</span>
            </h3>
            {onStudy && (
              <Button size="sm" variant="ghost" className="shrink-0" onClick={() => onStudy(g.cards)} aria-label={`Study the ${g.label} cards`}>
                <LayoutGrid size={14} strokeWidth={1.75} aria-hidden="true" /> Study
              </Button>
            )}
          </div>
          <GroupRows group={g} eager={gi === 0} hidden={hidden} onReveal={reveal} />
        </Card>
      ))}
    </div>
  );
}
