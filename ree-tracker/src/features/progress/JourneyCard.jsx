// src/features/progress/JourneyCard.jsx
//
// Progress › Overview › Your journey: readiness, pass chance and each board
// subject's accuracy over time. The page had one trend (ability); everything
// else was a number for today, so "am I getting better?" had no answer.
//
// Five small tiles, not one chart: the measures aren't one scale, and each
// tile says its figure and its change in words. The line is decoration
// (Sparkline is hidden from screen readers); the weeks are in a table below.
// A tile with no history says what it needs. With none at all (a new account,
// or a server that doesn't have these routes yet) the card isn't drawn.
import { useEffect, useState } from 'react';
import { toDisplaySubject } from '@ree/shared';
import { Card, DataTable, Panel, Sparkline } from '../../components/ui';
import { TrendingUp } from '../../components/ui/icons';
import { fetchForecastHistory, fetchReadinessHistory } from '../../services/dbQueries';
import { useDeepAnalytics } from '../analytics/useDeepAnalytics';
import { MIN_WEEK_ANSWERS, SUBJECTS, passPoints, readinessPoints, subjectTrends, trendOf, weekLine, weekRows } from './journey';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// 'YYYY-MM-DD' → 'Nov 9', from its parts (no timezone shift).
const shortDay = (ymd) => {
  const [, m, d] = String(ymd).split('-').map(Number);
  return m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${d}` : ymd;
};

function changeLine(trend, { weekly }) {
  if (trend.change == null) return `The trend starts with your next ${weekly ? 'week' : 'day'}.`;
  const since = `since ${weekly ? 'the week of ' : ''}${shortDay(trend.since)}`;
  if (trend.change === 0) return `Level ${since}.`;
  const by = Math.abs(trend.change);
  return `${trend.change > 0 ? 'Up' : 'Down'} ${by} point${by === 1 ? '' : 's'} ${since}.`;
}

function Tile({ label, trend, unit = '', weekly = false, needs }) {
  return (
    <Card as="li" variant="inset" className="flex flex-col gap-1.5 min-w-0">
      <p className="text-eyebrow">{label}</p>
      {trend ? (
        <>
          <div className="flex items-end justify-between gap-2">
            <p className="text-h2 text-textMain tabular-nums">{trend.latest}{unit}</p>
            <Sparkline scores={trend.values} width={72} height={24} />
          </div>
          <p className="text-xs text-muted2">{changeLine(trend, { weekly })}</p>
        </>
      ) : (
        <p className="text-xs text-muted2">{needs}</p>
      )}
    </Card>
  );
}

const cell = (subject) => (row) => (row[subject]
  ? <span className="tabular-nums">{row[subject].pct}% <span className="text-muted2">of {row[subject].answered}</span></span>
  : <span className="text-muted2">No answers</span>);
const WEEK_COLUMNS = [
  { key: 'week', label: 'Week of', render: (row) => shortDay(row.week) },
  ...SUBJECTS.map((subject) => ({ key: subject, label: toDisplaySubject(subject), align: 'right', render: cell(subject) })),
];

export default function JourneyCard({ today }) {
  // undefined while loading; null when there is none (or the request failed).
  const [readiness, setReadiness] = useState(undefined);
  const [pass, setPass] = useState(undefined);
  const weekly = useDeepAnalytics('weekly-accuracy');

  useEffect(() => {
    let live = true;
    fetchReadinessHistory().then((r) => r?.items, () => null).then((items) => { if (live) setReadiness(trendOf(readinessPoints(items))); });
    fetchForecastHistory().then((r) => r?.items, () => null).then((items) => { if (live) setPass(trendOf(passPoints(items))); });
    return () => { live = false; };
  }, []);

  const items = weekly.data?.items;
  const subjects = subjectTrends(items);
  if (!readiness && !pass && subjects.every((s) => !s.trend)) return null;

  const line = today ? weekLine(items, today) : null;
  const rows = weekRows(items);
  return (
    <Panel icon={TrendingUp} eyebrow="Over time" title="Your journey" bodyClassName="@container flex flex-col gap-4">
      {line && <p className="text-sm text-textMain">{line}</p>}
      <ul className="grid grid-cols-2 @2xl:grid-cols-5 gap-3">
        <Tile label="Readiness" trend={readiness} needs="Shows once you have studied on a day." />
        <Tile label="Pass chance" trend={pass} unit="%" needs="Shows after your forecast is worked out on a day." />
        {subjects.map((s) => (
          <Tile
            key={s.subject}
            label={`${toDisplaySubject(s.subject)} accuracy`}
            trend={s.trend}
            unit="%"
            weekly
            needs={`Shows after ${MIN_WEEK_ANSWERS} answers in a week.`}
          />
        ))}
      </ul>
      {rows.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-[var(--accent-text)] underline underline-offset-2 inline-flex items-center pointer-coarse:min-h-11">
            Accuracy week by week
          </summary>
          <DataTable className="mt-3" columns={WEEK_COLUMNS} rows={rows} rowKey={(row) => row.week} />
        </details>
      )}
    </Panel>
  );
}
