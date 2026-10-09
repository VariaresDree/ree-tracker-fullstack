// src/pages/Library.jsx
//
// The learner's study material in one place: formula cards, handouts,
// bookmarked questions and imported quizzes. (This was "Materials Hub"; the old
// "Module Library" was the question-bank authoring tool and moved to Admin.)
// Handouts are read-only here — uploading and organising them is an Admin tab.
// The tab lives in ?tab=; an old /materials deep link arrives with
// { search, kind } state for the formula cards (routes/legacyRoutes.js).
import { lazy, Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import useTabParam from '../hooks/useTabParam';
import { Page, PageHeader, Tabs, TabPanel, Skeleton } from '../components/ui';
import { Cloud, BookOpen, Bookmark, FileUp } from '../components/ui/icons';
import ErrorBoundary from '../components/ErrorBoundary';

import BookmarkVaultTab from '../features/vault/BookmarkVaultTab';
import CloudVaultTab from '../features/materials/CloudVaultTab';
import ReferenceBrowser from '../features/reference/ReferenceBrowser';
import MaterialViewer from '../features/materials/MaterialViewer';

// Lazy, not eagerly imported like the tabs above: this pulls in fflate and
// the CAQ parser, which most Library visitors will never touch.
const QuizLauncherTab = lazy(() => import('../features/quiz-launcher/QuizLauncherTab'));

const TABS = [
  { id: 'formulas', label: 'Formula cards', icon: BookOpen },
  { id: 'handouts', label: 'Handouts', icon: Cloud },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'quizzes', label: 'Imported quizzes', icon: FileUp },
];

export default function Library() {
  const { currentUser } = useAuth();
  const isOnline = useNetworkStatus();
  const [tab, setTab] = useTabParam(TABS.map((t) => t.id), 'formulas');

  const location = useLocation();
  const deepLink = location.state || {};
  const [viewingMaterial, setViewingMaterial] = useState(null);

  if (viewingMaterial) {
    return <MaterialViewer material={viewingMaterial} onClose={() => setViewingMaterial(null)} />;
  }

  return (
    <Page>
      <PageHeader title="Library" subtitle="Formula cards, handouts, the questions you bookmarked, and quizzes you imported." />

      <Tabs id="library" label="Library sections" active={tab} onChange={setTab} tabs={TABS} />

      <TabPanel id="library" active={tab}>
      {tab === 'formulas' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <p className="text-sm text-muted2 mb-6">Constants, formulas and concepts as flip cards. Browse by subject, topic and subtopic, or search directly.</p>
          <ReferenceBrowser initialSearch={deepLink.search || ''} initialKind={deepLink.kind || 'all'} />
        </div>
      )}

      {tab === 'handouts' && (
        <CloudVaultTab currentUser={currentUser} isAdmin={false} onViewMaterial={setViewingMaterial} />
      )}

      {tab === 'bookmarks' && (
        <BookmarkVaultTab currentUser={currentUser} isOnline={isOnline} />
      )}

      {tab === 'quizzes' && (
        <ErrorBoundary name="Imported quizzes">
          <Suspense fallback={<div className="flex flex-col gap-3"><Skeleton className="h-40" /><Skeleton className="h-16" /></div>}>
            <QuizLauncherTab />
          </Suspense>
        </ErrorBoundary>
      )}
      </TabPanel>
    </Page>
  );
}
