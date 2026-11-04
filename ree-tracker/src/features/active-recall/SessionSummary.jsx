// src/features/active-recall/SessionSummary.jsx
//
// The end of a practice session: the score, where it went wrong by topic, the
// questions missed with their answers, and what to do next. A session used to
// end on a toast and drop straight back to the setup screen.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ResultsCard from '../../components/exam/ResultsCard';
import ItemReview from '../quiz/ItemReview';
import { Button, Card, Page, PageHeader, ProgressIndicator, StatusPill } from '../../components/ui';
import { CheckCircle2, Crosshair, RotateCcw } from '../../components/ui/icons';
import { toDisplaySubject } from '@ree/shared';
import { SectionCard } from '../analytics/sections/shared';
import NotificationOptIn from '../../components/NotificationOptIn';
import { formatDuration } from '../../utils/time';

/**
 * @param {object} props
 * @param {object} props.summary  buildSessionSummary() plus the session's `config`
 * @param {boolean} props.loading  a new session is starting
 * @param {() => void} props.onAgain  repeat the same session
 * @param {() => void} props.onRetry  practise just the ones missed
 * @param {(topic: {topic: string, subject: string}) => void} props.onDrill
 * @param {() => void} props.onDone  back to the setup screen
 */
export default function SessionSummary({ summary, loading, onAgain, onRetry, onDrill, onDone }) {
  // The session screen was scrolled to its last question.
  useEffect(() => { window.scrollTo?.(0, 0); }, []);

  const { total, correct, accuracy, durationSecs, avgSecs, byTopic, weakest, confidentMisses, luckyGuesses, items = [], missedCount } = summary;
  const tone = accuracy >= 70 ? 'success' : accuracy >= 50 ? 'amber' : 'danger';
  // Formula cards rated inside Today's loop; the rest of the cards due are
  // next, in Library › Formula cards.
  const cardsRated = summary.cardsRated || 0;
  const cardsNext = summary.config?.source === 'today-loop' ? Math.max(0, (summary.config.cardsDue || 0) - cardsRated) : 0;
  const parts = [
    total > 0 && `${total} question${total === 1 ? '' : 's'}`,
    cardsRated > 0 && `${cardsRated} formula card${cardsRated === 1 ? '' : 's'}`,
  ].filter(Boolean);

  return (
    <Page width="reading">
      <PageHeader
        title="Session complete"
        subtitle={`${parts.join(' and ') || '0 questions'} in ${formatDuration(durationSecs)}.`}
        meta={total > 0 ? <StatusPill tone={tone} dot={false}>{accuracy >= 70 ? 'At the pass mark' : 'Below the 70% pass mark'}</StatusPill> : null}
      />

      {/* The screen's hero: the score, what it means, and what to do next. */}
      <ResultsCard
        watermark={CheckCircle2}
        score={total > 0 ? `${accuracy}%` : null}
        tone={tone}
        caption={total > 0 ? `${correct} of ${total} correct` : null}
        tiles={total > 0 ? [
          { label: 'Time', value: formatDuration(durationSecs) },
          { label: 'Per question', value: avgSecs != null ? `${avgSecs}s` : '—', hint: 'average' },
        ] : []}
        actions={(
          <>
            {missedCount > 0 && onRetry && (
              <Button onClick={onRetry} loading={loading} disabled={loading}>
                {!loading && <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />} Retry missed ({missedCount})
              </Button>
            )}
            <Button variant={missedCount > 0 && onRetry ? 'secondary' : 'primary'} onClick={onAgain} loading={loading} disabled={loading}>
              {!loading && <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />} Practise again
            </Button>
            {weakest && (
              <Button
                variant="secondary"
                onClick={() => onDrill(weakest)}
                disabled={loading}
              >
                <Crosshair size={16} strokeWidth={1.75} aria-hidden="true" /> Drill {weakest.topic}
              </Button>
            )}
            <Button variant="secondary" as={Link} to="/progress?tab=topics">See your progress</Button>
            <Button variant="ghost" onClick={onDone} disabled={loading}>Done</Button>
          </>
        )}
        details={(<>
        {cardsRated > 0 && (
          <p className="text-sm text-textMain">
            {cardsRated} formula card{cardsRated === 1 ? '' : 's'} rated. Each comes back when it’s due.
          </p>
        )}

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

        {cardsNext > 0 && (
          <Card variant="inset" className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
            <p className="text-sm text-textMain flex-1 min-w-0">
              {cardsRated > 0 ? `${cardsNext} more formula card${cardsNext === 1 ? '' : 's'}` : `Next in today’s loop: ${cardsNext} formula card${cardsNext === 1 ? '' : 's'}`} due for review.
            </p>
            <Button variant="secondary" as={Link} to="/library?tab=formulas" className="w-full sm:w-auto">Review cards</Button>
          </Card>
        )}
        </>)}
      />

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

      {items.length > 0 && (
        <SectionCard eyebrow="Review" title="Review every item">
          <ItemReview items={items} />
        </SectionCard>
      )}
    </Page>
  );
}
