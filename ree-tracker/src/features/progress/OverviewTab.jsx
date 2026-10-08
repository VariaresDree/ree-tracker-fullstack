// src/features/progress/OverviewTab.jsx
//
// Progress → Overview: the headline numbers, the ability trend, the PRC-rule
// board forecast, and the AI board report. These were the old Dashboard's
// middle cards.
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, KpiTile, Panel, SegmentedControl } from '../../components/ui';
import { ArrowRight, AudioWaveform, Flame, Gauge, ListChecks, Timer } from '../../components/ui/icons';
import { SkeletonChart } from '../../components/SkeletonLoaders';
import { TrajectoryCard } from '../analytics/TrajectoryCard';
import AiBoardReport from './AiBoardReport';

// Recharts is the heaviest dependency here; the KPIs paint before it arrives.
const ThetaVelocityChart = lazy(() => import('../../components/ThetaVelocityChart'));

const RANGES = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export default function OverviewTab({ stats, kpi }) {
  const [range, setRange] = useState('day');
  const theta = Number(stats?.irt?.theta || 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted2">Your results across every practice session and mock board.</p>
        <AiBoardReport stats={stats} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 stagger-fade-in">
        <KpiTile icon={Gauge} tone="success" label="Accuracy" value={kpi.accuracy} suffix="%" />
        <KpiTile icon={ListChecks} tone="signal" label="Questions answered" value={kpi.answered} />
        <KpiTile icon={Timer} tone="signal" label="Average time per question" value={kpi.avgSec} precision={1} suffix="s" />
        <KpiTile icon={Flame} tone="amber" label="Day streak" value={kpi.streak} hint="days" iconGlow={kpi.streak > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Panel
          icon={AudioWaveform}
          eyebrow="Ability"
          title="Ability trend (θ)"
          className="lg:col-span-2 grain-overlay"
          bodyClassName="h-[260px] sm:h-[300px]"
          action={
            <div className="flex items-center gap-2">
              <Badge tone="velocity" className="hidden sm:inline-flex tabular-nums">θ {theta.toFixed(2)}</Badge>
              <SegmentedControl size="sm" label="Time range" value={range} onChange={setRange} options={RANGES} />
            </div>
          }
        >
          <Suspense fallback={<SkeletonChart />}>
            <ThetaVelocityChart history={stats?.thetaHistory} range={range} />
          </Suspense>
        </Panel>
        <TrajectoryCard />
      </div>

      <Link
        to="/exams?tab=history"
        className="self-start inline-flex items-center gap-1.5 text-sm text-muted2 hover:text-textMain hover:underline underline-offset-2"
      >
        Your past mock sittings are in Exams <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
      </Link>
    </div>
  );
}
