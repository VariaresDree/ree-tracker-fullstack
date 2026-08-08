// src/features/reference/ReferenceBrowser.jsx
// Hierarchical Subject → Topic → Subtopic → cards navigation for the reference
// flashcard vault, replacing the old flat filter-dropdowns-over-a-grid layout
// (ReferenceCardsTab) that read as "cards floating" with no context. Every
// level shows how many constants/formulas/concepts it holds, so the hierarchy
// is informative on its own — not just a menu to click through blindly.
//
// Search is deliberately NOT part of the hierarchy: typing bypasses browsing
// entirely and searches every card at once (name/symbol/subtopic tag/
// description), because search and browse serve different intents — a user
// who knows what they want shouldn't have to drill down to find it.
//
// Subject/Topic come from the shared taxonomy (dynamicTOS) — the same source
// the Library syllabus manager and heatmap use — not a parallel one. The
// Subtopic level groups on ReferenceCard.subtopicTag, a free-text label.
import { useMemo, useState, useDeferredValue } from 'react';
import { useStore } from '../../store/useStore';
import { Input, FormField, SegmentedControl, EmptyState, Button, Skeleton, StatusPill } from '../../components/ui';
import { BookOpen, Search, RefreshCw, Sparkles, ChevronRight, LayoutGrid } from '../../components/ui/icons';
import { useReferenceCards } from './useReferenceCards';
import Flashcard from './Flashcard';
import ReferenceStudyMode from './ReferenceStudyMode';

const KIND_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'constant', label: 'Constants' },
  { value: 'formula', label: 'Formulas' },
  { value: 'concept', label: 'Concepts' },
];
const UNTAGGED = '__untagged__'; // bucket key for cards with a topic but no subtopicTag

const countLabel = (n) => `${n} card${n === 1 ? '' : 's'}`;

// One clickable browse tile — a Subject, Topic, or Subtopic — showing its name
// and how many cards it holds. Reused at every hierarchy level so the visual
// language stays consistent as you drill down.
function BrowseTile({ label, count, onClick, eyebrow }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count === 0}
      className="text-left bg-surface border border-border2 rounded-[var(--radius-lg)] p-4 flex flex-col gap-2 shadow-sm transition-all hover:border-[var(--accent)]/50 hover:shadow-md focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border2 disabled:hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0">
          {eyebrow && <p className="text-eyebrow mb-0.5">{eyebrow}</p>}
          <p className="text-fluid-base font-bold text-textMain leading-snug [overflow-wrap:anywhere]">{label}</p>
        </div>
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="text-muted shrink-0 mt-0.5" />
      </div>
      <StatusPill tone="neutral" dot={false} className="self-start">{countLabel(count)}</StatusPill>
    </button>
  );
}

function Breadcrumb({ items, onNavigate }) {
  return (
    <nav aria-label="Reference vault location" className="flex items-center gap-1.5 flex-wrap text-sm">
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={13} strokeWidth={1.75} aria-hidden="true" className="text-muted" />}
            {isLast ? (
              <span className="font-semibold text-textMain">{it.label}</span>
            ) : (
              <button type="button" onClick={() => onNavigate(i)} className="text-muted2 hover:text-textMain transition-colors cursor-pointer">
                {it.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default function ReferenceBrowser() {
  const { cards, loading, loadError, reload } = useReferenceCards();
  const dynamicTOS = useStore((s) => s.dynamicTOS);
  const safeTOS = useMemo(() => dynamicTOS || {}, [dynamicTOS]);

  const [kind, setKind] = useState('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  // Hierarchy position: null selectedSubject = at the subject grid; etc.
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null); // may be UNTAGGED
  const [studying, setStudying] = useState(false);

  const kindFiltered = useMemo(
    () => (kind === 'all' ? cards : cards.filter((c) => c.kind === kind)),
    [cards, kind],
  );

  const isSearching = deferredSearch.trim().length > 0;
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = deferredSearch.trim().toLowerCase();
    return kindFiltered.filter((c) =>
      [c.name, c.symbol, c.subtopicTag, c.description, c.topic?.name].some(
        (f) => typeof f === 'string' && f.toLowerCase().includes(q),
      ),
    );
  }, [kindFiltered, deferredSearch, isSearching]);

  // Subject tiles: every taxonomy subject, counted from kind-filtered cards.
  const subjectCounts = useMemo(() => {
    const counts = {};
    for (const s of Object.keys(safeTOS)) counts[s] = 0;
    for (const c of kindFiltered) counts[c.subject] = (counts[c.subject] || 0) + 1;
    return counts;
  }, [kindFiltered, safeTOS]);

  const cardsInSubject = useMemo(
    () => (selectedSubject ? kindFiltered.filter((c) => c.subject === selectedSubject) : []),
    [kindFiltered, selectedSubject],
  );

  const topicCounts = useMemo(() => {
    const counts = {};
    for (const t of safeTOS[selectedSubject] || []) counts[t] = 0;
    for (const c of cardsInSubject) {
      const t = c.topic?.name;
      if (t) counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [cardsInSubject, safeTOS, selectedSubject]);

  const cardsInTopic = useMemo(
    () => (selectedTopic ? cardsInSubject.filter((c) => c.topic?.name === selectedTopic) : []),
    [cardsInSubject, selectedTopic],
  );

  // Subtopic tiles only exist if the topic's cards actually carry a
  // subtopicTag — a topic with none of those skips straight to its card list
  // (see handleSelectTopic) rather than showing a pointless single "General" tile.
  const subtopicCounts = useMemo(() => {
    const counts = {};
    for (const c of cardsInTopic) {
      const key = c.subtopicTag || UNTAGGED;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [cardsInTopic]);
  const hasSubtopics = Object.keys(subtopicCounts).some((k) => k !== UNTAGGED);

  const cardsInSubtopic = useMemo(() => {
    if (!selectedTopic) return [];
    if (!hasSubtopics) return cardsInTopic;
    if (!selectedSubtopic) return [];
    return cardsInTopic.filter((c) => (c.subtopicTag || UNTAGGED) === selectedSubtopic);
  }, [cardsInTopic, hasSubtopics, selectedTopic, selectedSubtopic]);

  const atLeaf = isSearching
    ? true
    : selectedTopic != null && (!hasSubtopics || selectedSubtopic != null);
  const leafCards = isSearching ? searchResults : cardsInSubtopic;

  const resetHierarchy = () => {
    setSelectedSubject(null);
    setSelectedTopic(null);
    setSelectedSubtopic(null);
    setStudying(false);
  };

  const handleSelectSubject = (s) => {
    setSelectedSubject(s);
    setSelectedTopic(null);
    setSelectedSubtopic(null);
  };

  const handleSelectTopic = (t) => {
    setSelectedTopic(t);
    setSelectedSubtopic(null);
  };

  const breadcrumbItems = [{ label: 'Reference vault' }];
  if (selectedSubject) breadcrumbItems.push({ label: selectedSubject });
  if (selectedTopic) breadcrumbItems.push({ label: selectedTopic });
  if (selectedSubtopic) breadcrumbItems.push({ label: selectedSubtopic === UNTAGGED ? 'General' : selectedSubtopic });

  const navigateBreadcrumb = (index) => {
    setStudying(false);
    if (index === 0) resetHierarchy();
    else if (index === 1) { setSelectedTopic(null); setSelectedSubtopic(null); }
    else if (index === 2) setSelectedSubtopic(null);
  };

  const clearFilters = () => { setSearch(''); setKind('all'); };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  if (loadError && cards.length === 0) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="Couldn't load the reference vault"
        description="Check your connection and try again."
        action={<Button size="sm" variant="secondary" onClick={reload}>Retry</Button>}
      />
    );
  }

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="The reference vault is being rebuilt"
        description="Flashcards appear here as newly generated content passes review. If you're offline, connect once to sync the vault."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-in fade-in">
      {/* Top bar: search (bypasses the hierarchy) + kind filter (applies everywhere) */}
      <div className="flex flex-col gap-3">
        <FormField label="Search">
          <div className="relative">
            <Search size={15} strokeWidth={1.75} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search every card by name, symbol, or keyword…"
              className="!pl-9"
              aria-label="Search reference cards"
            />
          </div>
        </FormField>
        <SegmentedControl label="Card kind" size="sm" value={kind} onChange={setKind} options={KIND_OPTIONS} className="self-start" />
      </div>

      {!isSearching && <Breadcrumb items={breadcrumbItems} onNavigate={navigateBreadcrumb} />}

      {isSearching ? (
        searchResults.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No cards match"
            description="Try a different search term or kind filter."
            action={<Button size="sm" variant="ghost" onClick={clearFilters}>Clear search</Button>}
          />
        ) : (
          <>
            <p className="text-eyebrow">{countLabel(searchResults.length)} matching "{deferredSearch.trim()}"</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {searchResults.map((card) => <Flashcard key={card.id} card={card} />)}
            </div>
          </>
        )
      ) : !selectedSubject ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(safeTOS).map((s) => (
            <BrowseTile key={s} label={s} count={subjectCounts[s] || 0} onClick={() => handleSelectSubject(s)} />
          ))}
        </div>
      ) : !selectedTopic ? (
        (safeTOS[selectedSubject] || []).length === 0 ? (
          <EmptyState icon={BookOpen} title="No topics configured" description="This subject has no syllabus topics yet." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(safeTOS[selectedSubject] || []).map((t) => (
              <BrowseTile key={t} label={t} count={topicCounts[t] || 0} onClick={() => handleSelectTopic(t)} />
            ))}
          </div>
        )
      ) : !atLeaf ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(subtopicCounts)
            .filter(([key]) => key !== UNTAGGED)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([tag, count]) => (
              <BrowseTile key={tag} label={tag} count={count} onClick={() => setSelectedSubtopic(tag)} />
            ))}
          {subtopicCounts[UNTAGGED] > 0 && (
            <BrowseTile
              key={UNTAGGED}
              label="General"
              eyebrow="Not tied to a specific subtopic"
              count={subtopicCounts[UNTAGGED]}
              onClick={() => setSelectedSubtopic(UNTAGGED)}
            />
          )}
        </div>
      ) : leafCards.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No cards here yet"
          description="Try a different kind filter, or check back once more content passes review."
        />
      ) : studying ? (
        <ReferenceStudyMode cards={leafCards} onExit={() => setStudying(false)} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-eyebrow">{countLabel(leafCards.length)}</p>
            <Button size="sm" variant="secondary" onClick={() => setStudying(true)}>
              <LayoutGrid size={14} strokeWidth={1.75} aria-hidden="true" /> Study this set
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {leafCards.map((card) => <Flashcard key={card.id} card={card} />)}
          </div>
        </>
      )}
    </div>
  );
}
