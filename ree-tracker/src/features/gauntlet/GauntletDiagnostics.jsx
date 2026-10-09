// src/features/gauntlet/GauntletDiagnostics.jsx
//
// The result of a Gauntlet run. It leads with what the run did to the ladder
// (advanced, cleared, not passed and locked until when, or not counted), then
// the PRC weighted average it was judged on, the subjects, the topics the
// misses came from (each a drill), and the missed items with their solutions
// and "Explain with AI". "Review every item" opens the run from the server.
//
// It used to show the raw share correct as the verdict (70% with no subject
// floor), a fixed "unlocks in 12 hours" whatever the lock was, and the missed
// items with no way to ask why.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CANONICAL_SUBJECTS, GENERAL_AVERAGE, SUBJECT_FLOOR, VERDICT, toDisplaySubject } from '@ree/shared';
import LatexRenderer from '../../components/LatexRenderer';
import NotificationOptIn from '../../components/NotificationOptIn';
import { Badge, Button, Card, ProgressIndicator } from '../../components/ui';
import { ClipboardList, Play } from '../../components/ui/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { explanationKey } from '../../services/aiExplanations';
import SolutionPanel from '../quiz/SolutionPanel';
import { useAiExplanation } from '../quiz/useAiExplanation';
import { drillPreset, launchPractice } from '../active-recall/presets';
import { formatDuration } from '../../utils/time';
import { outcomeCopy } from './outcome';

const VERDICT_TONE = { [VERDICT.PASSED]: 'success', [VERDICT.CONDITIONAL]: 'amber', [VERDICT.FAILED]: 'danger' };
const TONE_COLOR = { success: 'var(--accent-success)', amber: 'var(--color-reeAmber-text)', danger: 'var(--accent-danger)' };
const subjectTone = (pct) => (pct < SUBJECT_FLOOR ? 'danger' : pct >= GENERAL_AVERAGE ? 'success' : 'amber');
const MISSED_SHOWN = 10;

export default function GauntletDiagnostics({ diagnostics, level }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isOnline = useNetworkStatus();
  const ai = useAiExplanation(currentUser?.uid);
  const [showAllMissed, setShowAllMissed] = useState(false);

  const {
    scorePct, correctCount, totalItems, isPassed, failedSubtopics = {}, review = [],
    timeUsedSecs, isTimeOut, verdict, generalAverage, subjectScores = {}, sessionId,
  } = diagnostics;

  const hasGwa = typeof generalAverage === 'number';
  const tone = VERDICT_TONE[verdict] || (isPassed ? 'success' : 'danger');
  const { title, line } = outcomeCopy(diagnostics);
  const weakTopics = Object.entries(failedSubtopics).sort((a, b) => b[1] - a[1]);
  const subjects = CANONICAL_SUBJECTS.filter((s) => typeof subjectScores[s] === 'number');
  const missed = showAllMissed ? review : review.slice(0, MISSED_SHOWN);

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 pt-4 pb-12 page-fade-in">
      <Card elevated className="p-6 sm:p-8 flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-eyebrow">Gauntlet level {level}</p>
            <h1 className="text-display text-3xl text-textMain mt-1">{title}</h1>
            {line && <p className="text-sm text-muted2 mt-1 max-w-prose">{line}</p>}
            {isTimeOut && <p className="text-xs text-muted2 mt-1">Time ran out, so your answers were submitted.</p>}
          </div>
          {verdict && <Badge tone={tone}>{verdict}</Badge>}
        </div>

        <div>
          <p className="text-display text-6xl tabular-nums" style={{ color: TONE_COLOR[tone] }}>
            {hasGwa ? generalAverage.toFixed(1) : scorePct}%
          </p>
          <p className="text-sm text-muted2 mt-1">
            {hasGwa ? 'General weighted average' : 'Score'} · passing needs {GENERAL_AVERAGE}% with no subject under {SUBJECT_FLOOR}%
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-3">
          <div className="rounded-[var(--radius-default)] bg-surface2 border border-border p-3">
            <dt className="text-eyebrow">Correct</dt>
            <dd className="text-lg font-semibold tabular-nums text-textMain mt-1">{correctCount} / {totalItems}</dd>
          </div>
          <div className="rounded-[var(--radius-default)] bg-surface2 border border-border p-3">
            <dt className="text-eyebrow">Raw score</dt>
            <dd className="text-lg font-semibold tabular-nums text-textMain mt-1">{scorePct}%</dd>
          </div>
          <div className="rounded-[var(--radius-default)] bg-surface2 border border-border p-3">
            <dt className="text-eyebrow">Time used</dt>
            <dd className="text-lg font-semibold tabular-nums text-textMain mt-1">{formatDuration(timeUsedSecs)}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          {sessionId && (
            <Button as={Link} to={`/exams/sittings/${encodeURIComponent(sessionId)}`}>
              <ClipboardList size={16} strokeWidth={1.75} aria-hidden="true" /> Review every item
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/exams?tab=gauntlet')}>Back to Exams</Button>
        </div>
      </Card>

      {subjects.length > 0 && (
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-textMain mb-4">By subject</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {subjects.map((s) => {
              const pct = subjectScores[s];
              return (
                <div key={s} className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-textMain font-medium">{toDisplaySubject(s)}</span>
                    <span className="tabular-nums text-textMain">{pct}%</span>
                  </div>
                  <ProgressIndicator value={pct} tone={subjectTone(pct)} size="sm" ariaLabel={`${toDisplaySubject(s)} score`} />
                  {pct < SUBJECT_FLOOR && <span className="text-xs" style={{ color: 'var(--accent-danger)' }}>Under the {SUBJECT_FLOOR}% floor</span>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {weakTopics.length > 0 && (
        <Card className="p-5 sm:p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-textMain">What to review</h2>
            <p className="text-sm text-muted2">The topics your misses came from, most first. Drill one to work on it.</p>
          </div>
          <ul className="flex flex-col gap-2">
            {weakTopics.map(([topic, errors]) => (
              <li key={topic} className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-default)] bg-surface2 border border-border">
                <span className="text-sm text-textMain min-w-0 [overflow-wrap:anywhere]">{topic}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <Badge tone="danger">{errors} missed</Badge>
                  {topic !== 'Unknown' && (
                    <Button size="sm" variant="ghost" onClick={() => launchPractice(navigate, drillPreset({ topic }))} aria-label={`Drill ${topic}`}>
                      <Play size={14} strokeWidth={1.75} aria-hidden="true" /> Drill
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {review.length > 0 && (
        <Card className="p-5 sm:p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-textMain">Missed questions ({review.length})</h2>
          <ul className="flex flex-col gap-4">
            {missed.map((item, i) => {
              const question = {
                id: item.questionId,
                text: item.text,
                options: item.options || [],
                answer: item.correctAnswer,
                fixedExplanation: item.explanation,
              };
              return (
                <li key={item.questionId || i} className="p-4 rounded-[var(--radius-lg)] bg-surface2 border border-border flex flex-col gap-3">
                  <span className="text-eyebrow">{item.subtopic}</span>
                  <div className="text-sm text-textMain [&_p]:!m-0 overflow-x-auto custom-scrollbar"><LatexRenderer content={item.text} /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-[var(--radius-default)] border" style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 40%, transparent)' }}>
                      <span className="text-eyebrow block mb-1" style={{ color: 'var(--accent-danger)' }}>Your answer</span>
                      <div className="text-sm text-textMain [&_p]:!m-0 overflow-x-auto">
                        {item.userAnswer ? <span className="line-through"><LatexRenderer content={item.userAnswer} /></span> : <span className="text-muted2">Left blank</span>}
                      </div>
                    </div>
                    <div className="p-3 rounded-[var(--radius-default)] border" style={{ borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)' }}>
                      <span className="text-eyebrow block mb-1" style={{ color: 'var(--accent-success)' }}>Correct answer</span>
                      <div className="text-sm font-semibold text-textMain [&_p]:!m-0 overflow-x-auto"><LatexRenderer content={item.correctAnswer || '—'} /></div>
                    </div>
                  </div>
                  <SolutionPanel
                    key={explanationKey(question)}
                    question={question}
                    isOnline={isOnline}
                    aiText={ai.textFor(question)}
                    aiLoading={ai.isLoading(question)}
                    onExplain={(force) => ai.explain(question, { force })}
                  />
                </li>
              );
            })}
          </ul>
          {review.length > MISSED_SHOWN && (
            <Button variant="ghost" className="self-start" onClick={() => setShowAllMissed((v) => !v)}>
              {showAllMissed ? 'Show fewer' : `Show all ${review.length}`}
            </Button>
          )}
        </Card>
      )}

      {/* The one-time reminder offer after a first session, in the page
          rather than floating over the buttons above. */}
      <NotificationOptIn inline />
    </div>
  );
}
