// src/features/today/TodayPanel.jsx
//
// The Today page's one card: where the learner stands (readiness index, PRC
// pass probability, today's target split by subject) and an ordered shortlist
// of what to do next, today's study-plan task included. The charts and
// breakdowns that used to follow it on the old dashboard live in Progress.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchReadinessHistory } from '../../services/dbQueries';
import { Card, Button, Skeleton, ProgressIndicator, Sparkline } from '../../components/ui';
import { useForecast } from '../../hooks/useForecast';
import { useSrsSummary } from '../../hooks/useSrsSummary';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import PlacementPrompt from '../diagnostic/PlacementPrompt';
import { buildTodayActions, dailyProgress, daysToExam, readinessTrend } from './todayActions';
import { usePlanToday } from './usePlanToday';
import { launchPractice } from '../active-recall/presets';
import { apportionItems, DEFAULT_SYLLABUS_WEIGHTS } from '@ree/shared';
import { ArrowRight } from '../../components/ui/icons';

const BREAKDOWN = [
  // "Topics practised", not "Coverage": the syllabus checklist's coverage
  // (read and drilled) is a different number, shown on Progress › Syllabus.
  ['topicCoverage', 'Topics practised'],
  ['accuracyRate', 'Accuracy'],
  ['thetaNormalized', 'Ability'],
  ['consistency', 'Consistency'],
];

function ReadinessBlock({ readiness, trend, settled, isOnline }) {
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
      ) : settled ? (
        // Offline it never arrives; this used to stay a skeleton.
        <span className="text-sm text-muted2">{isOnline ? 'Readiness unavailable right now.' : 'Unavailable offline.'}</span>
      ) : (
        <Skeleton className="h-16 w-32" />
      )}
    </div>
  );
}

function PassBlock({ snapshot, loading, isOnline }) {
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
            <span className="text-xs" style={{ color: 'var(--color-reeAmber-text)' }}>
              {Math.round(projection.conditionalProbability * 100)}% risk of a subject under the floor
            </span>
          )}
        </>
      ) : loading ? (
        <Skeleton className="h-16 w-32" />
      ) : (
        <span className="text-sm text-muted2">{isOnline ? 'Forecast unavailable right now.' : 'Unavailable offline.'}</span>
      )}
    </div>
  );
}

// The day's target split by the PRC syllabus weights (the shared
// largest-remainder rule), so a reviewer sees which subject is behind.
const SUBJECT_ROWS = [
  ['Mathematics', 'dailyMath', 'var(--color-reeCyan)'],
  ['ESAS', 'dailyESAS', 'var(--color-reeAmber)'],
  ['EE', 'dailyEE', 'var(--color-reePurple)'],
];

function TargetBlock({ daily }) {
  const met = daily.done >= daily.target;
  const split = apportionItems(daily.target, DEFAULT_SYLLABUS_WEIGHTS);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-eyebrow">Today’s target</span>
        <Link to="/account#exam-plan" className="text-xs text-muted2 hover:text-textMain hover:underline underline-offset-2">Change</Link>
      </div>
      <span className="text-display text-4xl text-textMain tabular-nums">
        {daily.done}<span className="text-lg text-muted2">/{daily.target}</span>
      </span>
      <ProgressIndicator value={Math.min(daily.done, daily.target)} max={daily.target} tone={met ? 'success' : 'velocity'} ariaLabel="Today's target progress" size="sm" />
      <dl className="flex flex-col gap-1.5 text-xs mt-1">
        {SUBJECT_ROWS.map(([label, key, color]) => {
          const cur = daily.counts[key];
          const goal = split[label] || 0;
          return (
            <div key={label} className="grid grid-cols-[6.5rem_1fr] items-center gap-x-3 gap-y-1">
              <dt className="text-muted2 flex justify-between gap-2">
                <span>{label}</span>
                <span className="text-textMain tabular-nums">{cur}/{goal}</span>
              </dt>
              <dd>
                <ProgressIndicator value={Math.min(cur, goal)} max={goal || 1} color={color} size="sm" ariaLabel={`${label}: ${cur} of ${goal}`} />
              </dd>
            </div>
          );
        })}
      </dl>
      <span className="text-xs text-muted2">{met ? 'Target met — anything more is a bonus.' : 'Split by the board’s subject weights.'}</span>
    </div>
  );
}

export default function TodayPanel({ stats, readiness, readinessSettled = false, uid, answered = 0, today }) {
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const { snapshot, loading } = useForecast();
  const { summary: srs } = useSrsSummary({ enabled: isOnline });
  const planTask = usePlanToday({ enabled: isOnline });
  const daily = dailyProgress(stats, today);
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
    planTask,
    forecast: snapshot,
    daily,
    examInDays: daysToExam(stats?.examDate),
  });

  return (
    <section aria-labelledby="today-heading" className="flex flex-col gap-4">
      <PlacementPrompt uid={uid} answered={answered} />

      <Card elevated glow grain className="p-5 sm:p-6 flex flex-col gap-6">
        <h2 id="today-heading" className="text-display text-xl sm:text-2xl text-textMain">Where you stand, and what to do next</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <ReadinessBlock readiness={readiness} trend={trend} settled={readinessSettled} isOnline={isOnline} />
          <PassBlock snapshot={snapshot} loading={loading} isOnline={isOnline} />
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

        <Link to="/progress" className="self-start inline-flex items-center gap-1.5 text-sm text-muted2 hover:text-textMain hover:underline underline-offset-2">
          Charts, topics and your study plan are in Progress <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </Card>
    </section>
  );
}
