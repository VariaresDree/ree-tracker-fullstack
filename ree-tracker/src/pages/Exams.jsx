// src/pages/Exams.jsx
//
// Every timed test in one place: mock boards (one subject, a mixed paper, the
// full three-section board, or a custom set), the Gauntlet ladder, battles
// with friends, the rankings, and your past sittings. These were split between a "Board Simulator"
// nav item behind a confirm modal and an "Arena" whose label said leaderboards
// but which opened on battles, with the Gauntlet hidden inside it.
// The exam runners keep their own URLs (/simulator, /gauntlet/:level,
// /battle/:id) and light Exams in the nav.
import { Suspense, useEffect, useState } from 'react';
import { lazy } from '../utils/lazyWithRetry';
import useTabParam from '../hooks/useTabParam';
import { Page, PageHeader, Tabs, TabPanel, Skeleton } from '../components/ui';
import ModeGuide from '../features/exams/ModeGuide';
import { Zap, Shield, Swords, Trophy, History, ScanLine, FileText } from '../components/ui/icons';
import { listAssignedExams } from '../features/assigned-exams/assignedExamsApi';
import ErrorBoundary from '../components/ErrorBoundary';
import MockBoardTab from '../features/exams/MockBoardTab';

// One chunk per tab: each was a section of the 700-line Arena page.
const GauntletTab = lazy(() => import('../features/exams/GauntletTab'));
// Exams the reviewer (the admin) posted from the question bank.
const AssignedExamsTab = lazy(() => import('../features/assigned-exams/AssignedExamsTab'));
const BattlesTab = lazy(() => import('../features/exams/BattlesTab'));
const RankingsTab = lazy(() => import('../features/exams/RankingsTab'));
// The mock-board ledger (score trend, verdicts, reviews). It was the last card
// on the old Dashboard.
const MockBoardAnalytics = lazy(() => import('../components/MockBoardAnalytics'));
// Mock boards printed on paper, their scanned answer sheets and results.
const PaperSetsTab = lazy(() => import('../features/paper-sets/PaperSetsTab'));

const TABS = [
  { id: 'mock', label: 'Mock board', icon: Zap },
  { id: 'assigned', label: 'Assigned', icon: FileText },
  { id: 'gauntlet', label: 'Gauntlet', icon: Shield },
  { id: 'battles', label: 'Battles', icon: Swords },
  { id: 'rankings', label: 'Rankings', icon: Trophy },
  { id: 'history', label: 'Past sittings', icon: History },
  { id: 'paper', label: 'Paper sets', icon: ScanLine },
];

// The mode guide's own names for the tabs it describes, so it can say
// "You're here".
const GUIDE_HERE = { mock: 'mock', gauntlet: 'gauntlet', battles: 'battles' };

// How many posted exams this learner hasn't sat yet, for the tab's badge.
function useNewAssigned() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let live = true;
    listAssignedExams().then((items) => { if (live) setCount(items.filter((e) => !e.mine).length); }, () => {});
    return () => { live = false; };
  }, []);
  return count;
}

export default function Exams() {
  const [tab, setTab] = useTabParam(TABS.map((t) => t.id), 'mock');
  const fresh = useNewAssigned();
  const tabs = TABS.map((t) => (t.id === 'assigned' && fresh > 0 ? { ...t, badge: `${fresh} new` } : t));

  return (
    <Page>
      <PageHeader title="Exams" />
      <ModeGuide folded here={GUIDE_HERE[tab]} />
      <Tabs id="exams" label="Exam types" active={tab} onChange={setTab} tabs={tabs} />

      <TabPanel id="exams" active={tab}>
      {tab === 'mock' ? (
        <MockBoardTab />
      ) : (
        <ErrorBoundary name="Exams" key={tab}>
          <Suspense fallback={<Skeleton className="h-64" />}>
            {tab === 'assigned' && <AssignedExamsTab />}
            {tab === 'gauntlet' && <GauntletTab />}
            {tab === 'battles' && <BattlesTab />}
            {tab === 'rankings' && <RankingsTab />}
            {tab === 'history' && <MockBoardAnalytics />}
            {tab === 'paper' && <PaperSetsTab />}
          </Suspense>
        </ErrorBoundary>
      )}
      </TabPanel>
    </Page>
  );
}
