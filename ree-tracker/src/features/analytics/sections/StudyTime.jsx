// src/features/analytics/sections/StudyTime.jsx
// Daily study time over the last 14 Manila days (deep/study-time).
import { useDeepAnalytics } from '../useDeepAnalytics';
import { BarList, DeepStatus, SectionCard, StatTile } from './shared';

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

const fmtDuration = (secs) => (secs >= 3600 ? `${(secs / 3600).toFixed(1)}h` : `${Math.round(secs / 60)}min`);

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatTile label="Active days (last 14)" value={`${activeDays} / 14`} color="var(--accent-text)" />
              <StatTile label="Time (last 14 days)" value={fmtDuration(windowSecs)} sub={`All time: ${Math.round(allSecs / 3600)}h`} color="var(--accent-success)" />
              <StatTile label="Average per active day" value={activeDays > 0 ? `${Math.round(windowSecs / 60 / activeDays)}min` : '—'} color="var(--color-reeCyan-text)" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-eyebrow">Minutes per day, last 14 days</h3>
              <BarList items={window14} valueKey="minutes" labelKey="shortDate" empty="" />
            </div>
          </div>
        )}
      </DeepStatus>
    </SectionCard>
  );
}
