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
//
// A subject (or a topic) can also be shown as ONE page: "All cards" lays out
// every card in it under topic/subtopic headings (SubjectCardSheet), so a
// learner can review a whole subject's formulas without opening each
// subtopic in turn. Where you are (subject, topic, subtopic, which view) is
// kept for the browser session, so leaving the tab and coming back doesn't
// drop you at the top again.
import { lazy, Suspense, useEffect, useMemo, useState, useDeferredValue } from 'react';
import { formatTimeOfDay } from '../../utils/time';
import { useStore } from '../../store/useStore';
import { Input, FormField, SegmentedControl, EmptyState, Button, Card, Grid, Skeleton, StatusPill } from '../../components/ui';
import { BookOpen, Search, RefreshCw, Sparkles, ChevronRight, LayoutGrid, History, Layers } from '../../components/ui/icons';
import { useReferenceCards } from './useReferenceCards';
import NotedFlashcard from './NotedFlashcard';
import ReferenceStudyMode from './ReferenceStudyMode';
import { dueCardIds, useCardReviews } from './useCardReviews';
import { normalizeSubject } from '@ree/shared';

// The server's topic key (trim + lowercase): a topic named by another screen
// (a learner's stats row) can differ from the card's label in case or spaces.
const topicKey = (s) => String(s ?? '').trim().toLowerCase();

const SubjectCardSheet = lazy(() => import('./SubjectCardSheet'));

const KIND_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'constant', label: 'Constants' },
  { value: 'formula', label: 'Formulas' },
  { value: 'concept', label: 'Concepts' },
];
const UNTAGGED = '__untagged__'; // bucket key for cards with a topic but no subtopicTag

const countLabel = (n) => `${n} card${n === 1 ? '' : 's'}`;

// "12 formulas · 4 constants · 3 concepts" — what a subject/topic tile holds.
const KIND_NOUNS = [['formula', 'formula', 'formulas'], ['constant', 'constant', 'constants'], ['concept', 'concept', 'concepts']];
function kindBreakdown(counts) {
  if (!counts) return '';
  return KIND_NOUNS
    .filter(([k]) => counts[k] > 0)
    .map(([k, one, many]) => `${counts[k]} ${counts[k] === 1 ? one : many}`)
    .join(' · ');
}

// Position in the hierarchy, kept for this browser session (best effort:
// storage can be blocked, and then you simply start at the subjects).
const POSITION_KEY = 'ree.formulaCards.position';
function readPosition() {
  try { return JSON.parse(sessionStorage.getItem(POSITION_KEY)) || {}; } catch { return {}; }
}
function writePosition(pos) {
  try { sessionStorage.setItem(POSITION_KEY, JSON.stringify(pos)); } catch { /* storage unavailable */ }
}

const VIEW_OPTIONS = (groupNoun) => [
  { value: 'browse', label: `By ${groupNoun}`, icon: LayoutGrid },
  { value: 'all', label: 'All cards', icon: Layers },
];

// One clickable browse tile — a Subject, Topic, or Subtopic — showing its name
// and how many cards it holds. Reused at every hierarchy level so the visual
// language stays consistent as you drill down.
function BrowseTile({ label, count, onClick, eyebrow, detail }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count === 0}
      className="text-left bg-surface border border-border2 rounded-[var(--radius-lg)] p-4 flex flex-col gap-2 shadow-sm transition hover:border-[var(--accent)]/50 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border2 disabled:hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0">
          {eyebrow && <p className="text-eyebrow mb-0.5">{eyebrow}</p>}
          <p className="text-fluid-base font-bold text-textMain leading-snug [overflow-wrap:anywhere]">{label}</p>
        </div>
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="text-muted shrink-0 mt-0.5" />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <StatusPill tone="neutral" dot={false}>{countLabel(count)}</StatusPill>
        {detail && <span className="text-xs text-muted2">{detail}</span>}
      </div>
    </button>
  );
}

function SheetFallback() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
      {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40" />)}
    </div>
  );
}

function Breadcrumb({ items, onNavigate }) {
  return (
    <nav aria-label="Formula cards location" className="flex items-center gap-1.5 flex-wrap text-sm">
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5 min-w-0 max-w-full">
            {i > 0 && <ChevronRight size={13} strokeWidth={1.75} aria-hidden="true" className="text-muted shrink-0" />}
            {isLast ? (
              <span className="font-semibold text-textMain min-w-0 [overflow-wrap:anywhere]">{it.label}</span>
            ) : (
              <button type="button" onClick={() => onNavigate(i)} className="inline-flex items-center pointer-coarse:min-h-11 text-left text-muted2 hover:text-textMain transition-colors cursor-pointer min-w-0 [overflow-wrap:anywhere]">
                {it.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// Another screen can deep-link here: `initialSubject` + `initialTopic` open
// at that topic (a missed question's cards, or the prescription for a topic
// eating the learner's clock), and `initialSearch` / `initialKind` start a
// search.
export default function ReferenceBrowser({ initialSearch = '', initialKind = 'all', initialSubject = null, initialTopic = null } = {}) {
  const { cards, loading, loadError, reload } = useReferenceCards();
  const dynamicTOS = useStore((s) => s.dynamicTOS);
  const safeTOS = useMemo(() => dynamicTOS || {}, [dynamicTOS]);

  const [kind, setKind] = useState(initialKind);
  const [search, setSearch] = useState(initialSearch);
  const deferredSearch = useDeferredValue(search);

  // Hierarchy position: null selectedSubject = at the subject grid; etc.
  // Restored from this browser session unless another screen deep-linked a
  // topic or a search here.
  const deepTopic = initialSubject && initialTopic ? { subject: normalizeSubject(initialSubject) || initialSubject, topic: initialTopic } : null;
  const [saved] = useState(() => deepTopic || (initialSearch ? {} : readPosition()));
  const [selectedSubject, setSelectedSubject] = useState(saved.subject ?? null);
  const [selectedTopic, setSelectedTopic] = useState(saved.subject ? saved.topic ?? null : null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(saved.topic ? saved.subtopic ?? null : null); // may be UNTAGGED
  // 'browse' = tiles for the next level down; 'all' = every card in the
  // subject (or topic) on one page.
  const [view, setView] = useState(saved.view === 'all' ? 'all' : 'browse');
  useEffect(() => {
    writePosition({ subject: selectedSubject, topic: selectedTopic, subtopic: selectedSubtopic, view });
  }, [selectedSubject, selectedTopic, selectedSubtopic, view]);
  const [studying, setStudying] = useState(false);
  // Which cards a study session covers. Was hardcoded to `leafCards`, so
  // studying was only ever reachable after drilling all the way to a single
  // subtopic — the whole point of grouping by subject (EE/Math/ESAS) was to
  // let a set that large be studied as one set too, so a session can now
  // start from either the subject-level topic grid or the subtopic leaf.
  const [studyCards, setStudyCards] = useState([]);
  const [studyMode, setStudyMode] = useState('browse');
  const startStudying = (cardsToStudy, mode = 'browse') => {
    setStudyCards(cardsToStudy);
    setStudyMode(mode);
    setStudying(true);
  };

  // Spaced review of the cards you've rated: what's due now, counted against
  // the clock when the list was last looked at (refreshed on leaving study).
  const reviews = useCardReviews();
  const [now, setNow] = useState(() => Date.now());
  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const dueCards = useMemo(
    () => dueCardIds(reviews.items, cardById.keys(), now).map((id) => cardById.get(id)),
    [reviews.items, cardById, now],
  );
  const nextDue = useMemo(() => {
    const later = reviews.items
      .filter((r) => cardById.has(r.cardId) && new Date(r.nextReviewDate).getTime() > now)
      .map((r) => new Date(r.nextReviewDate).getTime());
    return later.length ? Math.min(...later) : null;
  }, [reviews.items, cardById, now]);
  const leaveStudy = () => { setStudying(false); setNow(Date.now()); };

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

  // Per-kind counts for each subject and topic, for the tiles' breakdown line.
  const kindsBy = useMemo(() => {
    const subject = {};
    const topic = {};
    for (const c of kindFiltered) {
      (subject[c.subject] ||= {})[c.kind] = (subject[c.subject]?.[c.kind] || 0) + 1;
      const t = c.topic?.name;
      if (t) {
        const key = `${c.subject}::${t}`;
        (topic[key] ||= {})[c.kind] = (topic[key]?.[c.kind] || 0) + 1;
      }
    }
    return { subject, topic };
  }, [kindFiltered]);
  // The breakdown only says something new when more than one kind is on show.
  const showBreakdown = kind === 'all';

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
    () => (selectedTopic ? cardsInSubject.filter((c) => topicKey(c.topic?.name) === topicKey(selectedTopic)) : []),
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
    setView('browse');
  };

  const handleSelectSubject = (s) => {
    setSelectedSubject(s);
    setSelectedTopic(null);
    setSelectedSubtopic(null);
  };

  const handleSelectTopic = (t) => {
    setSelectedTopic(t);
    setSelectedSubtopic(null);
    setView('browse');
  };

  const breadcrumbItems = [{ label: 'Formula cards' }];
  if (selectedSubject) breadcrumbItems.push({ label: selectedSubject });
  if (selectedTopic) breadcrumbItems.push({ label: selectedTopic });
  if (selectedSubtopic) breadcrumbItems.push({ label: selectedSubtopic === UNTAGGED ? 'General' : selectedSubtopic });

  const navigateBreadcrumb = (index) => {
    setStudying(false);
    if (index === 0) resetHierarchy();
    else if (index === 1) { setSelectedTopic(null); setSelectedSubtopic(null); setView('browse'); }
    else if (index === 2) setSelectedSubtopic(null);
  };

  const clearFilters = () => { setSearch(''); setKind('all'); };

  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  if (loadError && cards.length === 0) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="Couldn't load the formula cards"
        description="Check your connection and try again."
        action={<Button size="sm" variant="secondary" onClick={reload}>Retry</Button>}
      />
    );
  }

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="The formula cards are being rebuilt"
        description="Flashcards appear here as newly generated content passes review. If you're offline, connect once to download them."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in">
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

      {!studying && dueCards.length > 0 && (
        <Card padding="sm" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3" aria-live="polite">
          <div className="flex items-start gap-3 min-w-0">
            <History size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-0.5" style={{ color: 'var(--accent-text)' }} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-textMain">{dueCards.length} formula card{dueCards.length === 1 ? '' : 's'} due for review</p>
              <p className="text-xs text-muted2">Each comes back just before you'd forget it. Flip, then rate how well you knew it.</p>
            </div>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => startStudying(dueCards, 'review')}>Review now</Button>
        </Card>
      )}
      {!studying && dueCards.length === 0 && reviews.items.length > 0 && nextDue && (
        <p className="text-xs text-muted2">
          Card reviews: all caught up. Next one due {new Date(nextDue).toDateString() === new Date(now).toDateString() ? `at ${formatTimeOfDay(nextDue)}` : new Date(nextDue).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.
        </p>
      )}

      {!isSearching && <Breadcrumb items={breadcrumbItems} onNavigate={navigateBreadcrumb} />}

      {studying ? (
        <ReferenceStudyMode cards={studyCards} mode={studyMode} reviews={reviews} onExit={leaveStudy} />
      ) : isSearching ? (
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
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              {searchResults.map((card) => <NotedFlashcard key={card.id} card={card} />)}
            </div>
          </>
        )
      ) : !selectedSubject ? (
        <Grid kind="cards">
          {Object.keys(safeTOS).map((s) => (
            <BrowseTile
              key={s}
              label={s}
              count={subjectCounts[s] || 0}
              detail={showBreakdown ? kindBreakdown(kindsBy.subject[s]) : ''}
              onClick={() => handleSelectSubject(s)}
            />
          ))}
        </Grid>
      ) : !selectedTopic ? (
        (safeTOS[selectedSubject] || []).length === 0 ? (
          <EmptyState icon={BookOpen} title="No topics configured" description="This subject has no syllabus topics yet." />
        ) : (
          <>
            {/* Study the WHOLE subject in one session — previously the only
                entry point into study mode was after drilling to a single
                subtopic, so studying everything under e.g. EE meant either
                repeating a session per subtopic or never doing it at all.
                "All cards" shows the whole subject on one page. */}
            {cardsInSubject.length > 0 && (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <SegmentedControl label={`How to show ${selectedSubject}`} size="sm" value={view} onChange={setView} options={VIEW_OPTIONS('topic')} />
                {view === 'browse' && (
                  <Button size="sm" variant="secondary" onClick={() => startStudying(cardsInSubject)}>
                    <LayoutGrid size={14} strokeWidth={1.75} aria-hidden="true" /> Study all {cardsInSubject.length}
                  </Button>
                )}
              </div>
            )}
            {view === 'all' && cardsInSubject.length > 0 ? (
              <Suspense fallback={<SheetFallback />}>
                <SubjectCardSheet
                  cards={cardsInSubject}
                  scopeLabel={selectedSubject}
                  by="topic"
                  topicOrder={safeTOS[selectedSubject] || []}
                  onStudy={(set) => startStudying(set)}
                />
              </Suspense>
            ) : (
              <Grid kind="cards">
                {(safeTOS[selectedSubject] || []).map((t) => (
                  <BrowseTile
                    key={t}
                    label={t}
                    count={topicCounts[t] || 0}
                    detail={showBreakdown ? kindBreakdown(kindsBy.topic[`${selectedSubject}::${t}`]) : ''}
                    onClick={() => handleSelectTopic(t)}
                  />
                ))}
              </Grid>
            )}
          </>
        )
      ) : !atLeaf ? (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <SegmentedControl label={`How to show ${selectedTopic}`} size="sm" value={view} onChange={setView} options={VIEW_OPTIONS('subtopic')} />
            {view === 'browse' && (
              <Button size="sm" variant="secondary" onClick={() => startStudying(cardsInTopic)}>
                <LayoutGrid size={14} strokeWidth={1.75} aria-hidden="true" /> Study all {cardsInTopic.length}
              </Button>
            )}
          </div>
          {view === 'all' ? (
            <Suspense fallback={<SheetFallback />}>
              <SubjectCardSheet cards={cardsInTopic} scopeLabel={selectedTopic} by="subtopic" onStudy={(set) => startStudying(set)} />
            </Suspense>
          ) : (
            <Grid kind="cards">
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
            </Grid>
          )}
        </>
      ) : leafCards.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No cards here yet"
          description={kind === 'all' ? 'Check back once more content passes review.' : 'None of this kind under this topic. Show every kind, or check back once more content passes review.'}
          action={kind === 'all' ? undefined : <Button size="sm" variant="secondary" onClick={() => setKind('all')}>Show every kind</Button>}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-eyebrow">{countLabel(leafCards.length)}</p>
            <Button size="sm" variant="secondary" onClick={() => startStudying(leafCards)}>
              <LayoutGrid size={14} strokeWidth={1.75} aria-hidden="true" /> Study these {leafCards.length}
            </Button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
            {leafCards.map((card) => <NotedFlashcard key={card.id} card={card} />)}
          </div>
        </>
      )}
    </div>
  );
}
