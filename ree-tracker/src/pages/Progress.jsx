// src/pages/Progress.jsx
//
// How you're doing, in one place, one question per tab:
//   Overview    — headline numbers, ability trend, board forecast, AI report
//   Topics      — mastery per subtopic, accuracy per subject
//   Weak spots  — blind spots, time sinks, recommended fixes, the drills
//   Confidence  — does confidence match accuracy?
//   Habits      — study calendar, study time, time per question
//   Study plan  — the planner
// These were spread over the old Dashboard, Profile's "Comparative analytics"
// and "Deep analytics", and the planner. The tab lives in ?tab=, and each tab
// is its own chunk, so recharts loads only where a chart is drawn.
import { lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useTabParam from '../hooks/useTabParam';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { PageHeader, Tabs, Skeleton } from '../components/ui';
import { CalendarDays, ClipboardList, Crosshair, Gauge, LayoutGrid, Target } from '../components/ui/icons';
import ErrorBoundary from '../components/ErrorBoundary';

const OverviewTab = lazy(() => import('../features/progress/OverviewTab'));
const TopicsTab = lazy(() => import('../features/progress/TopicsTab'));
const WeakSpotsTab = lazy(() => import('../features/progress/WeakSpotsTab'));
const ConfidenceTab = lazy(() => import('../features/progress/ConfidenceTab'));
const HabitsTab = lazy(() => import('../features/progress/HabitsTab'));
const StrategicPlannerTab = lazy(() => import('../features/profile/StrategicPlannerTab'));

const TABS = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'topics', label: 'Topics', icon: LayoutGrid },
  { id: 'weak-spots', label: 'Weak spots', icon: Crosshair },
  { id: 'confidence', label: 'Confidence', icon: Target },
  { id: 'habits', label: 'Habits', icon: CalendarDays },
  { id: 'plan', label: 'Study plan', icon: ClipboardList },
];

const TabSkeleton = () => (
  <div role="status" aria-live="polite" className="flex flex-col gap-4">
    <span className="sr-only">Loading…</span>
    <Skeleton className="h-28" />
    <Skeleton className="h-64" />
  </div>
);

function TabBody({ tab, stats, kpi, currentUser }) {
  switch (tab) {
    case 'topics': return <TopicsTab stats={stats} />;
    case 'weak-spots': return <WeakSpotsTab />;
    case 'confidence': return <ConfidenceTab stats={stats} />;
    case 'habits': return <HabitsTab stats={stats} />;
    case 'plan': return <StrategicPlannerTab currentUser={currentUser} />;
    default: return <OverviewTab stats={stats} kpi={kpi} />;
  }
}

// Tabs that draw from the dashboard aggregate wait for it; the rest fetch
// their own data and can start at once.
const NEEDS_STATS = new Set(['overview', 'topics', 'confidence', 'habits']);

export default function Progress() {
  const { currentUser } = useAuth();
  const { activeStats, loading, kpi } = useDashboardStats();
  const [tab, setTab] = useTabParam(TABS.map((t) => t.id), 'overview');
  const label = TABS.find((t) => t.id === tab)?.label;

  return (
    <div className="flex flex-col gap-6 page-fade-in pb-12 w-full max-w-6xl mx-auto">
      <PageHeader title="Progress" subtitle="How your readiness is moving, topic by topic, and your study plan." />
      <Tabs label="Progress sections" active={tab} onChange={setTab} tabs={TABS} />

      {currentUser && (
        <ErrorBoundary name={`Progress: ${label}`} key={tab}>
          {loading && NEEDS_STATS.has(tab) ? (
            <TabSkeleton />
          ) : (
            <Suspense fallback={<TabSkeleton />}>
              <TabBody tab={tab} stats={activeStats} kpi={kpi} currentUser={currentUser} />
            </Suspense>
          )}
        </ErrorBoundary>
      )}
    </div>
  );
}
