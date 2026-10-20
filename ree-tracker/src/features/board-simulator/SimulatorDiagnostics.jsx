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
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { VERDICT, GENERAL_AVERAGE, SUBJECT_FLOOR } from '@ree/shared';
import LatexRenderer from '../../components/LatexRenderer';
import NotificationOptIn from '../../components/NotificationOptIn';
import { Badge, Button, Card, EmptyState, Grid, KpiTile, PageHeader, ProgressIndicator, StatusPill } from '../../components/ui';
import { Shield, TriangleAlert, ClipboardList, Clock, Play } from '../../components/ui/icons';
import PacingPanel from '../exams/PacingPanel';
import { formatDuration, formatTimeOfDay } from '../../utils/time';
import { drillPreset, launchPractice } from '../active-recall/presets';

const VERDICT_TONE = { [VERDICT.PASSED]: 'success', [VERDICT.CONDITIONAL]: 'amber', [VERDICT.FAILED]: 'danger' };
const TONE_COLOR = { success: 'var(--accent-success)', amber: 'var(--color-reeAmber-text)', danger: 'var(--accent-danger)' };
const SUBJECTS = [
  { key: 'Math', label: 'Mathematics' },
  { key: 'ESAS', label: 'ESAS' },
  { key: 'EE', label: 'EE' },
];
const subjectTone = (pct) => (pct < SUBJECT_FLOOR ? 'danger' : pct >= GENERAL_AVERAGE ? 'success' : 'amber');

// A battle's results are due by `resultsBy` at the latest: the server
// finishes it then, scoring anyone who left on the answers it received. Past
// that, "Check for results" asks again. True once that time has come.
function useIsPast(at) {
  // The `at` that has passed (so a new deadline starts out not past).
  const [passed, setPassed] = useState(null);
  useEffect(() => {
    if (!at) return undefined;
    const t = setTimeout(() => setPassed(at), Math.max(0, at - Date.now()));
    return () => clearTimeout(t);
  }, [at]);
  return !!at && passed === at;
}

// `headingLevel`: 1 on its own; 2 under the full-board result, which has the
// h1. The sections (By subject, Pacing, Weak topics, Blind spots) sit one
// level below the title: they were fixed h2s, level with "Last section".
// At level 1 the title is the screen's PageHeader (never an h1 inside a
// card); at level 2 it is the hero card's eyebrow heading.
//
// The screen renders into BoardSimulator's <Page>, which owns the frame: the
// results sit above their item review there (SimulatorActive), on one page.
export default function SimulatorDiagnostics({ session, engine, isBattle = false, onExit, headingLevel = 1, submitPending = false, onCheckResults }) {
  const Heading = `h${headingLevel}`;
  const Section = `h${headingLevel + 1}`;
  const navigate = useNavigate();
  const { diagnostics } = session;
  const resultsBy = diagnostics?.pending ? diagnostics.resultsBy : null;
  const resultsDue = useIsPast(resultsBy);
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
    <>
      {headingLevel === 1 && <PageHeader title={title} />}
      <Card elevated padding="lg" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {headingLevel > 1 && <Heading className="text-eyebrow mb-2">{title}</Heading>}
            {pending ? (
              <div className="flex flex-col gap-2" role="status">
                <p className="text-display text-3xl text-textMain">Waiting for the other players</p>
                <p className="text-sm text-muted2">Your answers are locked in. Scores, the answer key and the review open when everyone has finished or the time runs out.</p>
                {resultsBy && !resultsDue && (
                  <p className="text-sm text-textMain">Results by {formatTimeOfDay(resultsBy)} at the latest, even if someone has left.</p>
                )}
                {resultsDue && onCheckResults && (
                  <Button size="sm" variant="secondary" className="self-start" onClick={onCheckResults}>Check for results</Button>
                )}
                {submitPending && <StatusPill tone="amber">Reconnecting to send your answers…</StatusPill>}
              </div>
            ) : (
              <>
                <p className="text-display text-6xl sm:text-7xl tabular-nums" style={{ color: TONE_COLOR[tone] || 'var(--text-main)' }}>
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

        <Grid kind="kpi" gap="sm">
          <KpiTile compact label="Correct" value={pending ? '—' : `${diagnostics.correctItems} / ${diagnostics.totalItems}`} />
          <KpiTile compact label="Raw score" value={pending || diagnostics.score == null ? '—' : `${diagnostics.score}%`} />
          <KpiTile compact label="Left blank" value={diagnostics.unansweredItems ?? '—'} />
          <KpiTile compact label="Time used" value={formatDuration(diagnostics.timeTakenSecs)} />
        </Grid>

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
          <Card padding="md" className="flex flex-col gap-4">
            <Section className="text-base font-semibold text-textMain">By subject</Section>
            <Grid kind="tiles">
              {SUBJECTS.map(({ key, label }) => {
                const pct = diagnostics.subjectScores?.[key];
                const rated = pct !== null && pct !== undefined;
                return (
                  <div key={key} className="flex flex-col gap-2 min-w-0">
                    <div className="flex flex-wrap justify-between gap-x-2 text-sm">
                      <span className="text-textMain font-medium">{label}</span>
                      <span className="tabular-nums text-textMain">{rated ? `${pct}%` : 'Not asked'}</span>
                    </div>
                    <ProgressIndicator value={rated ? pct : 0} tone={rated ? subjectTone(pct) : 'velocity'} size="sm" ariaLabel={`${label} score`} />
                    {rated && pct < SUBJECT_FLOOR && <span className="text-xs" style={{ color: 'var(--accent-danger)' }}>Under the {SUBJECT_FLOOR}% floor</span>}
                  </div>
                );
              })}
            </Grid>
          </Card>

          {diagnostics.pacingItems?.length > 0 && <PacingPanel items={diagnostics.pacingItems} headingLevel={headingLevel + 1} />}

          <Card padding="md" className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--accent-danger)' }} />
              <div className="min-w-0">
                <Section className="text-base font-semibold text-textMain">Weak topics</Section>
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

          <Card padding="md" className="flex flex-col gap-4" style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, transparent)' }}>
            <div>
              <Section className="text-base font-semibold text-textMain flex items-center gap-2">
                Blind spots <Badge tone="danger">{diagnostics.blindSpots?.length || 0}</Badge>
              </Section>
              <p className="text-sm text-muted2">Answers you were sure of that were wrong. Review these first.</p>
            </div>
            {diagnostics.blindSpots?.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {diagnostics.blindSpots.map((q, i) => (
                  <li key={q.id || i} className="p-4 rounded-[var(--radius-default)] bg-surface2 border border-border flex flex-col gap-3 min-w-0">
                    <div className="text-sm sm:text-base text-textMain [&_p]:!m-0 overflow-x-auto custom-scrollbar [overflow-wrap:anywhere]">
                      <LatexRenderer content={q.text || q.question} />
                    </div>
                    <Grid kind="pair" gap="sm">
                      <div className="p-3 rounded-[var(--radius-default)] border min-w-0" style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 40%, transparent)' }}>
                        <span className="text-eyebrow block mb-1" style={{ color: 'var(--accent-danger)' }}>Your answer</span>
                        <div className="text-sm text-textMain line-through [&_p]:!m-0 overflow-x-auto [overflow-wrap:anywhere]"><LatexRenderer content={q.userAnswer || 'No answer'} /></div>
                      </div>
                      <div className="p-3 rounded-[var(--radius-default)] border min-w-0" style={{ borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)' }}>
                        <span className="text-eyebrow block mb-1" style={{ color: 'var(--accent-success)' }}>Correct answer</span>
                        <div className="text-sm font-semibold text-textMain [&_p]:!m-0 overflow-x-auto [overflow-wrap:anywhere]"><LatexRenderer content={q.answer} /></div>
                      </div>
                    </Grid>
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
    </>
  );
}
