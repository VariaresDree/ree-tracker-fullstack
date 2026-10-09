// src/pages/SittingReview.jsx
//
// Exams › Past sittings › Review: one finished sitting, item by item — the
// question, your answer, the correct one, the written solution and AI
// explanation — with filters for what to look at (wrong, blank, marked, slow,
// sure-but-wrong), the pacing against the board, and two ways to go again:
// a timed retake of the missed items, or an untimed Practice set of them.
//
// A sitting could only be reviewed on its results screen, from that tab's
// memory: nothing could reopen a past mock, the full board reviewed only its
// last section, and the placement test showed no answers. This reads the
// server's record (GET /api/analytics/deep/sittings/:id/review), which serves
// a sitting only once it is closed.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toDisplaySubject, VERDICT } from '@ree/shared';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { fetchSittingReview } from '../services/dbQueries';
import { explanationKey } from '../services/aiExplanations';
import { Badge, Button, Card, EmptyState, PageHeader, SegmentedControl, Skeleton, Tabs } from '../components/ui';
import { ChevronLeft, ClipboardList, RotateCcw, Play } from '../components/ui/icons';
import ExamNavigator from '../components/exam/ExamNavigator';
import QuestionCard from '../features/quiz/QuestionCard';
import SolutionPanel from '../features/quiz/SolutionPanel';
import { useAiExplanation } from '../features/quiz/useAiExplanation';
import PacingPanel from '../features/exams/PacingPanel';
import { formatClock as formatSecs, formatDuration } from '../utils/time';
import { REVIEW_FILTERS, filterCounts, filterItems, subjectsIn } from '../features/exams/review/reviewFilters';
import { missedItems, retakeState, reviewItemToQuestion } from '../features/exams/review/retake';
import { itemsPreset, launchPractice } from '../features/active-recall/presets';
import { sittingKindLabel } from '../features/board-simulator/profiles';

const VERDICT_TONE = { [VERDICT.PASSED]: 'success', [VERDICT.CONDITIONAL]: 'amber', [VERDICT.FAILED]: 'danger' };
const CONFIDENCE_LABEL = { HIGH: 'Sure', MED: 'Fairly sure', LOW: 'Unsure' };
const LETTERS = ['A', 'B', 'C', 'D'];
// The bubble for an answer on the answer sheet, by its place in the stored options.
const letterIn = (options, value) => {
  if (value == null || value === '') return null;
  const i = (options || []).indexOf(value);
  return i >= 0 && i < LETTERS.length ? LETTERS[i] : null;
};
const BACK = '/exams?tab=history';

const reviewStateOf = (item) => (item.answered === false ? 'skipped' : item.isCorrect ? 'correct' : 'incorrect');

function errorView(error, retry) {
  if (error?.code === 'IN_PROGRESS') {
    return { title: 'This sitting isn’t finished yet', description: 'Answers open for review once the sitting ends — for a full board, after its last section; for a battle, once everyone is done.', retry: null };
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

  const fetchReview = () => fetchSittingReview(sessionId)
    .then((data) => setState({ status: 'ready', data, error: null }))
    .catch((error) => setState({ status: 'error', data: null, error }));
  const retry = () => { setState({ status: 'loading', data: null, error: null }); fetchReview(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchReview(); }, [sessionId]);

  const items = useMemo(() => state.data?.items || [], [state.data]);
  const subjects = useMemo(() => subjectsIn(items), [items]);
  const counts = useMemo(() => filterCounts(items, subject), [items, subject]);
  const shown = useMemo(() => filterItems(items, { filter, subject }), [items, filter, subject]);
  const missed = useMemo(() => missedItems(items), [items]);
  const current = shown[Math.min(pos, Math.max(0, shown.length - 1))] || null;

  const choose = (next) => { setPos(0); next(); };
  const jumpTo = (order) => {
    setSubject('all');
    setFilter('all');
    setPos(Math.max(0, items.findIndex((i) => i.order === order)));
  };

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto pt-4" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (state.status === 'error') {
    const view = errorView(state.error, retry);
    return (
      <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto pt-4">
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
      </div>
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
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pt-4 pb-[calc(var(--bottom-bar-h,0px)+1.5rem)] page-fade-in">
      <Button as={Link} to={BACK} variant="ghost" size="sm" className="self-start -mb-2 text-muted hover:text-textMain">
        <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> Back to Exams
      </Button>
      <PageHeader
        title={`${kind} review`}
        subtitle={[date, `${items.length} items`, session.timeTakenSecs ? `${formatDuration(session.timeTakenSecs)} used` : null].filter(Boolean).join(' · ')}
        meta={session.verdict ? <Badge tone={VERDICT_TONE[session.verdict] || 'neutral'}>{session.verdict}</Badge> : null}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-eyebrow">Correct</p>
          <p className="text-2xl font-semibold tabular-nums text-textMain mt-1">{correct}<span className="text-muted text-base"> / {items.length}</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-eyebrow">Weighted average</p>
          <p className="text-2xl font-semibold tabular-nums text-textMain mt-1">{typeof session.generalAverage === 'number' ? `${session.generalAverage.toFixed(1)}%` : '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-eyebrow">Missed</p>
          <p className="text-2xl font-semibold tabular-nums mt-1" style={{ color: missed.length ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{missed.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-eyebrow">Left blank</p>
          <p className="text-2xl font-semibold tabular-nums text-textMain mt-1">{blank}</p>
        </Card>
      </div>

      <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
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

            <Card elevated className="p-5 sm:p-8 flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted2">
                <span className="font-medium text-textMain">Item {current.order} of {items.length}</span>
                {current.topic && <span>· {current.topic}</span>}
                {current.timeSpentMs > 0 && <span className="tabular-nums">· {formatSecs(current.timeSpentMs / 1000)}</span>}
                {current.confidence && current.answered !== false && <Badge tone="neutral">{CONFIDENCE_LABEL[current.confidence] || current.confidence}</Badge>}
                {current.marked && <Badge tone="amber">Marked</Badge>}
              </div>

              <QuestionCard
                question={reviewItemToQuestion(current)}
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
                {' '}Choices are listed in their stored order, which can differ from the order you saw.
              </p>

              <SolutionPanel
                key={explanationKey(reviewItemToQuestion(current))}
                question={reviewItemToQuestion(current)}
                isOnline={isOnline}
                aiText={ai.textFor(reviewItemToQuestion(current))}
                aiLoading={ai.isLoading(reviewItemToQuestion(current))}
                onExplain={(force) => ai.explain(reviewItemToQuestion(current), { force })}
                showAnswer
              />

              <div className="flex justify-between gap-3 border-t border-border pt-5">
                <Button variant="secondary" onClick={() => setPos((p) => Math.max(0, p - 1))} disabled={pos <= 0}>Previous</Button>
                <span className="self-center text-xs text-muted2 tabular-nums">{Math.min(pos, shown.length - 1) + 1} of {shown.length}</span>
                <Button onClick={() => setPos((p) => Math.min(shown.length - 1, p + 1))} disabled={pos >= shown.length - 1}>Next</Button>
              </div>
            </Card>
          </>
        )}
      </section>
    </div>
  );
}
