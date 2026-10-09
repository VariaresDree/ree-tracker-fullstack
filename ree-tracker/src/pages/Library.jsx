// src/pages/Library.jsx
//
// The learner's study material in one place: formula cards, handouts,
// bookmarked questions and imported quizzes. (This was "Materials Hub"; the old
// "Module Library" was the question-bank authoring tool and moved to Admin.)
// Handouts are read-only here — uploading and organising them is an Admin tab.
// The tab lives in ?tab=; an old /materials deep link arrives with
// { search, kind } state for the formula cards (routes/legacyRoutes.js).
import { lazy, Suspense, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
  // An open handout is in the URL (?material=<id>), pushed: Back closes it
  // (it used to leave Library), and a reload or a shared link reopens it once
  // the handouts have loaded.
  const [params, setParams] = useSearchParams();
  const materialId = params.get('material');
  const navigate = useNavigate();
  const [viewingMaterial, setViewingMaterial] = useState(null);
  // Whether this visit pushed the ?material= entry: then Close is Back, so
  // the history doesn't fill with copies of the list.
  const pushedRef = useRef(false);
  const openMaterial = (m) => {
    setViewingMaterial(m);
    if (String(m.id) !== materialId) {
      pushedRef.current = true;
      setParams((prev) => { const p = new URLSearchParams(prev); p.set('tab', 'handouts'); p.set('material', String(m.id)); return p; });
    }
  };
  const closeMaterial = () => {
    setViewingMaterial(null);
    if (pushedRef.current) { pushedRef.current = false; navigate(-1); return; }
    setParams((prev) => { const p = new URLSearchParams(prev); p.delete('material'); return p; }, { replace: true });
  };

  if (viewingMaterial && materialId && String(viewingMaterial.id) === materialId) {
    return <MaterialViewer material={viewingMaterial} onClose={closeMaterial} />;
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
        <CloudVaultTab currentUser={currentUser} isAdmin={false} onViewMaterial={openMaterial} openMaterialId={materialId} />
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
