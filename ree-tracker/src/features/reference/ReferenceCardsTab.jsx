// src/features/reference/ReferenceCardsTab.jsx
// The public reference flashcard vault: search + Subject/Topic filters (fed by
// the SHARED taxonomy via dynamicTOS) + kind chips over a responsive card grid.
// Any card is reachable in 2–3 taps (Subject → Topic → card) or directly via
// search (name / symbol / subtopic tag / description). Offline: cards render
// from the IDB cache after a first online fetch; a designed empty state covers
// the no-cache case.
import { useMemo, useState, useDeferredValue } from 'react';
import { useStore } from '../../store/useStore';
import { Input, Select, FormField, SegmentedControl, EmptyState, Button, Skeleton } from '../../components/ui';
import { BookOpen, Search, RefreshCw, Sparkles } from '../../components/ui/icons';
import { useReferenceCards } from './useReferenceCards';
import Flashcard from './Flashcard';

const KIND_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'constant', label: 'Constants' },
  { value: 'formula', label: 'Formulas' },
  { value: 'concept', label: 'Concepts' },
];

export default function ReferenceCardsTab() {
  const { cards, loading, loadError, reload } = useReferenceCards();
  const dynamicTOS = useStore((s) => s.dynamicTOS);
  const safeTOS = dynamicTOS || {};

  const [kind, setKind] = useState('all');
  const [subject, setSubject] = useState('All');
  const [topic, setTopic] = useState('All');
  const [search, setSearch] = useState('');
  // Deferred so typing stays responsive over a large card set.
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return cards.filter((c) => {
      if (kind !== 'all' && c.kind !== kind) return false;
      if (subject !== 'All' && c.subject !== subject) return false;
      if (topic !== 'All' && c.topic?.name !== topic) return false;
      if (!q) return true;
      return [c.name, c.symbol, c.subtopicTag, c.description, c.topic?.name]
        .some((f) => typeof f === 'string' && f.toLowerCase().includes(q));
    });
  }, [cards, kind, subject, topic, deferredSearch]);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in">
      {/* Top bar: search + filters */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="Search">
            <div className="relative">
              <Search size={15} strokeWidth={1.75} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, symbol, or keyword…"
                className="!pl-9"
                aria-label="Search reference cards"
              />
            </div>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Subject">
              <Select
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setTopic('All'); }}
              >
                <option value="All">All subjects</option>
                {Object.keys(safeTOS).map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="Topic">
              <Select value={topic} onChange={(e) => setTopic(e.target.value)} disabled={subject === 'All'}>
                <option value="All">All topics</option>
                {(safeTOS[subject] || []).map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
          </div>
        </div>
        <SegmentedControl
          label="Card kind"
          size="sm"
          value={kind}
          onChange={setKind}
          options={KIND_OPTIONS}
          className="self-start"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : loadError && cards.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="Couldn't load the reference vault"
          description="Check your connection and try again."
          action={<Button size="sm" variant="secondary" onClick={reload}>Retry</Button>}
        />
      ) : cards.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="The reference vault is being rebuilt"
          description="Flashcards appear here as newly generated content passes review. If you're offline, connect once to sync the vault."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No cards match"
          description="Try a different search term, subject, or topic filter."
          action={<Button size="sm" variant="ghost" onClick={() => { setSearch(''); setKind('all'); setSubject('All'); setTopic('All'); }}>Clear filters</Button>}
        />
      ) : (
        <>
          <p className="text-eyebrow">{filtered.length} card{filtered.length === 1 ? '' : 's'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((card) => <Flashcard key={card.id} card={card} />)}
          </div>
        </>
      )}
    </div>
  );
}
