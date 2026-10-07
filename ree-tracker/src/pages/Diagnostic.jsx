// src/pages/Diagnostic.jsx
//
// The placement test: ~19 adaptive questions across Mathematics, ESAS and EE.
// The server picks each item at the learner's current estimate and grades it;
// nothing is revealed until the end (answers given with feedback would bias the
// rest of the sitting). The result places each subject against the PRC marks
// and, for a new account, seeds the abilities practice starts from.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MainLayout from '../layouts/MainLayout';
import ExamLayout from '../layouts/ExamLayout';
import QuestionCard from '../features/quiz/QuestionCard';
import { Button, Card, Badge, ProgressIndicator, Skeleton, EmptyState } from '../components/ui';
import { Compass, ArrowRight } from '../components/ui/icons';
import { fetchDiagnosticStatus, startDiagnostic, answerDiagnostic, finishDiagnostic } from '../services/dbQueries';
import { GENERAL_AVERAGE, SUBJECT_FLOOR, toDisplaySubject } from '@ree/shared';
import { drillPreset } from '../features/active-recall/presets';

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
  const shownAt = useRef(Date.now());

  useEffect(() => {
    fetchDiagnosticStatus()
      .then((s) => { setStatus(s); setPhase('intro'); })
      .catch(() => setPhase('error'));
  }, []);

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

  if (phase === 'question' && item) {
    return (
      <ExamLayout shortMessage="Placement test" message="Placement test — answers are revealed at the end">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-muted2">
              <span>Question {progress.answered + 1} of about {progress.total}</span>
              <span>{toDisplaySubject(item.subject)}</span>
            </div>
            <ProgressIndicator value={progress.answered} max={progress.total} ariaLabel="Placement test progress" size="sm" />
          </div>
          <Card elevated className="p-6 sm:p-8">
            <QuestionCard
              question={item}
              selectedOption={selected}
              confidence={confidence}
              state="answering"
              showConfidence
              requireConfidence={false}
              hotkeys
              onSelect={setSelected}
              onConfidenceChange={setConfidence}
            />
          </Card>
          <div className="flex justify-between items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/')}>Save and exit</Button>
            <Button size="lg" onClick={submit} disabled={!selected} loading={submitting}>
              Submit answer <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </ExamLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 page-fade-in">
        <div>
          <h1 className="text-display text-2xl sm:text-3xl text-textMain tracking-tight">Placement test</h1>
          <p className="text-sm text-muted2 mt-1">Find where you stand on the PRC scale before you plan your review.</p>
        </div>

        {phase === 'loading' && <Skeleton className="h-48" />}

        {phase === 'error' && (
          <Card elevated>
            <EmptyState
              icon={Compass}
              title="Placement test unavailable"
              description="The service could not be reached. Check your connection and try again."
              action={<Button onClick={() => window.location.reload()}>Try again</Button>}
            />
          </Card>
        )}

        {phase === 'intro' && (
          <Card elevated className="p-6 sm:p-8 flex flex-col gap-5">
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

        {phase === 'result' && result && <PlacementResult result={result} />}
      </div>
    </MainLayout>
  );
}

function PlacementResult({ result }) {
  const gwa = result.projectedGWA;
  const subjects = result.subjects || {};
  return (
    <div className="flex flex-col gap-5">
      <Card elevated glow className="p-6 sm:p-8 flex flex-col gap-2">
        <span className="text-eyebrow">Projected general weighted average</span>
        <span className="text-display text-5xl text-textMain tabular-nums">{Number(gwa || 0).toFixed(1)}%</span>
        <p className="text-sm text-muted2">
          The board needs {GENERAL_AVERAGE}% overall with no subject under {SUBJECT_FLOOR}%.
          {result.seeded ? ' Your practice now starts from these levels.' : ' Your study history already sets your levels; this is a snapshot.'}
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SUBJECTS.filter((s) => subjects[s]).map((s) => {
          const r = subjects[s];
          return (
            <Card key={s} elevated className="p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-textMain font-semibold">{toDisplaySubject(s)}</h2>
                <Badge tone={BAND_TONE[r.band]}>{BAND_LABEL[r.band]}</Badge>
              </div>
              <span className="text-display text-3xl tabular-nums text-textMain">{Math.round(r.expected)}%</span>
              <span className="text-xs text-muted2">{r.correct} of {r.answered} correct · projected board rating</span>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" as={Link} to="/">Go to my dashboard</Button>
        <Button
          variant="secondary"
          as={Link}
          to="/practice"
          state={{ preset: drillPreset() }}
        >
          Start a targeted drill
        </Button>
      </div>
    </div>
  );
}
