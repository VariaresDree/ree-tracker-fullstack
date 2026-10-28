// src/features/analytics/sections/StudyTime.jsx
// Daily study time over the last 14 Manila days (deep/study-time).
import { Grid, KpiTile } from '../../../components/ui';
import { useDeepAnalytics } from '../useDeepAnalytics';
import { DeepStatus, SectionCard } from './shared';
import { formatDuration as fmtDuration } from '../../../utils/time';

// 'YYYY-MM-DD' (Manila-keyed by the server) → 'Jul 3' without a timezone
// round-trip: new Date('YYYY-MM-DD') is UTC midnight and re-localizing can
// shift the label a day. Format from the string parts instead.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDay = (isoDate) => {
  const [, m, d] = String(isoDate).split('-').map(Number);
  return m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${d}` : isoDate;
};
// Zero-fill a trailing window of Manila days so "last 14 days" is a real
// calendar window, not "the last 14 active days".
const MANILA_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });
const lastManilaDays = (n) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) days.push(MANILA_FMT.format(new Date(Date.now() - i * 86400000)));
  return days;
};
// A day before today: the accent, softer at the bottom.
const PAST_FILL = 'linear-gradient(to top, color-mix(in srgb, var(--accent) 45%, transparent), color-mix(in srgb, var(--accent) 80%, transparent))';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Weekday of a 'YYYY-MM-DD' Manila day, from its parts (no timezone shift).
const weekday = (isoDate) => {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  return WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

// The last 14 days as columns: a rounded track per day, filled from the
// bottom in the accent (today solid, the rest a softer gradient), the minutes
// above and the weekday and date below, and a dashed line at the average
// active day. It was a list of horizontal bars. On a narrow card only today's
// and the best day's minutes are printed above, so the figures don't crowd;
// every day's figure is in the screen-reader list.
export function DayColumns({ days, average }) {
  const max = Math.max(...days.map((d) => d.minutes), 1);
  const best = days.reduce((b, d) => (d.minutes > b.minutes ? d : b), days[0]);
  const today = days[days.length - 1];
  const height = (min) => (min > 0 ? Math.max(6, (min / max) * 100) : 0);
  return (
    <div className="@container flex flex-col gap-2">
      <div aria-hidden="true" className="grid grid-cols-14 gap-1 @md:gap-2">
        {days.map((d) => (
          <span
            key={d.date}
            className={`text-micro tabular-nums text-center truncate ${d === today ? 'text-accent-text font-semibold' : 'text-muted2'} ${d === today || (d === best && d.minutes > 0) ? '' : '@max-lg:invisible'}`}
          >
            {d.minutes > 0 ? d.minutes : ''}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="relative h-40 @lg:h-48">
        {average > 0 && (
          <div className="absolute inset-x-0 border-t border-dashed border-muted2/60 z-10 pointer-events-none" style={{ bottom: `${(average / max) * 100}%` }} />
        )}
        <div className="grid grid-cols-14 gap-1 @md:gap-2 h-full">
          {days.map((d) => (
            <span key={d.date} className="flex items-end justify-center h-full">
              <span className="relative w-full max-w-9 h-full rounded-full bg-surface3 overflow-hidden flex items-end">
                <span
                  className="w-full rounded-full transition-[height] duration-500 motion-reduce:transition-none"
                  style={{ height: `${height(d.minutes)}%`, background: d === today ? 'var(--accent)' : PAST_FILL }}
                />
              </span>
            </span>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="grid grid-cols-14 gap-1 @md:gap-2">
        {days.map((d) => (
          <span key={d.date} className={`flex flex-col items-center leading-tight text-micro ${d === today ? 'text-accent-text font-semibold' : 'text-muted2'}`}>
            <span>{weekday(d.date).slice(0, 1)}<span className="@max-md:hidden">{weekday(d.date).slice(1)}</span></span>
            <span className="tabular-nums">{Number(d.date.slice(8))}</span>
          </span>
        ))}
      </div>
      {average > 0 && (
        <p className="flex items-center gap-2 text-micro text-muted2 tabular-nums">
          <span aria-hidden="true" className="w-5 border-t border-dashed border-muted2/60" />
          Average active day: {average} min
        </p>
      )}
      <ol className="sr-only">
        {days.map((d) => (
          <li key={d.date}>{weekday(d.date)} {d.shortDate}{d === today ? ' (today)' : ''}: {d.minutes} minutes</li>
        ))}
      </ol>
    </div>
  );
}

export default function StudyTime() {
  const { data, status, retry } = useDeepAnalytics('study-time');
  const daily = data?.daily || [];

  const byDate = Object.fromEntries(daily.map((d) => [d.date, d]));
  const window14 = lastManilaDays(14).map((date) => ({
    date,
    shortDate: shortDay(date),
    minutes: Math.round((byDate[date]?.totalSecs || 0) / 60),
  }));
  const activeDays = window14.filter((d) => d.minutes > 0).length;
  const windowSecs = window14.reduce((a, d) => a + d.minutes * 60, 0);
  const allSecs = daily.reduce((a, d) => a + d.totalSecs, 0);

  return (
    <SectionCard eyebrow="Habits" title="Study time">
      <DeepStatus status={status} retry={retry}>
        {daily.length === 0 ? (
          <p className="text-sm text-muted2">Finish a practice session or a mock board to start tracking study time.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <Grid kind="tiles" gap="sm">
              <KpiTile compact label="Active days (last 14)" value={`${activeDays} / 14`} />
              <KpiTile compact label="Time (last 14 days)" value={fmtDuration(windowSecs)} hint={`All time: ${Math.round(allSecs / 3600)}h`} />
              <KpiTile compact label="Average per active day" value={activeDays > 0 ? `${Math.round(windowSecs / 60 / activeDays)}min` : '—'} />
            </Grid>
            <div className="flex flex-col gap-2">
              <h3 className="text-eyebrow">Minutes per day, last 14 days</h3>
              {/* All 14 days, oldest first, today last. */}
              <DayColumns days={window14} average={activeDays > 0 ? Math.round(windowSecs / 60 / activeDays) : 0} />
            </div>
          </div>
        )}
      </DeepStatus>
    </SectionCard>
  );
}
