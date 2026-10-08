// src/features/active-recall/SessionSummary.jsx
//
// The end of a practice session: the score, where it went wrong by topic, the
// questions missed with their answers, and what to do next. A session used to
// end on a toast and drop straight back to the setup screen.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import LatexRenderer from '../../components/LatexRenderer';
import { Button, Card, PageHeader, ProgressIndicator, StatusPill } from '../../components/ui';
import { Crosshair, RotateCcw } from '../../components/ui/icons';
import { toDisplaySubject } from '@ree/shared';
import { SectionCard } from '../analytics/sections/shared';
import NotificationOptIn from '../../components/NotificationOptIn';
import { formatDuration } from './buildSessionSummary';

function Figure({ label, value, sub }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-eyebrow">{label}</span>
      <span className="text-display text-3xl text-textMain tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted2">{sub}</span>}
    </div>
  );
}

/**
 * @param {object} props
 * @param {object} props.summary  buildSessionSummary() plus the session's `config`
 * @param {boolean} props.isOnline
 * @param {boolean} props.loading  a new session is starting
 * @param {() => void} props.onAgain  repeat the same session
 * @param {(topic: {topic: string, subject: string}) => void} props.onDrill
 * @param {() => void} props.onDone  back to the setup screen
 */
export default function SessionSummary({ summary, isOnline, loading, onAgain, onDrill, onDone }) {
  // The session screen was scrolled to its last question.
  useEffect(() => { window.scrollTo?.(0, 0); }, []);

  const { total, correct, accuracy, durationSecs, avgSecs, byTopic, weakest, confidentMisses, luckyGuesses, missed, missedCount } = summary;
  const tone = accuracy >= 70 ? 'success' : accuracy >= 50 ? 'amber' : 'danger';

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 page-fade-in">
      <PageHeader
        title="Session complete"
        subtitle={`${total} question${total === 1 ? '' : 's'} in ${formatDuration(durationSecs)}.`}
        meta={<StatusPill tone={tone} dot={false}>{accuracy >= 70 ? 'At the pass mark' : 'Below the 70% pass mark'}</StatusPill>}
      />

      <Card elevated glow className="p-5 sm:p-6 flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-4">
          <Figure label="Score" value={`${correct}/${total}`} sub={`${accuracy}% correct`} />
          <Figure label="Time" value={formatDuration(durationSecs)} />
          <Figure label="Per question" value={avgSecs != null ? `${avgSecs}s` : '—'} sub="average" />
        </div>

        {(confidentMisses > 0 || luckyGuesses > 0 || missedCount > 0) && (
          <ul className="flex flex-col gap-1.5 text-sm text-muted2">
            {confidentMisses > 0 && (
              <li>
                <span className="font-medium" style={{ color: 'var(--accent-danger)' }}>
                  {confidentMisses} wrong while you were sure.
                </span>{' '}
                These blind spots cost the most on the board.
              </li>
            )}
            {luckyGuesses > 0 && <li>{luckyGuesses} right while unsure. Worth another look.</li>}
            {missedCount > 0 && <li>Missed and unsure answers come back in your review queue.</li>}
          </ul>
        )}

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
          <Button onClick={onAgain} loading={loading} disabled={loading}>
            {!loading && <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />} Practise again
          </Button>
          {weakest && (
            <Button
              variant="secondary"
              onClick={() => onDrill(weakest)}
              disabled={loading || !isOnline}
              title={isOnline ? undefined : 'Needs a connection'}
            >
              <Crosshair size={16} strokeWidth={1.75} aria-hidden="true" /> Drill {weakest.topic}
            </Button>
          )}
          <Button variant="secondary" as={Link} to="/progress?tab=topics">See your progress</Button>
          <Button variant="ghost" onClick={onDone} disabled={loading}>Done</Button>
        </div>
      </Card>

      {/* The one-time reminder offer after a first session, as a card here
          rather than a floating one over the buttons above. */}
      <NotificationOptIn inline />

      {byTopic.length > 0 && (
        <SectionCard eyebrow="Topics" title="How you did by topic">
          <ul className="flex flex-col gap-3">
            {byTopic.slice(0, 8).map((t) => (
              <li key={`${t.subject}|${t.topic}`} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-textMain">
                    {t.topic} <span className="text-xs text-muted2">· {toDisplaySubject(t.subject)}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted2">{t.correct}/{t.total}</span>
                </div>
                <ProgressIndicator
                  value={t.correct}
                  max={t.total}
                  size="sm"
                  tone={t.accuracy >= 70 ? 'success' : t.accuracy >= 50 ? 'amber' : 'danger'}
                  ariaLabel={`${t.topic}: ${t.correct} of ${t.total} correct`}
                />
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {missed.length > 0 && (
        <SectionCard
          eyebrow="Review"
          title={missedCount > missed.length ? `Questions you missed (first ${missed.length} of ${missedCount})` : 'Questions you missed'}
        >
          <ol className="flex flex-col gap-3">
            {missed.map((m) => (
              <li key={m.id} className="p-4 rounded-[var(--radius-default)] border border-border bg-surface2/40 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted2">
                  <span>{m.topic}</span>
                  {m.confident && <StatusPill tone="danger" dot={false}>Wrong while sure</StatusPill>}
                </div>
                <div className="text-sm text-textMain leading-relaxed overflow-x-auto [&_p]:!m-0">
                  <LatexRenderer content={m.text} />
                </div>
                {m.answer && (
                  <div className="text-sm text-muted2 flex flex-wrap gap-1.5 [&_p]:!m-0">
                    <span className="font-medium" style={{ color: 'var(--accent-success)' }}>Answer:</span>
                    <LatexRenderer content={m.answer} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </SectionCard>
      )}
    </div>
  );
}
