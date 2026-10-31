// src/features/reference/ReferenceBrowser.jsx
// Library › Formula cards: the formulas and constants for Math, ESAS and EE.
// Two levels, Subject → Topic, each tile saying how many formulas and
// constants it holds. A topic shows its cards under subtopic headings (there
// is no third level to drill into any more), and any subject or topic can
// switch to its Quick sheet: every formula and constant as one scannable
// reviewer (QuickSheet). Simplified on 2026-10-31 from three levels, a concept
// kind, an "All cards" sheet with Fronts/Backs, and a note under every card.
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
// Where you are (subject, topic, which view) is kept for the browser session,
// so leaving the tab and coming back doesn't drop you at the top again.
import { Suspense, useEffect, useMemo, useState, useDeferredValue } from 'react';
import { lazy } from '../../utils/lazyWithRetry';
import { Link } from 'react-router-dom';
import { formatTimeOfDay } from '../../utils/time';
import { useStore } from '../../store/useStore';
import { Input, FormField, SegmentedControl, EmptyState, Button, Card, CardWatermark, Grid, IconChip, Skeleton, StatusPill } from '../../components/ui';
import { BookOpen, Search, RefreshCw, Sparkles, ChevronRight, LayoutGrid, History, Layers, Shuffle, Printer } from '../../components/ui/icons';
import { useReferenceCards } from './useReferenceCards';
import Flashcard from './Flashcard';
import { GENERAL, groupCards } from './groupCards';
import ReferenceStudyMode from './ReferenceStudyMode';
import { dueCardIds, useCardReviews } from './useCardReviews';
import { pickRecallTopic, weakCards } from './weakCards';
import { normalizeSubject } from '@ree/shared';

// The server's topic key (trim + lowercase): a topic named by another screen
// (a learner's stats row) can differ from the card's label in case or spaces.
const topicKey = (s) => String(s ?? '').trim().toLowerCase();

const QuickSheet = lazy(() => import('./QuickSheet'));

const KIND_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'formula', label: 'Formulas' },
  { value: 'constant', label: 'Constants' },
];
const KINDS = new Set(KIND_OPTIONS.map((o) => o.value));

const countLabel = (n) => `${n} card${n === 1 ? '' : 's'}`;

// "12 formulas · 4 constants" — what a subject/topic tile holds.
const KIND_NOUNS = [['formula', 'formula', 'formulas'], ['constant', 'constant', 'constants']];
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

// A subject: its topics, or its quick sheet. A topic: its cards, or its quick sheet.
const VIEW_OPTIONS = (browseLabel) => [
  { value: 'browse', label: browseLabel, icon: LayoutGrid },
  { value: 'sheet', label: 'Quick sheet', icon: Layers },
];

// A topic's cards, under its subtopic headings when it has any.
function TopicCards({ cards }) {
  const groups = groupCards(cards, { by: 'subtopic' });
  const grid = (list) => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
      {list.map((card) => <Flashcard key={card.id} card={card} />)}
    </div>
  );
  if (groups.length <= 1 && (groups[0]?.label ?? GENERAL) === GENERAL) return grid(cards);
  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.label} aria-label={g.label} className="flex flex-col gap-3">
          <p className="text-eyebrow">{g.label} · {g.cards.length}</p>
          {grid(g.cards)}
        </section>
      ))}
    </div>
  );
}

// One clickable browse tile — a Subject, Topic, or Subtopic — showing its name
// and how many cards it holds. Reused at every hierarchy level so the visual
// language stays consistent as you drill down.
// A choice card (Card variant="interactive"), as a real button: it lifts and
// takes the accent edge on hover and focus, like the presets and mock formats.
// An empty one is dimmed and takes no pointer, so it doesn't lift either.
function BrowseTile({ label, count, onClick, eyebrow, detail }) {
  return (
    <Card
      as="button"
      type="button"
      variant="interactive"
      padding="sm"
      onClick={onClick}
      disabled={count === 0}
      className="text-left flex flex-col gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
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
    </Card>
  );
}

function SheetFallback() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
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

  const [kind, setKind] = useState(KINDS.has(initialKind) ? initialKind : 'all');
  const [search, setSearch] = useState(initialSearch);
  const deferredSearch = useDeferredValue(search);

  // Hierarchy position: null selectedSubject = at the subject grid; etc.
  // Restored from this browser session unless another screen deep-linked a
  // topic or a search here.
  const deepTopic = initialSubject && initialTopic ? { subject: normalizeSubject(initialSubject) || initialSubject, topic: initialTopic } : null;
  const [saved] = useState(() => deepTopic || (initialSearch ? {} : readPosition()));
  const [selectedSubject, setSelectedSubject] = useState(saved.subject ?? null);
  const [selectedTopic, setSelectedTopic] = useState(saved.subject ? saved.topic ?? null : null);
  // 'browse' = the topics (or a topic's cards); 'sheet' = the quick sheet.
  // ('all' is the old name, kept so a saved position still opens.)
  const [view, setView] = useState(saved.view === 'sheet' || saved.view === 'all' ? 'sheet' : 'browse');
  useEffect(() => {
    writePosition({ subject: selectedSubject, topic: selectedTopic, view });
  }, [selectedSubject, selectedTopic, view]);
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

  // The CELE tips: a wall of only the formulas you still miss (printed), and
  // a topic drawn at random whose formulas you recall cold.
  const weak = useMemo(() => weakCards(cards, reviews.items), [cards, reviews.items]);
  const [recall, setRecall] = useState(null);
  // The draw happens here, in the click, never in a render or a state updater.
  const drawTopic = () => {
    const roll = Math.random();
    setRecall((prev) => pickRecallTopic(cards, reviews.items, roll, prev?.key ?? null));
  };

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

  const leafCards = isSearching ? searchResults : cardsInTopic;

  const resetHierarchy = () => {
    setSelectedSubject(null);
    setSelectedTopic(null);
    setStudying(false);
    setView('browse');
  };

  const handleSelectSubject = (s) => {
    setSelectedSubject(s);
    setSelectedTopic(null);
    setView('browse');
  };

  const handleSelectTopic = (t) => {
    setSelectedTopic(t);
    setView('browse');
  };

  const breadcrumbItems = [{ label: 'Formula cards' }];
  if (selectedSubject) breadcrumbItems.push({ label: selectedSubject });
  if (selectedTopic) breadcrumbItems.push({ label: selectedTopic });

  const navigateBreadcrumb = (index) => {
    setStudying(false);
    if (index === 0) resetHierarchy();
    else if (index === 1) { setSelectedTopic(null); setView('browse'); }
  };

  const clearFilters = () => { setSearch(''); setKind('all'); };

  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
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
        // The tab's hero while cards are due: the one thing to do here first.
        <Card variant="hero" padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" aria-live="polite">
          <CardWatermark icon={History} />
          <div className="flex items-start gap-3 min-w-0">
            <IconChip icon={History} />
            <div className="min-w-0 flex flex-col gap-0.5">
              <p className="text-lg font-semibold text-textMain">{dueCards.length} formula card{dueCards.length === 1 ? '' : 's'} due for review</p>
              <p className="text-sm text-muted2">Each comes back just before you'd forget it. Flip, then rate how well you knew it.</p>
            </div>
          </div>
          <Button className="shrink-0 w-full sm:w-auto" onClick={() => startStudying(dueCards, 'review')}>Review now</Button>
        </Card>
      )}
      {!studying && cards.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={drawTopic}>
            <Shuffle size={14} strokeWidth={1.75} aria-hidden="true" /> Random topic
          </Button>
          {weak.length > 0 ? (
            <Button size="sm" variant="secondary" as={Link} to="/print/formulas">
              <Printer size={14} strokeWidth={1.75} aria-hidden="true" /> Print weak formulas ({weak.length})
            </Button>
          ) : (
            <p className="text-xs text-muted2 self-center">Rate cards in a review to print the ones you still miss.</p>
          )}
        </div>
      )}
      {!studying && recall && (
        <Card variant="inset" padding="md" className="flex flex-col gap-3" aria-live="polite">
          <p className="text-eyebrow">Random topic · {recall.subject}</p>
          <p className="text-lg font-semibold text-textMain">Recall every formula for: {recall.topic}</p>
          <p className="text-sm text-muted2">Say or write each one before you look: {recall.cards.length} card{recall.cards.length === 1 ? '' : 's'} in this topic.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { const r = recall; setRecall(null); startStudying(r.cards, 'browse'); }}>Check with the cards</Button>
            <Button size="sm" variant="secondary" onClick={drawTopic}>Another topic</Button>
            <Button size="sm" variant="ghost" onClick={() => setRecall(null)}>Done</Button>
          </div>
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
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
              {searchResults.map((card) => <Flashcard key={card.id} card={card} />)}
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
            {cardsInSubject.length > 0 && (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <SegmentedControl label={`How to show ${selectedSubject}`} size="sm" value={view} onChange={setView} options={VIEW_OPTIONS('Topics')} />
                <Button size="sm" variant="secondary" onClick={() => startStudying(cardsInSubject)}>
                  <LayoutGrid size={14} strokeWidth={1.75} aria-hidden="true" /> Study all {cardsInSubject.length}
                </Button>
              </div>
            )}
            {view === 'sheet' && cardsInSubject.length > 0 ? (
              <Suspense fallback={<SheetFallback />}>
                <QuickSheet
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
      ) : leafCards.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No cards here yet"
          description={kind === 'all' ? 'Check back once more content passes review.' : 'None of this kind under this topic. Show both, or check back once more content passes review.'}
          action={kind === 'all' ? undefined : <Button size="sm" variant="secondary" onClick={() => setKind('all')}>Show formulas and constants</Button>}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <SegmentedControl label={`How to show ${selectedTopic}`} size="sm" value={view} onChange={setView} options={VIEW_OPTIONS('Cards')} />
            <Button size="sm" variant="secondary" onClick={() => startStudying(leafCards)}>
              <LayoutGrid size={14} strokeWidth={1.75} aria-hidden="true" /> Study these {leafCards.length}
            </Button>
          </div>
          {view === 'sheet' ? (
            <Suspense fallback={<SheetFallback />}>
              <QuickSheet cards={leafCards} scopeLabel={selectedTopic} by="subtopic" onStudy={(set) => startStudying(set)} />
            </Suspense>
          ) : (
            <TopicCards cards={leafCards} />
          )}
        </>
      )}
    </div>
  );
}
