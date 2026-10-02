// src/features/today/TodayPanel.jsx
//
// The dashboard's first screen: where the learner stands (readiness index,
// PRC pass probability, today's target) and an ordered shortlist of what to do
// next. Everything here already existed somewhere on the page — the readiness
// breakdown the API returned but nothing rendered, the forecast, the review
// queue — but the "what now?" answer was ~10 cards down on a phone.
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Skeleton, ProgressIndicator } from '../../components/ui';
import { useForecast } from '../../hooks/useForecast';
import { useSrsSummary } from '../../hooks/useSrsSummary';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import PlacementPrompt from '../diagnostic/PlacementPrompt';
import { buildTodayActions, dailyProgress, daysToExam } from './todayActions';

const BREAKDOWN = [
  ['topicCoverage', 'Coverage'],
  ['accuracyRate', 'Accuracy'],
  ['thetaNormalized', 'Ability'],
  ['consistency', 'Consistency'],
];

function ReadinessBlock({ readiness }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-eyebrow">Board readiness index</span>
      {readiness ? (
        <>
          <span className="text-display text-4xl text-textMain tabular-nums">
            {readiness.score}<span className="text-lg text-muted2">/100</span>
          </span>
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
          <ReadinessBlock readiness={readiness} />
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
                  <Button size="sm" variant={i === 0 ? 'primary' : 'secondary'} onClick={() => navigate('/review', { state: { preset: a.preset } })}>
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
