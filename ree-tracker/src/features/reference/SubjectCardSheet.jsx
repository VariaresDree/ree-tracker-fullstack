// src/features/reference/SubjectCardSheet.jsx
//
// Library › Formula cards › a subject (or a topic) as ONE page of flip cards:
// every card in it, grouped topic → subtopic under headings, instead of only
// reachable one subtopic at a time. Built for the "show me everything I need
// for EE" review pass before a board exam:
//   - a jump row of topic chips (with counts) scrolls to a topic;
//   - Fronts / Backs flips every card at once (backs = the meaning, variables
//     and board traps, for a read-through without tapping 200 cards);
//   - each topic folds away, and can be studied on its own or with the rest.
//
// Lazy-loaded by ReferenceBrowser: only learners who open the all-cards view
// pay for it. Sections use content-visibility so a subject with hundreds of
// cards only lays out (and typesets) what's near the screen.
import { useMemo, useState } from 'react';
import { Button, SegmentedControl, StatusPill } from '../../components/ui';
import { ChevronDown, ChevronRight, LayoutGrid } from '../../components/ui/icons';
import NotedFlashcard from './NotedFlashcard';
import { GENERAL, groupCards } from './groupCards';

const countLabel = (n) => `${n} card${n === 1 ? '' : 's'}`;
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';

function CardGrid({ cards, face }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-4">
      {cards.map((card) => (
        // Keyed on the face so Fronts/Backs remounts the card on that side.
        <NotedFlashcard key={`${card.id}:${face}`} card={card} initialFlipped={face === 'backs'} />
      ))}
    </div>
  );
}

/**
 * `cards`: the subject's (or topic's) cards, already kind-filtered.
 * `by`: 'topic' groups topic → subtopic (a subject); 'subtopic' groups only by
 * subtopic (a topic). `onStudy(cards)` starts a study session on a set.
 */
export default function SubjectCardSheet({ cards, scopeLabel, by = 'topic', topicOrder = [], onStudy }) {
  const groups = useMemo(() => groupCards(cards, { by, topicOrder }), [cards, by, topicOrder]);
  const [face, setFace] = useState('fronts');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.label));
  const idFor = (label) => `cards-${slug(scopeLabel)}-${slug(label)}`;

  const toggle = (label) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(label)) next.delete(label); else next.add(label);
    return next;
  });
  const jumpTo = (label) => {
    setCollapsed((prev) => { if (!prev.has(label)) return prev; const next = new Set(prev); next.delete(label); return next; });
    // After the section has expanded.
    requestAnimationFrame(() => document.getElementById(idFor(label))?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const groupNoun = by === 'topic' ? 'topic' : 'subtopic';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <p className="text-sm text-muted2">
          <span className="font-semibold text-textMain">{countLabel(cards.length)}</span> in {scopeLabel}, across {groups.length} {groupNoun}{groups.length === 1 ? '' : 's'}.
          {' '}Tap a card to flip it, or show every back at once.
        </p>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <SegmentedControl
            label="Card side"
            size="sm"
            value={face}
            onChange={setFace}
            options={[{ value: 'fronts', label: 'Fronts' }, { value: 'backs', label: 'Backs' }]}
          />
          <Button size="sm" variant="secondary" onClick={() => onStudy(groups.flatMap((g) => g.cards))}>
            <LayoutGrid size={14} strokeWidth={1.75} aria-hidden="true" /> Study all {cards.length}
          </Button>
        </div>
      </div>

      {groups.length > 1 && (
        <nav aria-label={`Jump to a ${groupNoun}`} className="flex items-center gap-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 min-w-0 flex-1">
            {groups.map((g) => (
              <button
                key={g.label}
                type="button"
                onClick={() => jumpTo(g.label)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border2 bg-surface px-3 min-h-8 pointer-coarse:min-h-11 text-xs text-muted2 hover:text-textMain hover:border-[var(--accent)]/50 transition-colors focus-visible:outline-hidden focus-visible:[box-shadow:var(--focus-ring)] whitespace-nowrap"
              >
                {g.label}
                <span className="tabular-nums text-muted">{g.cards.length}</span>
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0"
            onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.label)))}
          >
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </Button>
        </nav>
      )}

      {groups.map((g) => {
        const open = !collapsed.has(g.label);
        const headingId = `${idFor(g.label)}-h`;
        return (
          <section
            key={g.label}
            id={idFor(g.label)}
            aria-labelledby={headingId}
            className="flex flex-col gap-4 scroll-mt-24"
            // Off-screen sections skip layout and paint until scrolled near.
            style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 640px' }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <h3 id={headingId} className="min-w-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggle(g.label)}
                  className="inline-flex items-center gap-2 text-left text-fluid-base font-bold text-textMain hover:text-[var(--accent-text)] transition-colors cursor-pointer [overflow-wrap:anywhere] focus-visible:outline-hidden focus-visible:[box-shadow:var(--focus-ring)] rounded-[var(--radius-sm)]"
                >
                  {open
                    ? <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-muted" />
                    : <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-muted" />}
                  {g.label}
                </button>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <StatusPill tone="neutral" dot={false}>{countLabel(g.cards.length)}</StatusPill>
                <Button size="sm" variant="ghost" onClick={() => onStudy(g.cards)} aria-label={`Study the ${g.label} cards`}>
                  Study
                </Button>
              </div>
            </div>

            {open && (
              g.subgroups.length > 1 || (g.subgroups.length === 1 && g.subgroups[0].label !== GENERAL) ? (
                g.subgroups.map((sg) => (
                  <div key={sg.label} className="flex flex-col gap-3">
                    <p className="text-eyebrow">{sg.label} · {sg.cards.length}</p>
                    <CardGrid cards={sg.cards} face={face} />
                  </div>
                ))
              ) : (
                <CardGrid cards={g.subgroups[0]?.cards || g.cards} face={face} />
              )
            )}
          </section>
        );
      })}
    </div>
  );
}
