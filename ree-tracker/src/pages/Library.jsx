// src/pages/Library.jsx
//
// The learner's study material in one place: formula cards, handouts,
// bookmarked questions, the Notebook (mistakes and notes) and imported quizzes. (This was "Materials Hub"; the old
// "Module Library" was the question-bank authoring tool and moved to Admin.)
// Handouts are read-only here — uploading and organising them is an Admin tab.
// The tab lives in ?tab=; an old /materials deep link arrives with
// { search, kind } state for the formula cards (routes/legacyRoutes.js), or
// { subject, topic } to open them at a topic (features/reference/topicCards.js).
import { Suspense, useRef, useState } from 'react';
import { lazy } from '../utils/lazyWithRetry';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import useTabParam from '../hooks/useTabParam';
import { Page, PageHeader, Tabs, TabPanel, Skeleton } from '../components/ui';
import { Cloud, BookOpen, Bookmark, FileUp, NotebookPen, ArrowUpRight } from '../components/ui/icons';
import ErrorBoundary from '../components/ErrorBoundary';

import BookmarkVaultTab from '../features/vault/BookmarkVaultTab';
import NotebookTab from '../features/notebook/NotebookTab';
import CloudVaultTab from '../features/materials/CloudVaultTab';
import ReferenceBrowser from '../features/reference/ReferenceBrowser';
import MaterialViewer from '../features/materials/MaterialViewer';

// Lazy, not eagerly imported like the tabs above: this pulls in fflate and
// the CAQ parser, which most Library visitors will never touch.
const QuizLauncherTab = lazy(() => import('../features/quiz-launcher/QuizLauncherTab'));
// The learner's own links (CELE round): lazy, like the quizzes.
const LinksTab = lazy(() => import('../features/links/LinksTab'));

const TABS = [
  { id: 'formulas', label: 'Formula cards', icon: BookOpen },
  { id: 'handouts', label: 'Handouts', icon: Cloud },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'notebook', label: 'Notebook', icon: NotebookPen },
  { id: 'links', label: 'Links', icon: ArrowUpRight },
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
      <PageHeader title="Library" subtitle="Your study material in one place: formula cards, handouts, bookmarked questions, your mistakes and notes, your own links, and imported quizzes." />

      <Tabs id="library" label="Library sections" active={tab} onChange={setTab} tabs={TABS} />

      <TabPanel id="library" active={tab}>
      {tab === 'formulas' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4">
          {/* The tab and the location trail below already say "Formula cards":
              no visible title repeating them. The heading stays for screen
              readers' heading list, and the topic headings of "All cards"
              (h3) sit under it. */}
          <h2 className="sr-only">Formula cards</h2>
          <p className="text-muted2 text-sm max-w-prose">
            Every constant, formula and concept as a flip card. Open a subject to see all of its cards on one page,
            or narrow it down by topic and subtopic. Search finds any card directly.
          </p>
          <ReferenceBrowser
            // A new deep link opens afresh, even with Formula cards already open.
            key={deepLink.topic ? `${deepLink.subject}|${deepLink.topic}` : deepLink.search || 'browse'}
            initialSearch={deepLink.search || ''}
            initialKind={deepLink.kind || 'all'}
            initialSubject={deepLink.subject || null}
            initialTopic={deepLink.topic || null}
          />
        </div>
      )}

      {tab === 'handouts' && (
        <CloudVaultTab currentUser={currentUser} isAdmin={false} onViewMaterial={openMaterial} openMaterialId={materialId} />
      )}

      {tab === 'bookmarks' && (
        <BookmarkVaultTab currentUser={currentUser} isOnline={isOnline} />
      )}

      {tab === 'notebook' && (
        <NotebookTab currentUser={currentUser} isOnline={isOnline} />
      )}

      {tab === 'links' && (
        <ErrorBoundary name="Links">
          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            <LinksTab />
          </Suspense>
        </ErrorBoundary>
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
