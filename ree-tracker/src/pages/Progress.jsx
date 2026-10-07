// src/pages/Progress.jsx
//
// Where you stand and how you're trending: analytics, rankings and your study
// plan, gathered from where they used to hide (Profile's "Comparative
// analytics", "Deep analytics" and "Planner" tabs). The tab lives in ?tab=.
import { lazy, Suspense, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import useTabParam from '../hooks/useTabParam';
import { syncDashboardStats } from '../services/analyticsSync';
import { PageHeader, Tabs, Skeleton } from '../components/ui';
import { Activity, BarChart3, CalendarDays } from '../components/ui/icons';
import ErrorBoundary from '../components/ErrorBoundary';
import ComparativeAnalyticsTab from '../features/profile/ComparativeAnalyticsTab';
import StrategicPlannerTab from '../features/profile/StrategicPlannerTab';

const AnalyticsDeepDive = lazy(() => import('../features/analytics/AnalyticsDeepDive'));

const TABS = [
  { id: 'analytics', label: 'Analytics', icon: Activity },
  { id: 'standing', label: 'Standing & streak', icon: BarChart3 },
  { id: 'plan', label: 'Study plan', icon: CalendarDays },
];

export default function Progress() {
  const { currentUser } = useAuth();
  const { stats, setStats } = useStore(useShallow((s) => ({ stats: s.stats, setStats: s.setStats })));
  const [tab, setTab] = useTabParam(TABS.map((t) => t.id), 'analytics');

  // The streak, calendar and milestones read store stats; hydrate them from
  // the server aggregate like Today does, so a new device isn't blank.
  useEffect(() => {
    if (currentUser?.uid && navigator.onLine) syncDashboardStats(currentUser.uid).catch(() => {});
  }, [currentUser?.uid]);

  return (
    <div className="flex flex-col gap-6 page-fade-in pb-12 w-full max-w-6xl mx-auto pt-4">
      <PageHeader title="Progress" subtitle="How your readiness is moving, where you stand, and your study plan." />
      <Tabs label="Progress sections" active={tab} onChange={setTab} tabs={TABS} />

      {tab === 'analytics' && (
        <ErrorBoundary name="Analytics">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <AnalyticsDeepDive />
          </Suspense>
        </ErrorBoundary>
      )}
      {tab === 'standing' && <ComparativeAnalyticsTab currentUser={currentUser} stats={stats} />}
      {tab === 'plan' && <StrategicPlannerTab currentUser={currentUser} stats={stats} setStats={setStats} />}
    </div>
  );
}
