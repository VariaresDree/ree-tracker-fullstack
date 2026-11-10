// src/features/reference/admin/CardsPanel.jsx
//
// Admin › Formula cards › Cards: every published card, browsed the way
// learners find them (Library › Formula cards). One place for what were four
// sections: Live cards, Coverage, Data debt and the retired concept cards.
//   • Subject: All, or one of the three, in board order.
//   • Show: All, Needs fixing (the server's required-field report, GET
//     /reference-cards/debt), or Retired (concept cards learners don't see).
//   • Sort: Syllabus order (the default) lists every topic of the syllabus,
//     cards or not, so a thin topic shows; inside a topic, cards fall under
//     their tags exactly as learners see them (groupCards). The other sorts
//     are one list.
// A list shows PAGE cards at a time: each card renders its LaTeX, and the
// deck was a single unbounded list.
import { useDeferredValue, useMemo, useState } from 'react';
import { Badge, Button, Card, Disclosure, EmptyState, FormField, Input, SegmentedControl, Select, StatusPill } from '../../../components/ui';
import { BookOpen, Layers, Pencil, Search } from '../../../components/ui/icons';
import LatexRenderer from '../../../components/LatexRenderer';
import { withMathDelimiters } from '../../../utils/mathDelimiters';
import { GENERAL, groupCards } from '../groupCards';
import { SYLLABUS_SUBJECTS } from '@ree/shared';

const PAGE = 30;
const SORTS = [
  { value: 'syllabus', label: 'Syllabus order' },
  { value: 'az', label: 'Name (A–Z)' },
  { value: 'recent', label: 'Recently added' },
  { value: 'type', label: 'Card type' },
];
const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' });
const SORTERS = {
  az: byName,
  recent: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  type: (a, b) => String(a.kind || '').localeCompare(String(b.kind || '')) || byName(a, b),
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// `inTopic`: under its topic and tag headings, which already say them.
function CardRow({ card, reasons, inTopic = false, children }) {
  return (
    <Card padding="sm" className="flex flex-col gap-2 min-w-0">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={card.kind === 'concept' ? 'neutral' : 'velocity'} className="uppercase">{card.kind === 'concept' ? 'Concept (retired)' : card.kind}</Badge>
            <span className="font-bold text-sm text-textMain line-clamp-1 [overflow-wrap:anywhere]" title={card.name}>{card.name}</span>
          </div>
          {(!inTopic || reasons?.length > 0) && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              {!inTopic && <Badge tone="neutral">{card.subject}</Badge>}
              {!inTopic && card.topic?.name && <Badge tone="neutral" className="truncate max-w-[160px]" title={card.topic.name}>{card.topic.name}</Badge>}
              {!inTopic && card.subtopicTag && <Badge tone="signal" className="truncate max-w-[120px]" title={card.subtopicTag}>{card.subtopicTag}</Badge>}
              {reasons?.length > 0 && <StatusPill tone="danger">{reasons.join(' · ')}</StatusPill>}
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">{children}</div>
      </div>
      {(card.formulaLatex || card.valueUnit) && (
        <div className="bg-bg border border-border rounded-[var(--radius-default)] px-3 py-2 math-scroll-mobile min-w-0 text-sm">
          {/* withMathDelimiters, as Flashcard.jsx renders it for learners. */}
          <LatexRenderer content={withMathDelimiters(card.formulaLatex || card.valueUnit)} />
        </div>
      )}
      <div className="text-xs text-muted2 line-clamp-2 [overflow-wrap:anywhere] [&_p]:!m-0">
        <LatexRenderer content={card.description} />
      </div>
    </Card>
  );
}

function ShowMore({ shown, total, onMore }) {
  if (shown >= total) return null;
  return (
    <Button size="sm" variant="secondary" className="self-start" onClick={onMore}>
      Show {Math.min(PAGE, total - shown)} more of {total - shown}
    </Button>
  );
}

/**
 * @param {object} props
 * @param {object[]} props.live      live cards (GET /reference-cards)
 * @param {object[]} props.retired   retired concept cards
 * @param {{ card: object, reasons: string[] }[]} props.debt  the required-field report
 * @param {Record<string, string[]>} props.dynamicTOS  the syllabus, topics in order
 * @param {(card: object) => void} props.onEdit
 * @param {(card: object) => void} props.onDelete
 * @param {(tag: { subject: string, topic: string, from: string }) => void} props.onRenameTag
 */
export default function CardsPanel({ live, retired, debt, dynamicTOS, onEdit, onDelete, onRenameTag }) {
  const [subject, setSubject] = useState('All');
  const [show, setShow] = useState('all');
  const [sort, setSort] = useState('syllabus');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [openTopics, setOpenTopics] = useState(() => new Set());
  const [limits, setLimits] = useState({});
  const limitOf = (key) => limits[key] || PAGE;
  const more = (key) => setLimits((l) => ({ ...l, [key]: limitOf(key) + PAGE }));

  const reasonsById = useMemo(() => new Map((debt || []).map((d) => [d.card?.id, d.reasons || []])), [debt]);
  const needsFixing = useMemo(() => live.filter((c) => reasonsById.has(c.id)), [live, reasonsById]);
  const base = show === 'retired' ? retired : show === 'fix' ? needsFixing : live;
  const q = deferredSearch.trim().toLowerCase();
  const narrowed = !!q || show !== 'all';
  const matches = useMemo(() => base.filter((c) => (subject === 'All' || c.subject === subject)
    && (!q || [c.name, c.symbol, c.subtopicTag, c.description, c.topic?.name].some((f) => typeof f === 'string' && f.toLowerCase().includes(q)))),
  [base, subject, q]);

  // Syllabus order: every topic of each subject shown, in the syllabus's order.
  const sections = useMemo(() => {
    if (sort !== 'syllabus') return [];
    return (subject === 'All' ? SYLLABUS_SUBJECTS : [subject]).map((s) => {
      const topics = dynamicTOS?.[s] || [];
      const groups = groupCards(matches.filter((c) => c.subject === s), { by: 'topic', topicOrder: topics });
      const byLabel = new Map(groups.map((g) => [g.label, g]));
      const rows = [
        ...topics.map((t) => byLabel.get(t) || { label: t, cards: [], subgroups: [] }),
        ...groups.filter((g) => !topics.includes(g.label)),
      ].filter((g) => !narrowed || g.cards.length > 0);
      const covered = topics.filter((t) => live.some((c) => c.subject === s && c.topic?.name === t)).length;
      return { subject: s, topics: topics.length, covered, rows };
    }).filter((sec) => sec.rows.length > 0);
  }, [sort, subject, dynamicTOS, matches, narrowed, live]);

  const flat = useMemo(() => (sort === 'syllabus' ? [] : [...matches].sort(SORTERS[sort])), [sort, matches]);

  const actionsFor = (card) => (card.kind === 'concept' ? (
    <>
      <Button size="sm" variant="outline" onClick={() => onEdit(card)}>Re-type</Button>
      <Button size="sm" variant="outline" tone="danger" onClick={() => onDelete(card)}>Delete</Button>
    </>
  ) : (
    <>
      <Button size="sm" variant="outline" onClick={() => onEdit(card)}>{reasonsById.has(card.id) ? 'Fix' : 'Edit'}</Button>
      <Button size="sm" variant="outline" tone="danger" onClick={() => onDelete(card)}>Delete</Button>
    </>
  ));
  const row = (card, inTopic = false) => <CardRow key={card.id} card={card} reasons={reasonsById.get(card.id)} inTopic={inTopic}>{actionsFor(card)}</CardRow>;

  const topicBody = (sec, g) => {
    const key = `${sec.subject}|${g.label}`;
    const limit = limitOf(key);
    let left = limit;
    const visible = g.subgroups.map((sg) => {
      const cards = sg.cards.slice(0, Math.max(0, left));
      left -= cards.length;
      return { ...sg, cards };
    }).filter((sg) => sg.cards.length > 0);
    if (g.cards.length === 0) {
      return <p className="text-xs text-muted2">No cards yet. Add some from <span className="font-semibold">Add</span>, by topic.</p>;
    }
    return (
      <div className="flex flex-col gap-4">
        {visible.map((sg) => (
          <section key={sg.label} aria-label={sg.label} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-eyebrow">{sg.label}</p>
              {sg.label !== GENERAL && (
                <Button size="sm" variant="ghost" aria-label={`Rename tag ${sg.label}`} onClick={() => onRenameTag({ subject: sec.subject, topic: g.label, from: sg.label })}>
                  <Pencil size={13} strokeWidth={1.75} aria-hidden="true" /> Rename
                </Button>
              )}
            </div>
            {sg.cards.map((c) => row(c, true))}
          </section>
        ))}
        <ShowMore shown={limit} total={g.cards.length} onMore={() => more(key)} />
      </div>
    );
  };

  const empty = () => {
    if (q) {
      return (
        <EmptyState icon={Search} title="No cards match"
          description={`Nothing matches "${deferredSearch.trim()}" in a name, symbol, tag, topic or description.`}
          action={<Button size="sm" variant="ghost" onClick={() => setSearch('')}>Clear search</Button>} />
      );
    }
    if (show === 'fix') return <EmptyState icon={Layers} title="Nothing needs fixing" description="Every live card has what a card needs." />;
    if (show === 'retired') return <EmptyState icon={Layers} title="No retired cards" description="Every card is a formula or a constant." />;
    return <EmptyState icon={BookOpen} title="No live cards yet" description="Approve cards in Review, or write one in Add, and they appear here." />;
  };

  const count = sort === 'syllabus' ? sections.reduce((n, s) => n + s.rows.reduce((m, g) => m + g.cards.length, 0), 0) : flat.length;

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl label="Subject" size="sm" value={subject} onChange={setSubject}
        options={[{ value: 'All', label: 'All' }, ...SYLLABUS_SUBJECTS.map((s) => ({ value: s, label: s }))]} className="self-start" />
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <FormField label="Search" className="flex-1 min-w-0">
          <div className="relative">
            <Search size={15} strokeWidth={1.75} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, symbol, tag, topic or description" className="!pl-9" aria-label="Search cards" />
          </div>
        </FormField>
        <FormField label="Sort" className="sm:w-52 shrink-0">
          <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort cards">
            {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </FormField>
      </div>
      <SegmentedControl label="Show" size="sm" value={show} onChange={setShow} className="self-start"
        options={[
          { value: 'all', label: `All (${live.length})` },
          { value: 'fix', label: `Needs fixing (${needsFixing.length})` },
          { value: 'retired', label: `Retired (${retired.length})` },
        ]} />
      {show === 'retired' && retired.length > 0 && (
        <p className="text-xs text-muted2 max-w-2xl">Concept cards were retired: formula cards are formulas and constants now, so learners don't see these. Re-type one as a formula or a constant, or delete it.</p>
      )}

      {count === 0 ? empty() : (
        <>
          <p className="text-eyebrow">{plural(count, show === 'retired' ? 'retired card' : 'card')}{show === 'fix' ? ' to fix' : ''}{subject !== 'All' ? ` in ${subject}` : ''}</p>
          {sort === 'syllabus' ? sections.map((sec) => (
            <section key={sec.subject} aria-label={sec.subject} className="flex flex-col gap-2">
              <h3 className="text-fluid-base font-bold text-textMain">
                {sec.subject}{sec.topics > 0 && ` · ${sec.covered} of ${sec.topics} topics have cards`}
              </h3>
              {sec.rows.map((g) => {
                const key = `${sec.subject}|${g.label}`;
                const formulas = g.cards.filter((c) => c.kind === 'formula').length;
                return (
                  <Disclosure key={key} data-testid="topic-row" title={g.label}
                    description={g.cards.length === 0 ? 'No cards yet' : `${plural(formulas, 'formula')} · ${plural(g.cards.length - formulas, 'constant')}`}
                    open={narrowed || openTopics.has(key)}
                    onToggle={(open) => setOpenTopics((prev) => { const next = new Set(prev); if (open) next.add(key); else next.delete(key); return next; })}>
                    {topicBody(sec, g)}
                  </Disclosure>
                );
              })}
            </section>
          )) : (
            <div className="flex flex-col gap-3">
              {flat.slice(0, limitOf('flat')).map((c) => row(c))}
              <ShowMore shown={limitOf('flat')} total={flat.length} onMore={() => more('flat')} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
