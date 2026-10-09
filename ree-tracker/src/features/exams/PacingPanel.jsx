// src/features/exams/PacingPanel.jsx
//
// How the learner paced a sitting against the board: per subject, the average
// time per item against the PRC pace (Mathematics 3:00, ESAS 2:24, EE 3:36),
// how many items were fast, on pace or slow, and the slowest few. On the
// results screen and the sitting review.
import { toDisplaySubject } from '@ree/shared';
import { Card, ProgressIndicator, Button } from '../../components/ui';
import { Clock } from '../../components/ui/icons';
import SmartText from '../../components/SmartText';
import { pacingSummary } from './pacing';
import { formatClock as formatSecs } from '../../utils/time';

/**
 * @param items  [{ order, subject, timeSpentMs, isCorrect?, text? }]
 * @param onJump optional (order) => void, to open a slow item
 */
export default function PacingPanel({ items, onJump, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`;
  const { bySubject, slowest, timedCount } = pacingSummary(items);

  return (
    <Card className="p-5 sm:p-6 flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <Clock size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--color-reeAmber-text)' }} />
        <div>
          <Heading className="text-base font-semibold text-textMain">Pacing</Heading>
          <p className="text-sm text-muted2">Time per item against the board’s pace for each subject.</p>
        </div>
      </div>

      {timedCount === 0 ? (
        <p className="text-sm text-muted2">No timings were recorded for this sitting.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {bySubject.map((row) => {
              const over = row.avgSecs > row.paceSecs;
              return (
                <li key={row.subject} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium text-textMain">{toDisplaySubject(row.subject)}</span>
                    <span className="tabular-nums text-textMain">
                      {formatSecs(row.avgSecs)} <span className="text-muted2">per item · pace {formatSecs(row.paceSecs)}</span>
                    </span>
                  </div>
                  <ProgressIndicator
                    value={Math.min(row.avgSecs, row.paceSecs * 2)}
                    max={row.paceSecs * 2}
                    tone={over ? 'danger' : 'success'}
                    size="sm"
                    ariaLabel={`${toDisplaySubject(row.subject)}: ${formatSecs(row.avgSecs)} per item against a pace of ${formatSecs(row.paceSecs)}`}
                  />
                  <p className="text-xs text-muted2 tabular-nums">
                    {row.fast} fast · {row.onPace} on pace · <span style={row.slow > 0 ? { color: 'var(--accent-danger)' } : undefined}>{row.slow} slow</span>
                  </p>
                </li>
              );
            })}
          </ul>

          {slowest.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <h3 className="text-eyebrow">Slowest items</h3>
              <ol className="flex flex-col gap-2">
                {slowest.map((item) => (
                  <li key={item.order} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <span className="text-muted2 tabular-nums mr-2">#{item.order}</span>
                      <span className="text-textMain line-clamp-2 inline [&_p]:inline"><SmartText text={item.text || ''} /></span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="tabular-nums text-xs" style={{ color: 'var(--accent-danger)' }}>
                        {formatSecs(item.secs)} (+{formatSecs(item.overBy)})
                      </span>
                      {onJump && (
                        <Button size="sm" variant="ghost" onClick={() => onJump(item.order)} aria-label={`Open item ${item.order}`}>
                          Open
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
