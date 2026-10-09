// src/features/board-simulator/SimulatorDiagnostics.jsx
//
// The results of a mock board or battle, above the per-item review.
//
// The headline is the PRC general WEIGHTED average — the number the verdict is
// judged on and the one Past sittings shows. It used to lead with the raw share
// correct, so a sitting could read "71%" here and "69.3" in history. The raw
// score sits beside it. Weak topics open a drill on the topic, pacing is
// against the board's pace per subject, and "Review every item" opens the
// sitting from the server (Exams › Past sittings), all three sections of a
// full board included.
import { useNavigate, Link } from 'react-router-dom';
import { VERDICT, GENERAL_AVERAGE, SUBJECT_FLOOR } from '@ree/shared';
import LatexRenderer from '../../components/LatexRenderer';
import NotificationOptIn from '../../components/NotificationOptIn';
import { Badge, Button, Card, EmptyState, ProgressIndicator, StatusPill } from '../../components/ui';
import { Shield, TriangleAlert, ClipboardList, Clock, Play } from '../../components/ui/icons';
import PacingPanel from '../exams/PacingPanel';
import { formatDuration } from '../../utils/time';
import { drillPreset, launchPractice } from '../active-recall/presets';

const VERDICT_TONE = { [VERDICT.PASSED]: 'success', [VERDICT.CONDITIONAL]: 'amber', [VERDICT.FAILED]: 'danger' };
const TONE_COLOR = { success: 'var(--accent-success)', amber: 'var(--color-reeAmber-text)', danger: 'var(--accent-danger)' };
const SUBJECTS = [
  { key: 'Math', label: 'Mathematics' },
  { key: 'ESAS', label: 'ESAS' },
  { key: 'EE', label: 'EE' },
];
const subjectTone = (pct) => (pct < SUBJECT_FLOOR ? 'danger' : pct >= GENERAL_AVERAGE ? 'success' : 'amber');

// `headingLevel`: 1 on its own; 2 under the full-board result, which has the h1.
export default function SimulatorDiagnostics({ session, engine, isBattle = false, onExit, headingLevel = 1, submitPending = false }) {
  const Heading = `h${headingLevel}`;
  const navigate = useNavigate();
  const { diagnostics } = session;
  if (!diagnostics) return null;

  const pending = !!diagnostics.pending;
  const hasGwa = typeof diagnostics.generalAverage === 'number';
  const tone = VERDICT_TONE[diagnostics.verdict] || 'neutral';
  const title = headingLevel === 1 ? (isBattle ? 'Battle results' : 'Mock board results') : 'Last section';

  const leave = () => {
    onExit?.();
    engine?.resetToSetup?.();
    navigate('/exams?tab=history');
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full page-fade-in">
      <Card elevated className="p-6 sm:p-8 flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Heading className="text-eyebrow">{title}</Heading>
            {pending ? (
              <div className="mt-2 flex flex-col gap-2" role="status">
                <p className="text-display text-3xl text-textMain">Waiting for the other players</p>
                <p className="text-sm text-muted2">Your answers are locked in. Scores, the answer key and the review open when everyone has finished or the time runs out.</p>
                {submitPending && <StatusPill tone="amber">Reconnecting to send your answers…</StatusPill>}
              </div>
            ) : (
              <>
                <p className="text-display text-6xl sm:text-7xl tabular-nums mt-2" style={{ color: TONE_COLOR[tone] || 'var(--text-main)' }}>
                  {hasGwa ? diagnostics.generalAverage.toFixed(1) : diagnostics.score}%
                </p>
                <p className="text-sm text-muted2 mt-1">
                  {hasGwa ? 'General weighted average' : 'Score'} · pass needs {GENERAL_AVERAGE}% with no subject under {SUBJECT_FLOOR}%
                </p>
              </>
            )}
          </div>
          {!pending && diagnostics.verdict && <Badge tone={tone}>{diagnostics.verdict}</Badge>}
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-[var(--radius-default)] bg-surface2 border border-border p-3">
            <dt className="text-eyebrow">Correct</dt>
            <dd className="text-xl font-semibold tabular-nums text-textMain mt-1">{pending ? '—' : `${diagnostics.correctItems} / ${diagnostics.totalItems}`}</dd>
          </div>
          <div className="rounded-[var(--radius-default)] bg-surface2 border border-border p-3">
            <dt className="text-eyebrow">Raw score</dt>
            <dd className="text-xl font-semibold tabular-nums text-textMain mt-1">{pending || diagnostics.score == null ? '—' : `${diagnostics.score}%`}</dd>
          </div>
          <div className="rounded-[var(--radius-default)] bg-surface2 border border-border p-3">
            <dt className="text-eyebrow">Left blank</dt>
            <dd className="text-xl font-semibold tabular-nums text-textMain mt-1">{diagnostics.unansweredItems ?? '—'}</dd>
          </div>
          <div className="rounded-[var(--radius-default)] bg-surface2 border border-border p-3">
            <dt className="text-eyebrow">Time used</dt>
            <dd className="text-xl font-semibold tabular-nums text-textMain mt-1">{formatDuration(diagnostics.timeTakenSecs)}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          {diagnostics.sessionId && !pending && (
            <Button as={Link} to={`/exams/sittings/${encodeURIComponent(diagnostics.sessionId)}`}>
              <ClipboardList size={16} strokeWidth={1.75} aria-hidden="true" /> Review every item
            </Button>
          )}
          <Button variant="secondary" onClick={leave}>Back to Exams</Button>
        </div>
        {isBattle && !pending && (
          <p className="text-xs text-muted2 flex items-center gap-2">
            <Clock size={14} strokeWidth={1.75} aria-hidden="true" /> Your progress can take a minute to catch up after a battle.
          </p>
        )}
      </Card>

      {!pending && (
        <>
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-textMain mb-4">By subject</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {SUBJECTS.map(({ key, label }) => {
                const pct = diagnostics.subjectScores?.[key];
                const rated = pct !== null && pct !== undefined;
                return (
                  <div key={key} className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-textMain font-medium">{label}</span>
                      <span className="tabular-nums text-textMain">{rated ? `${pct}%` : 'Not asked'}</span>
                    </div>
                    <ProgressIndicator value={rated ? pct : 0} tone={rated ? subjectTone(pct) : 'velocity'} size="sm" ariaLabel={`${label} score`} />
                    {rated && pct < SUBJECT_FLOOR && <span className="text-xs" style={{ color: 'var(--accent-danger)' }}>Under the {SUBJECT_FLOOR}% floor</span>}
                  </div>
                );
              })}
            </div>
          </Card>

          {diagnostics.pacingItems?.length > 0 && <PacingPanel items={diagnostics.pacingItems} />}

          <Card className="p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--accent-danger)' }} />
              <div>
                <h2 className="text-base font-semibold text-textMain">Weak topics</h2>
                <p className="text-sm text-muted2">Topics under 60% in this sitting. Drill one to work on it.</p>
              </div>
            </div>
            {(diagnostics.weakTopicDetails || diagnostics.weakTopics?.map((topic) => ({ topic })) || []).length > 0 ? (
              <ul className="flex flex-col gap-2">
                {(diagnostics.weakTopicDetails || diagnostics.weakTopics.map((topic) => ({ topic }))).map(({ topic, subject }) => (
                  <li key={topic} className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-default)] bg-surface2 border border-border">
                    <span className="text-sm text-textMain min-w-0 truncate">{topic}</span>
                    <Button size="sm" variant="ghost" onClick={() => launchPractice(navigate, drillPreset({ topic, subject }))}>
                      <Play size={14} strokeWidth={1.75} aria-hidden="true" /> Drill
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={Shield} title="No weak topics" description="Every topic in this sitting scored 60% or better." />
            )}
          </Card>

          <Card className="p-5 sm:p-6 flex flex-col gap-4" style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, transparent)' }}>
            <div>
              <h2 className="text-base font-semibold text-textMain flex items-center gap-2">
                Blind spots <Badge tone="danger">{diagnostics.blindSpots?.length || 0}</Badge>
              </h2>
              <p className="text-sm text-muted2">Answers you were sure of that were wrong. Review these first.</p>
            </div>
            {diagnostics.blindSpots?.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {diagnostics.blindSpots.map((q, i) => (
                  <li key={q.id || i} className="p-4 sm:p-5 rounded-[var(--radius-lg)] bg-surface2 border border-border flex flex-col gap-4">
                    <div className="text-sm sm:text-base text-textMain [&_p]:!m-0 overflow-x-auto custom-scrollbar">
                      <LatexRenderer content={q.text || q.question} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-[var(--radius-default)] border" style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 40%, transparent)' }}>
                        <span className="text-eyebrow block mb-1" style={{ color: 'var(--accent-danger)' }}>Your answer</span>
                        <div className="text-sm text-textMain line-through [&_p]:!m-0 overflow-x-auto"><LatexRenderer content={q.userAnswer || 'No answer'} /></div>
                      </div>
                      <div className="p-3 rounded-[var(--radius-default)] border" style={{ borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)' }}>
                        <span className="text-eyebrow block mb-1" style={{ color: 'var(--accent-success)' }}>Correct answer</span>
                        <div className="text-sm font-semibold text-textMain [&_p]:!m-0 overflow-x-auto"><LatexRenderer content={q.answer} /></div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={Shield} title="No blind spots" description="Your confidence matched your results on every question." />
            )}
          </Card>

          {/* The one-time reminder offer after a first session, in the page
              rather than floating over the buttons above. */}
          <div className="max-w-md w-full mx-auto">
            <NotificationOptIn inline />
          </div>
        </>
      )}
    </div>
  );
}
