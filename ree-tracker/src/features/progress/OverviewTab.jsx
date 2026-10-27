// src/features/progress/OverviewTab.jsx
//
// Progress → Overview: the headline numbers, the ability trend, the PRC-rule
// board forecast, and the AI board report. These were the old Dashboard's
// middle cards.
//
// The four figures and the AI report sit in one hero, "Your review so far",
// with this week against last under the questions answered. They were a
// floating intro line and button above four separate tiles. No watermark:
// the report button fills its top corner and the figures its bottom one.
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, Grid, KpiTile, Panel, SegmentedControl } from '../../components/ui';
import { ArrowRight, AudioWaveform, Flame, Gauge, ListChecks, Timer } from '../../components/ui/icons';
import { SkeletonChart } from '../../components/SkeletonLoaders';
import { TrajectoryCard } from '../analytics/TrajectoryCard';
import AiBoardReport from './AiBoardReport';
import { weeklyAnswers } from './weeklyAnswers';

// Recharts is the heaviest dependency here; the KPIs paint before it arrives.
const ThetaVelocityChart = lazy(() => import('../../components/ThetaVelocityChart'));

const RANGES = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export default function OverviewTab({ stats, kpi, today }) {
  const [range, setRange] = useState('day');
  const theta = Number(stats?.irt?.theta || 0);
  const week = today ? weeklyAnswers(stats?.activityCalendar, today) : null;

  return (
    <div className="flex flex-col gap-6">
      <Card as="section" variant="hero" aria-labelledby="overview-lead" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex flex-col gap-1">
            <h2 id="overview-lead" className="text-h2 text-textMain">Your review so far</h2>
            <p className="text-sm text-muted2">Across every practice session and mock board.</p>
          </div>
          <AiBoardReport stats={stats} />
        </div>
        <Grid kind="kpi" className="stagger-fade-in">
          <KpiTile icon={Gauge} tone="success" label="Accuracy" value={kpi.accuracy} suffix="%" />
          <KpiTile
            icon={ListChecks}
            tone="signal"
            label="Questions answered"
            value={kpi.answered}
            hint={week ? `${week.thisWeek} this week · ${week.lastWeek} last week` : undefined}
          />
          <KpiTile icon={Timer} tone="signal" label="Average time per question" value={kpi.avgSec} precision={1} suffix="s" />
          <KpiTile icon={Flame} tone="amber" label="Day streak" value={kpi.streak} hint="days" iconGlow={kpi.streak > 0} />
        </Grid>
      </Card>

      <Grid kind="split" className="items-start">
        <Panel
          icon={AudioWaveform}
          eyebrow="Ability"
          title="Ability trend (θ)"
          className="@4xl:col-span-2"
          bodyClassName="h-[260px] sm:h-[300px]"
          action={
            <div className="flex items-center gap-2">
              <Badge tone="velocity" className="hidden sm:inline-flex tabular-nums">θ {theta.toFixed(2)}</Badge>
              <SegmentedControl size="sm" label="Time range" value={range} onChange={setRange} options={RANGES} />
            </div>
          }
        >
          <Suspense fallback={<SkeletonChart className="h-full" />}>
            <ThetaVelocityChart history={stats?.thetaHistory} range={range} />
          </Suspense>
        </Panel>
        <TrajectoryCard />
      </Grid>

      <Link
        to="/exams?tab=history"
        className="self-start inline-flex items-center gap-1.5 pointer-coarse:min-h-11 text-sm text-muted2 hover:text-textMain hover:underline underline-offset-2"
      >
        Your past mock sittings are in Exams <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
      </Link>
    </div>
  );
}
