// src/features/vault/BookmarkVaultTab.jsx
//
// Library › Bookmarks: the questions saved while practising, with their
// answers and explanations, and a way to practise them.
//
// A failed load shows an error with Try again, and offline says so; both used
// to read "No bookmarks yet". Removing one offers Undo. Built on the shared
// primitives, with no glyphs standing in for icons.
//
// A subject filter and a search narrow the list; Practise then runs exactly
// what's on screen (from the saved copies, so it works offline too). With no
// filter it draws from all of them on the server, as before.
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { toDisplaySubject } from '@ree/shared';
import { Badge, Button, Card, EmptyState, Input, SegmentedControl, Skeleton } from '../../components/ui';
import { Bookmark, Check, CloudOff, Play, Search, TriangleAlert, X } from '../../components/ui/icons';
import { bookmarksPreset, itemsPreset, launchPractice } from '../active-recall/presets';
import { fetchBookmarks, removeBookmark, saveBookmark } from '../../services/dbQueries';
import SmartText from '../../components/SmartText';
import LatexRenderer from '../../components/LatexRenderer';
import SolutionPanel from '../quiz/SolutionPanel';
import { useAiExplanation } from '../quiz/useAiExplanation';
import { explanationKey } from '../../services/aiExplanations';
import NoteButton, { NoteView } from '../notebook/NoteButton';
import { questionTarget } from '../notebook/targets';

// A bookmarks session draws up to this many of the saved questions.
const PRACTICE_COUNT = 20;

function BookmarkCard({ item, expanded, onToggle, onRemove, isOnline, ai }) {
  const savedOn = item.bookmarkedAt ? new Date(item.bookmarkedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  return (
    <Card as="li" className="p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 items-center text-xs text-muted2">
            <Badge tone="signal">{toDisplaySubject(item.subject) || 'General'}</Badge>
            {item.subtopic && <span className="truncate">{item.subtopic}</span>}
            {savedOn && <span className="tabular-nums">Saved {savedOn}</span>}
          </div>
          {!expanded && (
            <div className="text-sm font-medium text-textMain leading-relaxed line-clamp-2">
              <SmartText text={item.question || item.content} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NoteButton type="question" targetId={item.id} target={questionTarget(item)} />
          <Button variant="secondary" size="sm" className="flex-1 md:flex-none" aria-expanded={expanded} onClick={() => onToggle(item.id)}>
            {expanded ? 'Hide question' : 'Show question'}
          </Button>
          <Button size="icon" variant="ghost" tone="danger" className="text-muted" onClick={() => onRemove(item)} aria-label="Remove bookmark" title="Remove bookmark">
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="pt-4 border-t border-border flex flex-col gap-5">
          <div className="text-sm md:text-base text-textMain leading-relaxed bg-bg p-4 sm:p-5 rounded-[var(--radius-default)] border border-border overflow-x-auto math-scroll-mobile">
            <SmartText text={item.content || item.question} />
          </div>

          {item.options?.length > 0 && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {item.options.map((opt, idx) => {
                const isCorrect = opt === item.answer;
                return (
                  <li
                    key={idx}
                    className="p-3 sm:p-4 rounded-[var(--radius-default)] border flex flex-col gap-2"
                    style={isCorrect
                      ? { borderColor: 'color-mix(in srgb, var(--accent-success) 45%, transparent)', background: 'color-mix(in srgb, var(--accent-success) 8%, transparent)' }
                      : { borderColor: 'var(--border-main)', background: 'var(--bg-surface2)' }}
                  >
                    {isCorrect && (
                      <span className="text-eyebrow inline-flex items-center gap-1" style={{ color: 'var(--accent-success)' }}>
                        <Check size={12} strokeWidth={2.5} aria-hidden="true" /> Correct answer
                      </span>
                    )}
                    <div className="text-sm text-textMain overflow-x-auto math-scroll-mobile no-scrollbar">
                      <LatexRenderer content={opt} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {item.answerWithheld ? (
            // The server leaves the key out while this question is in a
            // battle the learner is still playing (services/answerGate.js).
            <p className="text-sm text-muted" role="note">
              This question is in a battle you're still in. Its answer shows here once the battle ends.
            </p>
          ) : (
            <SolutionPanel
              key={explanationKey(item)}
              question={item}
              isOnline={isOnline}
              aiText={ai.textFor(item)}
              aiLoading={ai.isLoading(item)}
              onExplain={(force) => ai.explain(item, { force })}
              showAnswer
            />
          )}
          <NoteView type="question" targetId={item.id} target={questionTarget(item)} />
        </div>
      )}
    </Card>
  );
}

export default function BookmarkVaultTab({ currentUser, isOnline }) {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  // AI explanations, saved on this device per question (shared with Practice
  // and the mock review). This tab used to show the official solution under a
  // "Deep AI Analysis" label whenever no AI one had been made.
  const ai = useAiExplanation(currentUser?.uid);

  // Bumped by Try again to load again.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!currentUser) return undefined;
    let live = true;
    fetchBookmarks({ limit: 100 })
      .then((data) => { if (live) { setBookmarks(data); setLoadError(false); } })
      .catch(() => { if (live) setLoadError(true); })
      .finally(() => { if (live) setIsLoading(false); });
    return () => { live = false; };
  }, [currentUser, attempt]);
  const loadBookmarks = () => { setIsLoading(true); setAttempt((n) => n + 1); };

  const [subject, setSubject] = useState('all');
  const [query, setQuery] = useState('');
  const subjects = useMemo(() => [...new Set(bookmarks.map((b) => b.subject).filter(Boolean))].sort(), [bookmarks]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookmarks.filter((b) => (subject === 'all' || b.subject === subject)
      && (!q || [b.question, b.content, b.subtopic, b.topic].some((f) => typeof f === 'string' && f.toLowerCase().includes(q))));
  }, [bookmarks, subject, query]);
  const isFiltered = subject !== 'all' || query.trim() !== '';
  const practiseCount = Math.min(PRACTICE_COUNT, isFiltered ? filtered.length : bookmarks.length);
  const practise = () => {
    if (!isFiltered) { launchPractice(navigate, bookmarksPreset(practiseCount)); return; }
    const items = filtered.slice(0, PRACTICE_COUNT).map((b) => ({ ...b, text: b.text || b.question || b.content }));
    launchPractice(navigate, itemsPreset(items));
  };

  const restore = async (item, index) => {
    try {
      await saveBookmark(currentUser.uid, { questionId: item.id });
    } catch (err) {
      if (err?.status !== 409) { toast.error("Couldn't restore the bookmark."); return; }
    }
    setBookmarks((prev) => {
      if (prev.some((b) => b.id === item.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    });
  };

  const handleRemove = async (item) => {
    const index = bookmarks.findIndex((b) => b.id === item.id);
    try {
      await removeBookmark(currentUser.uid, item.id);
      setBookmarks((prev) => prev.filter((b) => b.id !== item.id));
      toast((t) => (
        <span className="flex items-center gap-3">
          Bookmark removed.
          <Button size="sm" variant="secondary" onClick={() => { toast.dismiss(t.id); restore(item, index); }}>Undo</Button>
        </span>
      ), { duration: 6000 });
    } catch {
      toast.error("Couldn't remove the bookmark.");
    }
  };

  let body;
  if (isLoading) {
    body = (
      <div role="status" className="flex flex-col gap-3">
        <span className="sr-only">Loading your bookmarks…</span>
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-[var(--radius-lg)]" />)}
      </div>
    );
  } else if (loadError) {
    body = (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load your bookmarks"
        description="Something went wrong on our side or the connection dropped."
        action={<Button onClick={loadBookmarks}>Try again</Button>}
      />
    );
  } else if (bookmarks.length === 0 && !isOnline) {
    body = (
      <EmptyState
        icon={CloudOff}
        title="Bookmarks need a connection"
        description="Reconnect to see the questions you saved."
        action={<Button variant="secondary" onClick={loadBookmarks}>Try again</Button>}
      />
    );
  } else if (bookmarks.length === 0) {
    body = (
      <EmptyState
        icon={Bookmark}
        title="No bookmarks yet"
        description="Tap the bookmark on a question in Practice or a mock board to save it here."
        action={<Button onClick={() => navigate('/practice')}>Start a practice set</Button>}
      />
    );
  } else {
    body = (
      <>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          {subjects.length > 1 && (
            <SegmentedControl
              label="Subject"
              size="sm"
              className="shrink-0 max-w-full [&_button]:whitespace-nowrap"
              value={subject}
              onChange={setSubject}
              options={[{ value: 'all', label: 'All subjects' }, ...subjects.map((s) => ({ value: s, label: toDisplaySubject(s) || s }))]}
            />
          )}
          <div className="relative w-full sm:w-72">
            <Search size={15} strokeWidth={1.75} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your bookmarks…" className="!pl-9" aria-label="Search bookmarks" />
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            compact
            icon={Search}
            title="No bookmarks match"
            description="Try another subject or search term."
            action={<Button size="sm" variant="ghost" onClick={() => { setSubject('all'); setQuery(''); }}>Clear filters</Button>}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((item) => (
              <BookmarkCard
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                onRemove={handleRemove}
                isOnline={isOnline}
                ai={ai}
              />
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-border pb-5 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-display text-2xl text-textMain tracking-tight">Bookmarks</h2>
          <p className="text-muted2 mt-1 text-sm">
            Questions you saved while practising. Open one to see its answer, or practise them as a session.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted2 tabular-nums">
            {isFiltered ? `${filtered.length} of ${bookmarks.length}` : `${bookmarks.length} saved`}
          </span>
          <Button
            size="sm"
            className="whitespace-nowrap"
            onClick={practise}
            disabled={practiseCount === 0 || (!isFiltered && !isOnline)}
            title={!isFiltered && !isOnline ? 'Needs a connection' : undefined}
          >
            <Play size={14} strokeWidth={2} aria-hidden="true" /> {isFiltered ? `Practise these ${practiseCount}` : 'Practise bookmarks'}
          </Button>
        </div>
      </div>
      {body}
    </div>
  );
}
