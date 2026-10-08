// src/pages/Exams.jsx
//
// Every timed test in one place: mock boards (one subject, a mixed paper, the
// full three-section board, or a custom set), the Gauntlet ladder, battles
// with friends, the rankings, and your past sittings. These were split between a "Board Simulator"
// nav item behind a confirm modal and an "Arena" whose label said leaderboards
// but which opened on battles, with the Gauntlet hidden inside it.
// The exam runners keep their own URLs (/simulator, /gauntlet/:level,
// /battle/:id) and light Exams in the nav.
import { lazy, Suspense } from 'react';
import useTabParam from '../hooks/useTabParam';
import { PageHeader, Tabs, Skeleton } from '../components/ui';
import { Zap, Shield, Swords, Trophy, History } from '../components/ui/icons';
import ErrorBoundary from '../components/ErrorBoundary';
import MockBoardTab from '../features/exams/MockBoardTab';

// One chunk per tab: each was a section of the 700-line Arena page.
const GauntletTab = lazy(() => import('../features/exams/GauntletTab'));
const BattlesTab = lazy(() => import('../features/exams/BattlesTab'));
const RankingsTab = lazy(() => import('../features/exams/RankingsTab'));
// The mock-board ledger (score trend, verdicts, reviews). It was the last card
// on the old Dashboard.
const MockBoardAnalytics = lazy(() => import('../components/MockBoardAnalytics'));

const TABS = [
  { id: 'mock', label: 'Mock board', icon: Zap },
  { id: 'gauntlet', label: 'Gauntlet', icon: Shield },
  { id: 'battles', label: 'Battles', icon: Swords },
  { id: 'rankings', label: 'Rankings', icon: Trophy },
  { id: 'history', label: 'Past sittings', icon: History },
];

export default function Exams() {
  const [tab, setTab] = useTabParam(TABS.map((t) => t.id), 'mock');

  return (
    <div className="flex flex-col gap-6 page-fade-in pb-12 w-full max-w-5xl mx-auto pt-4">
      <PageHeader title="Exams" subtitle="Timed tests under board conditions: mock boards, the Gauntlet ladder, and battles with friends." />
      <Tabs label="Exam types" active={tab} onChange={setTab} tabs={TABS} />

      {tab === 'mock' ? (
        <MockBoardTab />
      ) : (
        <ErrorBoundary name="Exams" key={tab}>
          <Suspense fallback={<Skeleton className="h-64" />}>
            {tab === 'gauntlet' && <GauntletTab />}
            {tab === 'battles' && <BattlesTab />}
            {tab === 'rankings' && <RankingsTab />}
            {tab === 'history' && <MockBoardAnalytics />}
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
