// src/features/active-recall/SessionSummary.jsx
//
// The end of a practice session: the score, where it went wrong by topic, the
// questions missed with their answers, and what to do next. A session used to
// end on a toast and drop straight back to the setup screen.
import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { dailyCountsToday } from '../../services/analyticsSync';
import { Link } from 'react-router-dom';
import ResultsCard from '../../components/exam/ResultsCard';
import ItemReview from '../quiz/ItemReview';
import { Button, Card, Page, PageHeader, ProgressIndicator, StatusPill } from '../../components/ui';
import { ArrowRight, CheckCircle2, RotateCcw, X } from '../../components/ui/icons';
import SessionActions from '../../components/exam/SessionActions';
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
 * @param {() => void} [props.onNextLoop]  the next of Today's loops, after one
 */

// Sessions made of what you missed: their score isn't a measure against the
// board, so no pass-mark verdict (it was always red on a review of misses).
const REVIEW_SOURCES = new Set(['srs-due', 'today-loop', 'items', 'smart-drill']);
// Under this many, a score is too small to compare with the pass mark.
const VERDICT_MIN = 10;
const LINK = 'text-[var(--accent-text)] underline underline-offset-2 inline-flex items-center pointer-coarse:min-h-11 cursor-pointer disabled:opacity-50';

export default function SessionSummary({ summary, loading, onAgain, onRetry, onDrill, onDone, onNextLoop }) {
  const stats = useStore((s) => s.stats);
  // The session screen was scrolled to its last question.
  useEffect(() => { window.scrollTo?.(0, 0); }, []);

  const { total, correct, accuracy, durationSecs, avgSecs, byTopic, weakest, confidentMisses, luckyGuesses, items = [], missedCount, dueReviews = 0 } = summary;
  const tone = accuracy >= 70 ? 'success' : accuracy >= 50 ? 'amber' : 'danger';
  const source = summary.config?.source;
  const judged = total >= VERDICT_MIN && !REVIEW_SOURCES.has(source);
  const isLoop = source === 'today-loop';
  // Missed answers and right-but-unsure ones each start (or move) a review.
  const comingBack = missedCount + luckyGuesses;
  const today = dailyCountsToday(stats);
  const doneToday = today.dailyMath + today.dailyESAS + today.dailyEE;
  const target = Number(stats?.dailyTarget) || 50;
  // Formula cards rated inside Today's loop; the rest of the cards due are
  // next, in Library › Formula cards.
  const cardsRated = summary.cardsRated || 0;
  const cardsNext = summary.config?.source === 'today-loop' ? Math.max(0, (summary.config.cardsDue || 0) - cardsRated) : 0;
  const parts = [
    total > 0 && `${total} question${total === 1 ? '' : 's'}`,
    cardsRated > 0 && `${cardsRated} formula card${cardsRated === 1 ? '' : 's'}`,
  ].filter(Boolean);

  // One next step, the primary button; one way out, Done.
  const retryFirst = missedCount > 0 && onRetry;
  const loopNext = isLoop && onNextLoop;
  const retryButton = retryFirst && (
    <Button onClick={onRetry} loading={loading} disabled={loading}>
      {!loading && <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />} Retry missed ({missedCount})
    </Button>
  );
  const continueButton = loopNext ? (
    <Button onClick={onNextLoop} loading={loading} disabled={loading}>
      {!loading && <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />} Next loop
    </Button>
  ) : (
    <Button onClick={onAgain} loading={loading} disabled={loading}>
      {!loading && <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />} Practise again
    </Button>
  );
  const nextButton = retryButton || continueButton;
  // When Retry missed leads, Next loop / Practise again joins the links.
  const secondNext = retryFirst && (
    <button type="button" className={LINK} onClick={loopNext ? onNextLoop : onAgain} disabled={loading}>
      {loopNext ? 'Next loop' : 'Practise again'}
    </button>
  );
  const doneButton = (
    <Button variant="secondary" onClick={onDone} disabled={loading}>
      <X size={16} strokeWidth={1.75} aria-hidden="true" /> Done
    </Button>
  );

  return (
    <Page width="reading">
      <PageHeader
        title="Session complete"
        subtitle={`${parts.join(' and ') || '0 questions'} in ${formatDuration(durationSecs)}.`}
        meta={judged ? <StatusPill tone={tone} dot={false}>{accuracy >= 70 ? 'At the pass mark' : 'Below the 70% pass mark'}</StatusPill> : null}
        // The way out, visible the moment the summary opens (2026-11-13: Done
        // was the last of up to 7 buttons, in faint ghost text).
        actions={doneButton}
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
            {/* On a phone these two are pinned at the foot instead (below). */}
            <div className="hidden md:contents">{nextButton}{doneButton}</div>
            {/* The other ways on, as plain links. */}
            <div className="basis-full flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {secondNext}
              {weakest && (
                <button type="button" className={LINK} onClick={() => onDrill(weakest)} disabled={loading}>Drill {weakest.topic}</button>
              )}
              {missedCount > 0 && <Link className={LINK} to="/library?tab=notebook">Open mistakes</Link>}
              <Link className={LINK} to="/progress?tab=topics">See your progress</Link>
              <Link className={LINK} to="/" aria-label={`Back to Today, ${doneToday} of ${target} answered today`}>
                Back to Today <span className="text-muted2 tabular-nums">· {doneToday}/{target}</span>
              </Link>
            </div>
          </>
        )}
        details={(<>
        {cardsRated > 0 && (
          <p className="text-sm text-textMain">
            {cardsRated} formula card{cardsRated === 1 ? '' : 's'} rated. Each comes back when it’s due.
          </p>
        )}

        {(confidentMisses > 0 || luckyGuesses > 0 || comingBack > 0 || dueReviews > 0) && (
          <ul className="flex flex-col gap-1.5 text-sm text-muted2">
            {dueReviews > 0 && <li>{dueReviews} of these {dueReviews === 1 ? 'was a due review' : 'were due reviews'}, now off today’s pile.</li>}
            {confidentMisses > 0 && (
              <li>
                <span className="font-medium" style={{ color: 'var(--accent-danger)' }}>
                  {confidentMisses} wrong while you were sure.
                </span>{' '}
                These blind spots cost the most on the board.
              </li>
            )}
            {luckyGuesses > 0 && <li>{luckyGuesses} right while unsure. Worth another look.</li>}
            {comingBack > 0 && (
              <li>
                {comingBack} come{comingBack === 1 ? 's' : ''} back in your reviews, from tomorrow, until you know {comingBack === 1 ? 'it' : 'them'}.
              </li>
            )}
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

      {/* Phones: the next step and Done stay in reach while you read the review. */}
      <SessionActions className="md:hidden">
        {doneButton}
        <span className="ml-auto">{nextButton}</span>
      </SessionActions>
    </Page>
  );
}
