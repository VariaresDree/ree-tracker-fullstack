// src/features/today/TodayPanel.jsx
//
// The Today page, top to bottom: the one thing to do next (a hero card with a
// single Start), where the learner stands in three tiles (readiness index,
// PRC pass probability, today's target split by subject), and the rest of
// the shortlist, today's study-plan task included. The charts and breakdowns
// that used to follow it on the old dashboard live in Progress.
//
// It was one card holding all of that, with three equal 4xl numbers above a
// numbered list, so nothing said which was the thing to do; and the list
// reordered as each source arrived. The lead now waits until every source
// that can claim it has answered (or LEAD_WAIT_MS has passed).
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchReadinessHistory } from '../../services/dbQueries';
import { Badge, Card, CardTitle, CardWatermark, Button, Grid, Skeleton, ProgressIndicator, Sparkline } from '../../components/ui';
import { useForecast } from '../../hooks/useForecast';
import { useSrsSummary } from '../../hooks/useSrsSummary';
import { useCardReviewSummary } from '../../hooks/useCardReviewSummary';
import { useTodayLoop } from '../../hooks/useTodayLoop';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import PlacementPrompt from '../diagnostic/PlacementPrompt';
import { usePlacement } from '../diagnostic/usePlacement';
import FirstRunCard from '../onboarding/FirstRunCard';
import { isEarlyEstimate } from '../analytics/earlyEstimate';
import { forecastPlan } from '../exams/startingPlan';

const withSource = (plan, source) => (plan ? { ...plan, source } : null);
import { buildTodayActions, dailyProgress, daysToExam, readinessTrend } from './todayActions';
import { usePlanToday } from './usePlanToday';
import { launchPractice } from '../active-recall/presets';
import { apportionItems, DEFAULT_SYLLABUS_WEIGHTS } from '@ree/shared';
import { ArrowRight, CalendarCheck, Compass, Crosshair, Layers, RotateCcw, Shield, Target, Timer } from '../../components/ui/icons';

const BREAKDOWN = [
  // "Topics practised", not "Coverage": the syllabus checklist's coverage
  // (read and drilled) is a different number, shown on Progress › Syllabus.
  ['topicCoverage', 'Topics practised'],
  ['accuracyRate', 'Accuracy'],
  ['thetaNormalized', 'Ability'],
  ['consistency', 'Consistency'],
];

// Beside a number that is still mostly the starting guess (earlyEstimate.js).
const EarlyBadge = () => <Badge tone="signal">Early estimate</Badge>;

// A tile's heading: the eyebrow style, at the h2 level under the page's h1.
function TileTitle({ children, badge }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <h2 className="text-eyebrow">{children}</h2>
      {badge}
    </span>
  );
}

function ReadinessTile({ readiness, trend, settled, isOnline, early }) {
  return (
    <Card padding="md" className="flex flex-col gap-2 min-w-0">
      <TileTitle badge={readiness && early && <EarlyBadge />}>Board readiness index</TileTitle>
      {readiness ? (
        <>
          <span className="text-display text-4xl text-textMain tabular-nums">
            {readiness.score}<span className="text-lg text-muted2">/100</span>
          </span>
          {trend?.scores?.length >= 2 && (
            <div className="flex items-center gap-2">
              <Sparkline scores={trend.scores} />
              {trend.delta !== null && (
                <span className={`text-xs tabular-nums ${trend.delta >= 0 ? 'text-success' : 'text-danger'}`}>
                  {trend.delta >= 0 ? '+' : '−'}{Math.abs(trend.delta)} this week
                </span>
              )}
            </div>
          )}
          {readiness.breakdown && (
            <dl className="mt-auto pt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
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
    </Card>
  );
}

function PassTile({ snapshot, loading, isOnline, early }) {
  const projection = snapshot?.subjectForecasts;
  return (
    <Card padding="md" className="flex flex-col gap-2 min-w-0">
      <TileTitle badge={snapshot && early && <EarlyBadge />}>Pass probability</TileTitle>
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
            <span className="text-xs text-reeAmber-text">
              {Math.round(projection.conditionalProbability * 100)}% risk of a subject under the floor
            </span>
          )}
        </>
      ) : loading ? (
        <Skeleton className="h-16 w-32" />
      ) : (
        <span className="text-sm text-muted2">{isOnline ? 'Forecast unavailable right now.' : 'Unavailable offline.'}</span>
      )}
    </Card>
  );
}

// The day's target split by the PRC syllabus weights (the shared
// largest-remainder rule), so a reviewer sees which subject is behind.
const SUBJECT_ROWS = [
  ['Mathematics', 'dailyMath', 'var(--color-reeCyan)'],
  ['ESAS', 'dailyESAS', 'var(--color-reeAmber)'],
  ['EE', 'dailyEE', 'var(--color-reePurple)'],
];

// `leading`: the target is the hero's action, which already says how many
// are left, so the tile doesn't repeat it.
function TargetTile({ daily, leading }) {
  const met = daily.done >= daily.target;
  const remaining = daily.target - daily.done;
  const split = apportionItems(daily.target, DEFAULT_SYLLABUS_WEIGHTS);
  return (
    <Card padding="md" className="flex flex-col gap-2 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-eyebrow">Today’s target</h2>
        <Link to="/account#exam-plan" className="touch-target inline-flex items-center text-xs text-muted2 hover:text-textMain hover:underline underline-offset-2" aria-label="Change your daily target">Change</Link>
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
            <div key={label} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
              <dt className="text-muted2 flex justify-between gap-2 min-w-[5.5rem]">
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
      <span className="mt-auto text-xs text-muted2">
        {met ? 'Target met — anything more is a bonus.'
          : leading ? 'Split by the board’s subject weights.'
            : `${remaining} more to hit today’s target`}
      </span>
    </Card>
  );
}

// The hero's corner icon, by what the lead action is.
const LEAD_ICON = { loop: RotateCcw, srs: RotateCcw, cards: Layers, plan: CalendarCheck, fix: Crosshair, floor: Shield, start: Compass, target: Target, mock: Timer };

// How long the lead waits for a slow source before showing what it has. The
// backend wakes slowly on its free tier; a late reorder beats a blank hero.
const LEAD_WAIT_MS = 3500;

function ActionButton({ action, navigate, primary = false, size = 'sm', className }) {
  const variant = primary ? 'primary' : 'secondary';
  return action.to ? (
    <Button size={size} variant={variant} as={Link} to={action.to} className={className}>{action.cta}</Button>
  ) : (
    <Button size={size} variant={variant} className={className} onClick={() => launchPractice(navigate, action.preset)}>{action.cta}</Button>
  );
}

function LeadCard({ action, navigate }) {
  return (
    <Card as="section" variant="hero" aria-labelledby="today-lead" className="flex flex-col gap-3">
      <CardWatermark icon={LEAD_ICON[action.key] || Target} />
      <p className="text-eyebrow">Up next</p>
      <h2 id="today-lead" className="text-h2 text-textMain text-pretty [overflow-wrap:anywhere]">{action.title}</h2>
      <p className="text-sm text-muted2 max-w-prose">{action.detail}</p>
      <div className="pt-2">
        <ActionButton action={action} navigate={navigate} primary size="lg" className="w-full sm:w-auto" />
      </div>
    </Card>
  );
}

function LeadSkeleton() {
  return (
    <Card variant="hero" aria-busy="true" aria-label="Finding your next step" className="flex flex-col gap-3">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-full max-w-prose" />
      <Skeleton className="h-11 w-full sm:w-32 mt-2" />
    </Card>
  );
}

export default function TodayPanel({ stats, readiness, readinessSettled = false, uid, answered = 0, today }) {
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const { snapshot, loading } = useForecast();
  const { summary: srs, loading: srsLoading } = useSrsSummary({ enabled: isOnline });
  const cards = useCardReviewSummary({ enabled: isOnline });
  const loop = useTodayLoop({ enabled: isOnline });
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
  const [waitedOut, setWaitedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaitedOut(true), LEAD_WAIT_MS);
    return () => clearTimeout(t);
  }, []);
  const trend = readinessTrend(history);
  const placement = usePlacement({ uid, answered });
  const early = isEarlyEstimate({ snapshot, answered });
  // One onboarding card at a time: the placement prompt, then the exam plan.
  const placementCard = !!placement.status && placement.status.status !== 'completed' && !placement.dismissed
    && (placement.status.status === 'in_progress' || placement.isNew);

  const actions = buildTodayActions({
    loop,
    srs,
    cards,
    planTask,
    forecast: snapshot,
    daily,
    examInDays: daysToExam(stats?.examDate),
    start: placement.plan,
    // Past the placement test, where to start comes from the forecast once
    // it is trusted; until then (an early estimate, under 100 answers) the
    // placement test's own reading of the floor stands, so 30 to 99 answers
    // aren't left with neither.
    floor: early
      ? (placement.plan ? { ...placement.plan, source: 'placement' } : null)
      : withSource(forecastPlan(snapshot?.subjectForecasts), 'forecast'),
    answered,
  });

  // Every source that can put an action first: the loop, due reviews,
  // formula cards, the plan task, the forecast (a fix, a floor) and the
  // placement plan. Undefined means still loading.
  const settled = waitedOut || (
    loop !== undefined && cards !== undefined && planTask !== undefined
    && !srsLoading && !loading && placement.settled !== false
  );
  const [lead, ...rest] = actions;
  // The target tile already says how many are left, so the target action is
  // listed only when it leads.
  const also = rest.filter((a) => a.key !== 'target');

  return (
    <section aria-label="Today" className="flex flex-col gap-6">
      <PlacementPrompt status={placement.status} answered={answered} dismissed={placement.dismissed} onDismiss={placement.dismiss} />
      <FirstRunCard uid={uid} show={!stats?.examDate && placement.isNew && placement.settled && !placementCard} />

      {!settled ? <LeadSkeleton /> : lead && <LeadCard action={lead} navigate={navigate} />}

      {/* Three tiles side by side as soon as they fit (42rem): the cards
          grid reaches three only at 56rem, which left the third alone. */}
      <Grid kind="cards" className="@2xl:grid-cols-3">
        <ReadinessTile readiness={readiness} trend={trend} settled={readinessSettled} isOnline={isOnline} early={early} />
        <PassTile snapshot={snapshot} loading={loading} isOnline={isOnline} early={early} />
        <TargetTile daily={daily} leading={settled && lead?.key === 'target'} />
      </Grid>

      {settled && also.length > 0 && (
        <Card as="section" padding="md" aria-labelledby="today-also" className="flex flex-col gap-3">
          <CardTitle id="today-also">Also today</CardTitle>
          <ol className="flex flex-col gap-2">
            {also.map((a) => (
              <Card as="li" variant="inset" key={a.key} className="p-3 flex flex-wrap sm:flex-nowrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-textMain [overflow-wrap:anywhere]">{a.title}</p>
                  <p className="text-xs text-muted2 line-clamp-2">{a.detail}</p>
                </div>
                {/* Full width under the text on a phone, where a long title
                    squeezed the button to a sliver beside it. */}
                <ActionButton action={a} navigate={navigate} className="w-full sm:w-auto" />
              </Card>
            ))}
          </ol>
        </Card>
      )}

      <Link to="/progress" className="self-start inline-flex items-center gap-1.5 pointer-coarse:min-h-11 text-sm text-muted2 hover:text-textMain hover:underline underline-offset-2">
        Charts, topics and your study plan are in Progress <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
      </Link>
    </section>
  );
}
