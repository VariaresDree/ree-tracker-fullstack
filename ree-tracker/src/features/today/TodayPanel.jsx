// src/features/today/TodayPanel.jsx
//
// The dashboard's first screen: where the learner stands (readiness index,
// PRC pass probability, today's target) and an ordered shortlist of what to do
// next. Everything here already existed somewhere on the page — the readiness
// breakdown the API returned but nothing rendered, the forecast, the review
// queue — but the "what now?" answer was ~10 cards down on a phone.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchReadinessHistory } from '../../services/dbQueries';
import { Card, Button, Skeleton, ProgressIndicator } from '../../components/ui';
import { useForecast } from '../../hooks/useForecast';
import { useSrsSummary } from '../../hooks/useSrsSummary';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import PlacementPrompt from '../diagnostic/PlacementPrompt';
import { buildTodayActions, dailyProgress, daysToExam, readinessTrend } from './todayActions';
import { launchPractice } from '../active-recall/presets';

const BREAKDOWN = [
  ['topicCoverage', 'Coverage'],
  ['accuracyRate', 'Accuracy'],
  ['thetaNormalized', 'Ability'],
  ['consistency', 'Consistency'],
];

// A dependency-free sparkline — the Today panel sits on the boot path of the
// dashboard, where recharts must not load.
function Sparkline({ scores }) {
  if (scores.length < 2) return null;
  const w = 120;
  const h = 28;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = Math.max(1, max - min);
  const pts = scores.map((v, i) => `${(i / (scores.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="overflow-visible">
      <polyline points={pts} fill="none" stroke="var(--accent-velocity)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ReadinessBlock({ readiness, trend }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-eyebrow">Board readiness index</span>
      {readiness ? (
        <>
          <span className="text-display text-4xl text-textMain tabular-nums">
            {readiness.score}<span className="text-lg text-muted2">/100</span>
          </span>
          {trend?.scores?.length >= 2 && (
            <div className="flex items-center gap-2">
              <Sparkline scores={trend.scores} />
              {trend.delta !== null && (
                <span className="text-xs tabular-nums" style={{ color: trend.delta >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                  {trend.delta >= 0 ? '+' : '−'}{Math.abs(trend.delta)} this week
                </span>
              )}
            </div>
          )}
          {readiness.breakdown && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {BREAKDOWN.map(([key, label]) => (
                <div key={key} className="flex justify-between gap-2">
                  <dt className="text-muted2">{label}</dt>
                  <dd className="text-textMain tabular-nums">{readiness.breakdown[key] ?? 0}%</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      ) : (
        <Skeleton className="h-16 w-32" />
      )}
    </div>
  );
}

function PassBlock({ snapshot, loading }) {
  const projection = snapshot?.subjectForecasts;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-eyebrow">Pass probability</span>
      {snapshot ? (
        <>
          <span className="text-display text-4xl text-textMain tabular-nums">
            {Math.round((snapshot.passProbability ?? 0) * 100)}<span className="text-lg text-muted2">%</span>
          </span>
          <span className="text-xs text-muted2">
            {projection?.projectedGWA
              ? `Projected average ${projection.projectedGWA.mean.toFixed(1)}% under the PRC rule`
              : 'Under the PRC rule: 70% weighted average, no subject below 50%'}
          </span>
          {projection?.conditionalProbability >= 0.05 && (
            <span className="text-xs" style={{ color: 'var(--color-reeAmber)' }}>
              {Math.round(projection.conditionalProbability * 100)}% risk of a subject under the floor
            </span>
          )}
        </>
      ) : loading ? (
        <Skeleton className="h-16 w-32" />
      ) : (
        <span className="text-sm text-muted2">Forecast unavailable right now.</span>
      )}
    </div>
  );
}

function TargetBlock({ daily }) {
  const met = daily.done >= daily.target;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-eyebrow">Today’s target</span>
      <span className="text-display text-4xl text-textMain tabular-nums">
        {daily.done}<span className="text-lg text-muted2">/{daily.target}</span>
      </span>
      <ProgressIndicator value={Math.min(daily.done, daily.target)} max={daily.target} tone={met ? 'success' : 'velocity'} ariaLabel="Today's target progress" size="sm" />
      <span className="text-xs text-muted2">{met ? 'Target met — anything more is a bonus.' : 'Questions answered today across all subjects.'}</span>
    </div>
  );
}

export default function TodayPanel({ stats, readiness, uid, answered = 0 }) {
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const { snapshot, loading } = useForecast();
  const { summary: srs } = useSrsSummary({ enabled: isOnline });
  const daily = dailyProgress(stats);
  // One readiness snapshot per Manila day is recorded server-side; the last
  // 30 draw the trend.
  const [history, setHistory] = useState(null);
  useEffect(() => {
    if (!isOnline) return undefined;
    let live = true;
    fetchReadinessHistory().then((r) => { if (live) setHistory(r?.items || []); }).catch(() => {});
    return () => { live = false; };
  }, [isOnline]);
  const trend = readinessTrend(history);

  const actions = buildTodayActions({
    srs,
    forecast: snapshot,
    daily,
    examInDays: daysToExam(stats?.examDate),
  });

  return (
    <section aria-labelledby="today-heading" className="flex flex-col gap-4">
      <PlacementPrompt uid={uid} answered={answered} />

      <Card elevated glow grain className="p-5 sm:p-6 flex flex-col gap-6">
        <div>
          <span className="text-eyebrow">Today</span>
          <h2 id="today-heading" className="text-display text-xl sm:text-2xl text-textMain mt-1">Where you stand, and what to do next</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <ReadinessBlock readiness={readiness} trend={trend} />
          <PassBlock snapshot={snapshot} loading={loading} />
          <TargetBlock daily={daily} />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-eyebrow">Next best actions</h3>
          <ol className="flex flex-col gap-2">
            {actions.map((a, i) => (
              <li key={a.key} className="flex items-center gap-3 p-3 rounded-[var(--radius-default)] bg-surface2 border border-border">
                <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums bg-surface3 text-textMain">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-textMain">{a.title}</p>
                  <p className="text-xs text-muted2 line-clamp-2">{a.detail}</p>
                </div>
                {a.to ? (
                  <Button size="sm" variant="secondary" as={Link} to={a.to}>{a.cta}</Button>
                ) : (
                  <Button size="sm" variant={i === 0 ? 'primary' : 'secondary'} onClick={() => launchPractice(navigate, a.preset)}>
                    {a.cta}
                  </Button>
                )}
              </li>
            ))}
          </ol>
        </div>
      </Card>
    </section>
  );
}
