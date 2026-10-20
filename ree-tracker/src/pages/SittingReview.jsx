// src/pages/SittingReview.jsx
//
// Exams › Past sittings › Review: one finished sitting, item by item — the
// question, your answer, the correct one, the written solution and AI
// explanation — with filters for what to look at (wrong, blank, marked, slow,
// sure-but-wrong), the pacing against the board, and two ways to go again:
// a timed retake of the missed items, or an untimed Practice set of them.
// A battle's review also has the final places and a Rematch in its header,
// and under each question what every player picked (features/exams/
// BattlePicks), from the players-only replay; if that doesn't load, it is
// reviewed like any other sitting.
//
// A sitting could only be reviewed on its results screen, from that tab's
// memory: nothing could reopen a past mock, the full board reviewed only its
// last section, and the placement test showed no answers. This reads the
// server's record (GET /api/analytics/deep/sittings/:id/review), which serves
// a sitting only once it is closed.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isMarkedFixed, suggestMistakeCause, toDisplaySubject, VERDICT } from '@ree/shared';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { fetchBattleReplay, fetchSittingReview, requestRematch } from '../services/dbQueries';
import { explanationKey } from '../services/aiExplanations';
import { Badge, Button, Card, EmptyState, Grid, KpiTile, Page, PageHeader, QuestionSurface, SegmentedControl, Skeleton, Tabs } from '../components/ui';
import { ChevronLeft, ClipboardList, RotateCcw, Play, Swords } from '../components/ui/icons';
import ExamNavigator from '../components/exam/ExamNavigator';
import QuestionCard from '../features/quiz/QuestionCard';
import SolutionPanel from '../features/quiz/SolutionPanel';
import { useAiExplanation } from '../features/quiz/useAiExplanation';
import PacingPanel from '../features/exams/PacingPanel';
import { formatClock as formatSecs, formatDuration, formatTimeOfDay } from '../utils/time';
import { REVIEW_FILTERS, filterCounts, filterItems, subjectsIn } from '../features/exams/review/reviewFilters';
import { missedItems, retakeState, reviewItemToQuestion } from '../features/exams/review/retake';
import { itemsPreset, launchPractice } from '../features/active-recall/presets';
import { sittingKindLabel } from '../features/board-simulator/profiles';
import NoteButton, { NoteView } from '../features/notebook/NoteButton';
import CauseChips from '../features/notebook/CauseChips';
import { useMistakes } from '../features/notebook/useMistakes';
import { questionTarget } from '../features/notebook/targets';
import TopicCardsLink from '../features/reference/TopicCardsLink';
import BattlePicks from '../features/exams/BattlePicks';
import { ordinal } from '../features/exams/battleModes';


const VERDICT_TONE = { [VERDICT.PASSED]: 'success', [VERDICT.CONDITIONAL]: 'amber', [VERDICT.FAILED]: 'danger' };
const CONFIDENCE_LABEL = { HIGH: 'Sure', MED: 'Fairly sure', LOW: 'Unsure' };
const LETTERS = ['A', 'B', 'C', 'D'];
// The bubble for an answer on the answer sheet, by its place in the options as
// listed: the order the learner saw, or the stored order for an older sitting.
const letterIn = (options, value) => {
  if (value == null || value === '') return null;
  const i = (options || []).indexOf(value);
  return i >= 0 && i < LETTERS.length ? LETTERS[i] : null;
};
const BACK = '/exams?tab=history';

const reviewStateOf = (item) => (item.answered === false ? 'skipped' : item.isCorrect ? 'correct' : 'incorrect');

function errorView(error, retry) {
  // A running battle opens at its deadline whoever is still playing: the
  // server finishes it then, scoring anyone who left on what they answered.
  // It used to say "isn't finished yet" for good once a player had left.
  if (error?.code === 'IN_PROGRESS' && error.opensAt) {
    return {
      title: `This battle’s review opens at ${formatTimeOfDay(error.opensAt)}`,
      description: 'The battle ends then even if someone has left. This page opens it by itself, or try again then.',
      retry,
    };
  }
  if (error?.code === 'IN_PROGRESS') {
    return { title: 'This sitting isn’t finished yet', description: 'Answers open for review once the sitting ends — for a full board, after its last section; for a battle, once everyone is done or the time is up.', retry: null };
  }
  if (error?.code === 'SYNCING') {
    return { title: 'Your answers are still syncing', description: 'They’ll be ready to review as soon as they reach the server.', retry };
  }
  if (error?.status === 404) return { title: 'Sitting not found', description: 'It may belong to another account.', retry: null };
  if (error?.message === '[OFFLINE]') return { title: 'This review needs a connection', description: 'Reconnect to open it. A sitting you’ve reviewed before also opens offline.', retry };
  return { title: 'Couldn’t load this sitting', description: 'Something went wrong on our side.', retry };
}

export default function SittingReview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isOnline = useNetworkStatus();
  const ai = useAiExplanation(currentUser?.uid);

  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [subject, setSubject] = useState('all');
  const [filter, setFilter] = useState('all');
  const [pos, setPos] = useState(0);
  // Each wrong answer can be tagged with why it was missed (it's in your
  // Notebook › Mistakes too). The tags come from the mistakes list; a tag set
  // here shows at once, even for an item that list doesn't hold.
  const { items: mistakes, setTag } = useMistakes({ fetchIfOlderThanMs: 60 * 1000 });
  const [causeOverride, setCauseOverride] = useState({});

  const fetchReview = () => fetchSittingReview(sessionId)
    .then((data) => setState({ status: 'ready', data, error: null }))
    .catch((error) => setState({ status: 'error', data: null, error }));
  const retry = () => { setState({ status: 'loading', data: null, error: null }); fetchReview(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchReview(); }, [sessionId]);

  // A battle that opens at a known time: load it again just after, a few
  // times at most if this device's clock runs ahead of the server's.
  const autoRetries = useRef(0);
  useEffect(() => {
    const opensAt = state.status === 'error' ? state.error?.opensAt : null;
    if (!opensAt || autoRetries.current >= 5) return undefined;
    const wait = Math.max(0, new Date(opensAt).getTime() - Date.now()) + 3000;
    const t = setTimeout(() => { autoRetries.current += 1; retry(); }, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // A battle's sitting id is `${battleId}:${uid}`. Its replay (everyone's
  // places and picks) loads beside the review; until it does, or if it
  // can't, the review shows as for any sitting.
  const battleId = state.data?.session?.kind === 'battle' ? String(state.data.session.id || sessionId).split(':')[0] : null;
  const [replay, setReplay] = useState({ battleId: null, data: null });
  useEffect(() => {
    if (!battleId) return undefined;
    let live = true;
    fetchBattleReplay(battleId)
      .then((data) => { if (live) setReplay({ battleId, data }); })
      .catch(() => { if (live) setReplay({ battleId, data: null }); });
    return () => { live = false; };
  }, [battleId]);
  const battle = battleId && replay.battleId === battleId && Array.isArray(replay.data?.players) ? replay.data : null;
  // One someone already started is joined, not asked for again; one already
  // under way is no longer offered.
  const rematch = battle?.battle?.rematch || null;
  const [rematching, setRematching] = useState(false);
  const startRematch = async () => {
    const needsConnection = 'Rematch needs a connection. Reconnect and try again.';
    if (!isOnline) return toast.error(needsConnection);
    // Joining one already made asks the server as well: it says when that
    // rematch has started without you.
    setRematching(true);
    try {
      const res = await requestRematch(battleId);
      navigate(`/battle/${res.battleId}`);
    } catch (err) {
      toast.error(err?.message === '[OFFLINE]' ? needsConnection : (err?.message || "Couldn't start a rematch."));
      setRematching(false);
    }
  };

  const items = useMemo(() => state.data?.items || [], [state.data]);
  const subjects = useMemo(() => subjectsIn(items), [items]);
  const counts = useMemo(() => filterCounts(items, subject), [items, subject]);
  const shown = useMemo(() => filterItems(items, { filter, subject }), [items, filter, subject]);
  const missed = useMemo(() => missedItems(items), [items]);
  const current = shown[Math.min(pos, Math.max(0, shown.length - 1))] || null;
  // The item as this review lists it (the order the sitting showed).
  const shownQuestion = current ? reviewItemToQuestion(current, { asShown: true }) : null;

  const choose = (next) => { setPos(0); next(); };
  const jumpTo = (order) => {
    setSubject('all');
    setFilter('all');
    setPos(Math.max(0, items.findIndex((i) => i.order === order)));
  };

  if (state.status === 'loading') {
    return (
      <Page width="reading" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </Page>
    );
  }

  if (state.status === 'error') {
    const view = errorView(state.error, retry);
    return (
      <Page width="narrow">
        <EmptyState
          titleAs="h1"
          icon={ClipboardList}
          title={view.title}
          description={view.description}
          action={(
            <>
              {view.retry && <Button onClick={view.retry}>Try again</Button>}
              <Button as={Link} to={BACK} variant="secondary">Back to Exams</Button>
            </>
          )}
        />
      </Page>
    );
  }

  const { session } = state.data;
  const correct = items.filter((i) => i.isCorrect).length;
  const blank = items.filter((i) => i.answered === false).length;
  const kind = sittingKindLabel(session.kind) || 'Sitting';
  const date = session.createdAt ? new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  const filterOptions = REVIEW_FILTERS
    .filter((f) => f.id !== 'marked' || session.hasMarks)
    .map((f) => ({ value: f.id, label: `${f.label} ${counts[f.id]}`, disabled: f.id !== 'all' && counts[f.id] === 0 }));

  return (
    <Page width="reading">
      <Button as={Link} to={BACK} variant="ghost" size="sm" className="self-start -mb-2 text-muted hover:text-textMain">
        <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> Back to Exams
      </Button>
      <PageHeader
        title={`${kind} review`}
        subtitle={[date, `${items.length} items`, session.timeTakenSecs ? `${formatDuration(session.timeTakenSecs)} used` : null].filter(Boolean).join(' · ')}
        meta={session.verdict ? <Badge tone={VERDICT_TONE[session.verdict] || 'neutral'}>{session.verdict}</Badge> : null}
        actions={battle && (!rematch || rematch.status === 'WAITING') ? (
          <Button tone="danger" onClick={startRematch} loading={rematching} disabled={rematching}>
            <Swords size={16} strokeWidth={1.75} aria-hidden="true" /> {rematch ? 'Join rematch' : 'Rematch'}
          </Button>
        ) : null}
      />

      {battle && (
        <ol aria-label="Final places" className="flex flex-wrap gap-2 -mt-2">
          {battle.players.map((p) => (
            <li
              key={p.userId}
              className={`inline-flex items-center gap-2 min-h-8 px-3 rounded-full border text-sm ${
                p.userId === currentUser?.uid
                  ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_30%,transparent)]'
                  : 'bg-surface2 border-border'
              }`}
            >
              <span className="font-semibold tabular-nums text-textMain">{ordinal(p.placement)}</span>
              <span className="text-textMain truncate max-w-[12rem]">
                {p.displayName}{p.userId === currentUser?.uid && <span className="text-muted2"> (you)</span>}
              </span>
              <span className="tabular-nums text-muted2">{p.score}/{p.total}</span>
            </li>
          ))}
        </ol>
      )}

      <Grid kind="kpi" gap="sm">
        <KpiTile compact label="Correct" value={correct} suffix={`/ ${items.length}`} />
        <KpiTile compact label="Weighted average" value={typeof session.generalAverage === 'number' ? `${session.generalAverage.toFixed(1)}%` : '—'} />
        {/* The count keeps its tone: red while anything was missed. */}
        <KpiTile compact label="Missed" value={<span style={{ color: missed.length ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{missed.length}</span>} />
        <KpiTile compact label="Left blank" value={blank} />
      </Grid>

      <Card padding="md" className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-textMain">Go again on what you missed</h2>
          <p className="text-sm text-muted2">
            {missed.length > 0
              ? `${missed.length} item${missed.length === 1 ? '' : 's'}: a timed retake at the board’s pace, or untimed practice with answers as you go.`
              : 'You got every item right. Nothing to retake.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            disabled={missed.length === 0}
            onClick={() => navigate('/simulator', { state: retakeState({ ownerUid: currentUser?.uid, sourceSessionId: session.id, items: missed }) })}
          >
            <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" /> Retake missed (timed)
          </Button>
          <Button
            variant="secondary"
            disabled={missed.length === 0}
            onClick={() => launchPractice(navigate, itemsPreset(missed.map(reviewItemToQuestion)))}
          >
            <Play size={16} strokeWidth={1.75} aria-hidden="true" /> Practise missed
          </Button>
        </div>
      </Card>

      <PacingPanel items={items} onJump={jumpTo} />

      <section aria-labelledby="items-heading" className="flex flex-col gap-4">
        <h2 id="items-heading" className="text-lg font-semibold text-textMain">Items</h2>
        {subjects.length > 1 && (
          <Tabs
            label="Subject"
            active={subject}
            onChange={(id) => choose(() => setSubject(id))}
            tabs={[{ id: 'all', label: 'All subjects' }, ...subjects.map((s) => ({ id: s, label: toDisplaySubject(s) }))]}
          />
        )}
        <SegmentedControl label="Show" options={filterOptions} value={filter} onChange={(v) => choose(() => setFilter(v))} className="flex-wrap" />

        {!current ? (
          <EmptyState compact icon={ClipboardList} title="Nothing to show here" description="No items match this filter." />
        ) : (
          <>
            <ExamNavigator
              count={shown.length}
              currentIndex={Math.min(pos, shown.length - 1)}
              onSelect={setPos}
              isAnswered={(i) => shown[i]?.answered !== false}
              reviewStateOf={(i) => reviewStateOf(shown[i])}
              isMarked={(i) => !!shown[i]?.marked}
              numberOf={(i) => shown[i]?.order}
              sheet={{
                letterOf: (i) => letterIn(shown[i]?.options, shown[i]?.selectedAnswer),
                correctLetterOf: (i) => letterIn(shown[i]?.options, shown[i]?.correctAnswer),
              }}
            />

            <QuestionSurface className="gap-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted2">
                <span className="font-medium text-textMain">Item {current.order} of {items.length}</span>
                {current.topic && <span>· {current.topic}</span>}
                {current.timeSpentMs > 0 && <span className="tabular-nums">· {formatSecs(current.timeSpentMs / 1000)}</span>}
                {current.confidence && current.answered !== false && <Badge tone="neutral">{CONFIDENCE_LABEL[current.confidence] || current.confidence}</Badge>}
                {current.marked && <Badge tone="amber">Marked</Badge>}
                <span className="ml-auto">
                  <NoteButton type="question" targetId={current.questionId} target={questionTarget(shownQuestion)} />
                </span>
              </div>

              <QuestionCard
                question={shownQuestion}
                selectedOption={current.selectedAnswer || null}
                state="reviewing"
                showConfidence={false}
                index={current.order - 1}
                announce={false}
              />

              <p className="text-sm text-muted2" role="note">
                {current.selectedAnswer === null
                  ? 'Your answer wasn’t recorded for this sitting (it was taken before answers were kept).'
                  : current.answered === false
                    ? 'You left this item blank.'
                    : current.isCorrect ? 'You answered this correctly.' : 'Your answer is marked wrong; the correct one is highlighted.'}
                {/* A sitting from before choices were shuffled per sitting
                    (no optionOrder) lists them in their stored order. */}
                {!session.optionOrder && ' Choices are listed in their stored order, which can differ from the order you saw.'}
              </p>

              {battle && (
                <BattlePicks picks={battle.picks?.[current.questionId]} players={battle.players} options={current.options} uid={currentUser?.uid} />
              )}

              <SolutionPanel
                key={explanationKey(shownQuestion)}
                question={shownQuestion}
                isOnline={isOnline}
                aiText={ai.textFor(shownQuestion)}
                aiLoading={ai.isLoading(shownQuestion)}
                onExplain={(force) => ai.explain(shownQuestion, { force })}
                showAnswer
              />

              {!current.isCorrect && (
                <TopicCardsLink topic={current.topic} subject={current.subject} />
              )}

              <NoteView type="question" targetId={current.questionId} target={questionTarget(shownQuestion)} />

              {!current.isCorrect && current.answered !== false && (() => {
                const mistake = mistakes?.find((m) => m.questionId === current.questionId);
                const value = current.questionId in causeOverride ? causeOverride[current.questionId] : mistake?.cause ?? null;
                return (
                  <CauseChips
                    value={value}
                    suggested={mistake?.suggestedCause ?? suggestMistakeCause({ timeSpentMs: current.timeSpentMs, confidenceLevel: current.confidence }, current.subject)}
                    onChange={(cause) => {
                      setCauseOverride((prev) => ({ ...prev, [current.questionId]: cause }));
                      // The fixed mark is left as it stands when this screen
                      // doesn't know it (the list hasn't loaded, or the
                      // question isn't in your newest 300).
                      setTag(current.questionId, mistake ? { cause, resolved: isMarkedFixed(mistake) } : { cause }).catch(() => {
                        setCauseOverride((prev) => ({ ...prev, [current.questionId]: value }));
                        toast.error("Couldn't save that. Try again.");
                      });
                    }}
                  />
                );
              })()}

              <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-5">
                <Button variant="secondary" onClick={() => setPos((p) => Math.max(0, p - 1))} disabled={pos <= 0}>Previous</Button>
                <span className="self-center text-xs text-muted2 tabular-nums">{Math.min(pos, shown.length - 1) + 1} of {shown.length}</span>
                <Button onClick={() => setPos((p) => Math.min(shown.length - 1, p + 1))} disabled={pos >= shown.length - 1}>Next</Button>
              </div>
            </QuestionSurface>
          </>
        )}
      </section>
    </Page>
  );
}
