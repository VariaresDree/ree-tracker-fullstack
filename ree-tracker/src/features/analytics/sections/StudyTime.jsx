// src/features/analytics/sections/StudyTime.jsx
// Daily study time over the last 14 Manila days (deep/study-time).
import { useState } from 'react';
import { Grid, KpiTile, SegmentedControl } from '../../../components/ui';
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

// 'Oct 15' and 'Oct 21' → 'Oct 15–21'; across a month, 'Sep 28–Oct 4'.
const range = (from, to) => (from.slice(0, 3) === to.slice(0, 3) ? `${from}–${to.slice(4)}` : `${from}–${to}`);

// The last 14 days as columns: a rounded track per day, filled from the
// bottom in the accent (today solid, the rest a softer gradient), every day's
// minutes above and the weekday and date below, and a dashed line at the
// average active day. It was a list of horizontal bars.
//
// A card narrower than 32rem (a phone) shows one week at a time, with a picker
// for the week before. Fourteen columns there were 20px each: the minutes
// didn't fit above them, so only two days were labelled, and the weekday was a
// single letter. Seven columns give every day its figure and its full name.
// Both weeks share one scale, so they compare. Every day is in the
// screen-reader list whichever week shows.
export function DayColumns({ days, average }) {
  // 1: the latest seven days, today last; 0: the seven before.
  const [week, setWeek] = useState(1);
  const max = Math.max(...days.map((d) => d.minutes), 1);
  const best = days.reduce((b, d) => (d.minutes > b.minutes ? d : b), days[0]);
  const today = days[days.length - 1];
  const height = (min) => (min > 0 ? Math.max(4, (min / max) * 100) : 0);
  // Out of the week on show: gone on a narrow card, there on a wide one.
  const off = (i) => (Math.floor(i / 7) === week ? '' : '@max-lg:hidden');
  const cols = 'grid grid-cols-7 @lg:grid-cols-14 gap-1.5 @lg:gap-2';
  return (
    <div className="@container flex flex-col gap-3">
      <SegmentedControl
        className="@lg:hidden"
        size="sm"
        fullWidth
        label="Week shown"
        value={week}
        onChange={setWeek}
        options={[
          { value: 0, label: range(days[0].shortDate, days[6].shortDate) },
          { value: 1, label: range(days[7].shortDate, today.shortDate) },
        ]}
      />
      <div aria-hidden="true" className="flex flex-col gap-1.5">
        <div className={cols}>
          {days.map((d, i) => (
            <span
              key={d.date}
              data-day-value
              className={`text-xs tabular-nums text-center ${d === today ? 'text-accent-text font-semibold' : d.minutes > 0 ? 'text-textMain font-medium' : 'text-muted2'} ${off(i)}`}
            >
              {d.minutes}
            </span>
          ))}
        </div>
        <div className="relative h-40 @lg:h-48">
          {average > 0 && (
            <div className="absolute inset-x-0 border-t border-dashed border-muted2/70 z-10 pointer-events-none" style={{ bottom: `${(average / max) * 100}%` }} />
          )}
          <div className={`${cols} h-full`}>
            {days.map((d, i) => (
              <span key={d.date} className={`flex items-end justify-center h-full ${off(i)}`}>
                <span className="w-full max-w-10 h-full rounded-full bg-surface3 overflow-hidden flex items-end">
                  <span
                    data-day-fill
                    className="w-full rounded-full transition-[height] duration-500 motion-reduce:transition-none"
                    style={{ height: `${height(d.minutes)}%`, background: d === today ? 'var(--accent)' : PAST_FILL }}
                  />
                </span>
              </span>
            ))}
          </div>
        </div>
        <div className={cols}>
          {days.map((d, i) => (
            <span key={d.date} className={`flex flex-col items-center leading-tight ${d === today ? 'text-accent-text font-semibold' : 'text-muted2'} ${off(i)}`}>
              <span className="text-xs">{d === today ? 'Today' : weekday(d.date)}</span>
              <span className="text-micro tabular-nums">{d.shortDate.slice(4)}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted2 tabular-nums">
        {average > 0 && (
          <p className="flex items-center gap-2">
            <span aria-hidden="true" className="w-5 border-t border-dashed border-muted2/70" />
            Average active day: {average} min
          </p>
        )}
        {best.minutes > 0 && (
          <p>Best day: {weekday(best.date)} {best.shortDate}, {best.minutes} min</p>
        )}
      </div>
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
