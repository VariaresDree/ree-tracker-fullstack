// src/pages/Diagnostic.jsx
//
// The placement test: ~19 adaptive questions across Mathematics, ESAS and EE.
// The server picks each item at the learner's current estimate and grades it;
// nothing is revealed until the end (answers given with feedback would bias the
// rest of the sitting). The result places each subject against the PRC marks
// and, for a new account, seeds the abilities practice starts from.
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import ModeGuide from '../features/exams/ModeGuide';
import { startingPlan } from '../features/exams/startingPlan';
import ExamPlanForm from '../features/account/ExamPlanForm';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MainLayout from '../layouts/MainLayout';
import ExamLayout from '../layouts/ExamLayout';
import PomodoroOwner from '../components/PomodoroOwner';
import KeyLegend from '../components/exam/KeyLegend';
import SessionActions from '../components/exam/SessionActions';
import SessionBar from '../components/exam/SessionBar';
import { KEYS } from '../features/quiz/examCopy';
import { ITEM_FOCUS_CLASS, useItemFocus } from '../hooks/useItemFocus';
import { shouldIgnoreHotkey } from '../utils/hotkeys';
import QuestionCard from '../features/quiz/QuestionCard';
import { presentOptions } from '../features/quiz/presentOptions';
import { Badge, Button, Card, CardTitle, EmptyState, Grid, Page, PageHeader, ProgressIndicator, QuestionSurface, Skeleton } from '../components/ui';
import { Compass, ArrowRight } from '../components/ui/icons';
import { fetchDiagnosticStatus, startDiagnostic, answerDiagnostic, finishDiagnostic } from '../services/dbQueries';
import { GENERAL_AVERAGE, SUBJECT_FLOOR, toDisplaySubject } from '@ree/shared';
import { adaptivePreset, drillPreset } from '../features/active-recall/presets';

const BAND_LABEL = { 'board-ready': 'Board-ready', developing: 'Developing', foundation: 'Foundation' };
const BAND_TONE = { 'board-ready': 'success', developing: 'amber', foundation: 'danger' };
const SUBJECTS = ['Mathematics', 'ESAS', 'EE'];

export default function Diagnostic() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading'); // loading | intro | question | result | error
  const [status, setStatus] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [item, setItem] = useState(null);
  const [progress, setProgress] = useState({ answered: 0, total: 19 });
  const [selected, setSelected] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  // Set when each item is shown (showItem), for its time on screen.
  const shownAt = useRef(0);

  // Try again asks again; it used to reload the whole app.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetchDiagnosticStatus()
      .then((s) => { if (!cancelled) { setStatus(s); setPhase('intro'); } })
      .catch(() => { if (!cancelled) setPhase('error'); });
    return () => { cancelled = true; };
  }, [attempt]);
  const retry = () => { setPhase('loading'); setAttempt((n) => n + 1); };

  const showItem = (next, prog) => {
    setItem(next);
    if (prog) setProgress(prog);
    setSelected(null);
    setConfidence(null);
    shownAt.current = Date.now();
  };

  const begin = async (restart = false) => {
    setSubmitting(true);
    try {
      const res = await startDiagnostic(restart);
      setSessionId(res.sessionId);
      if (res.done) { setResult(res.result); setPhase('result'); return; }
      showItem(res.item, res.progress);
      setPhase('question');
    } catch (err) {
      toast.error(err?.message?.includes('[OFFLINE]') ? 'The placement test needs a connection.' : 'Could not start the placement test. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const res = await answerDiagnostic({
        sessionId,
        questionId: item.id,
        userAnswer: selected,
        confidenceLevel: confidence || 'MED',
        timeSpentMs: Date.now() - shownAt.current,
      });
      if (res.done) { setResult(res.result); setPhase('result'); return; }
      showItem(res.item, res.progress);
    } catch (err) {
      if (err?.status === 503 && sessionId) {
        // The answer is saved; finishing is idempotent — retry it once.
        try {
          const fin = await finishDiagnostic(sessionId);
          if (fin.done) { setResult(fin.result); setPhase('result'); return; }
        } catch { /* fall through to the toast */ }
      }
      toast.error('That answer did not go through. Check your connection and submit again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Enter submits the choice, for someone on the keyboard. On a focused button it
  // stays that button's.
  const onEnter = useEffectEvent((e) => {
    if (e.key !== 'Enter' || shouldIgnoreHotkey(e) || e.target?.closest?.('button, a')) return;
    submit();
  });
  useEffect(() => {
    if (phase !== 'question') return undefined;
    const onKey = (e) => onEnter(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);
  const itemRef = useItemFocus(item?.id);

  if (phase === 'question' && item) {
    return (
      <ExamLayout shortMessage="Placement test" message="Placement test — answers are revealed at the end">
        <PomodoroOwner />
        <h1 className="sr-only">Placement test</h1>
        <Page width="reading">
          <SessionBar
            index={progress.answered}
            total={progress.total}
            about
            action={<Button variant="ghost" size="sm" className="shrink-0" onClick={() => navigate('/')}>Save and exit</Button>}
          >
            <span className="text-xs text-muted2 truncate">{toDisplaySubject(item.subject)}</span>
            <KeyLegend keys={KEYS.placement} />
          </SessionBar>
          <ProgressIndicator value={progress.answered} max={progress.total} ariaLabel="Placement test progress" size="sm" />
          <div ref={itemRef} tabIndex={-1} className={ITEM_FOCUS_CLASS}>
          <QuestionSurface>
            <QuestionCard
              // The choices in this sitting's order (keyed by its session id),
              // so the key isn't wherever it was stored.
              question={presentOptions(item, sessionId)}
              selectedOption={selected}
              confidence={confidence}
              state="answering"
              showConfidence
              requireConfidence={false}
              hotkeys
              onSelect={setSelected}
              onConfidenceChange={setConfidence}
            />
          </QuestionSurface>
          </div>
          <SessionActions className="justify-end">
            <Button className="max-sm:w-full" onClick={submit} disabled={!selected} loading={submitting}>
              Submit answer <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
          </SessionActions>
        </Page>
      </ExamLayout>
    );
  }

  return (
    <MainLayout>
      <Page width="narrow">
        <PageHeader title="Placement test" subtitle="Find where you stand on the PRC scale before you plan your review." />

        {phase === 'loading' && (
          <div role="status">
            <span className="sr-only">Loading the placement test…</span>
            <Skeleton className="h-48" />
          </div>
        )}

        {phase === 'error' && (
          <Card elevated>
            <EmptyState
              icon={Compass}
              title="Placement test unavailable"
              description="The service could not be reached. Check your connection and try again."
              action={<Button onClick={retry}>Try again</Button>}
            />
          </Card>
        )}

        {phase === 'intro' && (
          <Card elevated padding="lg" className="flex flex-col gap-4">
            <ul className="text-sm text-textMain flex flex-col gap-2 list-disc pl-5">
              <li>About 19 questions across Mathematics, ESAS and EE, chosen to match your level as you go.</li>
              <li>No feedback until the end — answer as you would on the board, and say how sure you are.</li>
              <li>Around 20 minutes. Stop any time; your progress keeps for 7 days.</li>
            </ul>
            {status?.status === 'completed' && (
              <p className="text-xs text-muted2">
                You have already placed. Retaking measures you again{status.result?.seeded === false ? '' : ' and re-seeds your starting levels if you are still new'}.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {status?.status === 'in_progress' ? (
                <>
                  <Button size="lg" loading={submitting} onClick={() => begin(false)}>
                    Resume ({status.progress?.answered || 0} of {status.progress?.total || 19} done)
                  </Button>
                  <Button variant="ghost" disabled={submitting} onClick={() => begin(true)}>Start over</Button>
                </>
              ) : (
                <Button size="lg" loading={submitting} onClick={() => begin(status?.status === 'completed')}>
                  {status?.status === 'completed' ? 'Retake placement test' : 'Start placement test'}
                </Button>
              )}
              {status?.status === 'completed' && status.result && (
                <Button variant="secondary" onClick={() => { setResult(status.result); setPhase('result'); }}>See my last result</Button>
              )}
              <Button variant="ghost" as={Link} to="/">Not now</Button>
            </div>
          </Card>
        )}

        {phase === 'result' && result && <PlacementResult result={result} sessionId={sessionId} />}
      </Page>
    </MainLayout>
  );
}

// The result's main button: the start the plan names (startingPlan).
function startButton(plan) {
  if (plan.mode === 'mock') return { label: 'Take a mock board', to: '/exams?tab=mock' };
  if (plan.mode === 'gauntlet') return { label: 'Open the Gauntlet', to: '/exams?tab=gauntlet' };
  const name = plan.subject ? toDisplaySubject(plan.subject) : null;
  return {
    label: name ? `Practise ${name} now` : 'Start an adaptive set',
    to: '/practice',
    state: { preset: adaptivePreset({ subject: plan.subject || 'All', count: 20 }) },
  };
}

function PlacementResult({ result, sessionId }) {
  const gwa = result.projectedGWA;
  const subjects = result.subjects || {};
  const plan = startingPlan(result);
  const start = startButton(plan);
  // A fragment: the result's sections sit straight in the page, at its gap.
  return (
    <>
      <Card variant="hero" className="flex flex-col gap-2">
        <span className="text-eyebrow">Projected general weighted average</span>
        <span className="text-display text-5xl text-textMain tabular-nums">{Number(gwa || 0).toFixed(1)}%</span>
        <p className="text-sm text-muted2">
          The board needs {GENERAL_AVERAGE}% overall with no subject under {SUBJECT_FLOOR}%.
          {result.seeded ? ' Your practice now starts from these levels.' : ' Your study history already sets your levels; this is a snapshot.'}
        </p>
      </Card>

      <Grid kind="tiles">
        {SUBJECTS.filter((s) => subjects[s]).map((s) => {
          const r = subjects[s];
          return (
            <Card key={s} elevated padding="md" className="flex flex-col gap-2 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="min-w-0">{toDisplaySubject(s)}</CardTitle>
                <Badge tone={BAND_TONE[r.band]}>{BAND_LABEL[r.band]}</Badge>
              </div>
              <span className="text-display text-3xl tabular-nums text-textMain">{Math.round(r.expected)}%</span>
              <span className="text-xs text-muted2">{r.correct} of {r.answered} correct · projected board rating</span>
            </Card>
          );
        })}
      </Grid>

      <ModeGuide start={plan.mode} note={plan.note} />

      {/* The exam date and daily target, asked here once instead of a silent
          default, with the study plan the placement prompt promised. */}
      <Card elevated padding="md" className="flex flex-col gap-3">
        <CardTitle>Your exam plan</CardTitle>
        <p className="text-sm text-muted2">Your exam date sets the countdown and the study plan. You can change both in Account any time.</p>
        <ExamPlanForm offerPlan />
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" as={Link} to={start.to} state={start.state}>{start.label}</Button>
        <Button variant="secondary" as={Link} to="/">Go to Today</Button>
        {/* The answers, as the intro promised: each question with yours and
            the key (Exams › Past sittings › Review reads the same record). */}
        {sessionId && (
          <Button variant="secondary" as={Link} to={`/exams/sittings/${encodeURIComponent(sessionId)}`}>
            Review your answers
          </Button>
        )}
        <Button
          variant="secondary"
          as={Link}
          to="/practice"
          state={{ preset: drillPreset() }}
        >
          Start a targeted drill
        </Button>
      </div>
    </>
  );
}
