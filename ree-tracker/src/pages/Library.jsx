// src/pages/Library.jsx
//
// The learner's study material in one place, in the owner's order (2026-11-16):
// Handouts (with the learner's own links under them), My files, Quizzes, Lessons
// (a summary of every topic and subtopic), Formula cards, Units and tools,
// Notebook and Bookmarks. (This
// was "Materials Hub"; the old "Module Library" was the question-bank
// authoring tool and moved to Admin.) Handouts are read-only here; uploading
// and organising them is an Admin tab.
// The tab lives in ?tab=; an old /materials deep link arrives with
// { search, kind } state for the formula cards (routes/legacyRoutes.js), or
// { subject, topic } to open them at a topic (features/reference/topicCards.js).
import { Suspense, useEffect, useRef, useState } from 'react';
import { lazy } from '../utils/lazyWithRetry';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import useTabParam from '../hooks/useTabParam';
import { Page, PageHeader, Tabs, TabPanel, Skeleton } from '../components/ui';
import { Cloud, BookOpen, Bookmark, Calculator, FileUp, FolderOpen, GraduationCap, NotebookPen } from '../components/ui/icons';
import ErrorBoundary from '../components/ErrorBoundary';

import BookmarkVaultTab from '../features/vault/BookmarkVaultTab';
import NotebookTab from '../features/notebook/NotebookTab';
import CloudVaultTab from '../features/materials/CloudVaultTab';
import ReferenceBrowser from '../features/reference/ReferenceBrowser';
import MaterialViewer from '../features/materials/MaterialViewer';

// Lazy, not eagerly imported like the tabs above: this pulls in fflate and
// the CAQ parser, which most Library visitors will never touch.
const QuizLauncherTab = lazy(() => import('../features/quiz-launcher/QuizLauncherTab'));
const SharedQuizzes = lazy(() => import('../features/shared-quizzes/SharedQuizzes'));
// The learner's own links (CELE round), under the handouts: lazy, like the quizzes.
const LinksTab = lazy(() => import('../features/links/LinksTab'));
const ConversionTab = lazy(() => import('../features/conversion/ConversionTab'));
const MyFilesTab = lazy(() => import('../features/my-files/MyFilesTab'));
const LessonsTab = lazy(() => import('../features/lessons/LessonsTab'));

const TABS = [
  { id: 'handouts', label: 'Handouts', icon: Cloud },
  { id: 'files', label: 'My files', icon: FolderOpen },
  { id: 'quizzes', label: 'Quizzes', icon: FileUp },
  { id: 'lessons', label: 'Lessons', icon: GraduationCap },
  { id: 'formulas', label: 'Formula cards', icon: BookOpen },
  { id: 'conversion', label: 'Units and tools', icon: Calculator },
  { id: 'notebook', label: 'Notebook', icon: NotebookPen },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
];

export default function Library() {
  const { currentUser } = useAuth();
  const isOnline = useNetworkStatus();
  const location = useLocation();
  const deepLink = location.state || {};
  // Library opens on Handouts, the first tab. A deep link into the formula cards (a search,
  // or a topic) that names no tab still opens them, and the old Links tab
  // (?tab=links) is now the "Your links" part of Handouts.
  const toCards = !!(deepLink.search || deepLink.topic);
  // An open handout is in the URL (?material=<id>), pushed: Back closes it
  // (it used to leave Library), and a reload or a shared link reopens it once
  // the handouts have loaded.
  const [params, setParams] = useSearchParams();
  const materialId = params.get('material');
  const wantsLinks = params.get('tab') === 'links' || params.get('view') === 'links';
  const [tab, setTab] = useTabParam(TABS.map((t) => t.id), toCards ? 'formulas' : 'handouts');
  const linksRef = useRef(null);
  useEffect(() => {
    if (!wantsLinks || tab !== 'handouts') return undefined;
    // After the lazy section has had a moment to render.
    const t = setTimeout(() => linksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    return () => clearTimeout(t);
  }, [wantsLinks, tab]);
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

  return (
    <Page>
      {/* Over the list, never instead of it: the list keeps its folder and scroll. */}
      {viewingMaterial && materialId && String(viewingMaterial.id) === materialId && (
        <MaterialViewer material={viewingMaterial} onClose={closeMaterial} />
      )}

      <PageHeader title="Library" />

      <Tabs id="library" label="Library sections" active={tab} onChange={setTab} tabs={TABS} />

      <TabPanel id="library" active={tab}>
      {tab === 'formulas' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4">
          {/* The tab and the location trail below already say "Formula cards":
              no visible title repeating them. The heading stays for screen
              readers' heading list, and the topic headings of the quick
              sheet (h3) sit under it. */}
          <h2 className="sr-only">Formula cards</h2>
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

      {tab === 'lessons' && (
        <ErrorBoundary name="Lessons">
          <Suspense fallback={<div className="flex flex-col gap-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-40" /></div>}>
            <LessonsTab />
          </Suspense>
        </ErrorBoundary>
      )}

      {tab === 'handouts' && (
        <div className="flex flex-col gap-10">
          <CloudVaultTab currentUser={currentUser} isAdmin={false} onViewMaterial={openMaterial} openMaterialId={materialId} />
          {/* Your own links sit with the handouts: what your reviewer shares
              above, what you keep below. */}
          <div ref={linksRef} id="your-links" className="scroll-mt-24">
            <ErrorBoundary name="Your links">
              <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                <LinksTab embedded />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      )}

      {tab === 'bookmarks' && (
        <BookmarkVaultTab currentUser={currentUser} isOnline={isOnline} />
      )}

      {tab === 'notebook' && (
        <NotebookTab currentUser={currentUser} isOnline={isOnline} />
      )}

      {tab === 'files' && (
        <ErrorBoundary name="My files">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <MyFilesTab />
          </Suspense>
        </ErrorBoundary>
      )}

      {tab === 'conversion' && (
        <ErrorBoundary name="Units and tools">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <ConversionTab />
          </Suspense>
        </ErrorBoundary>
      )}

      {tab === 'quizzes' && (
        <ErrorBoundary name="Quizzes">
          <Suspense fallback={<div className="flex flex-col gap-3"><Skeleton className="h-40" /><Skeleton className="h-16" /></div>}>
            <QuizLauncherTab shared={<ErrorBoundary name="Shared quizzes"><Suspense fallback={null}><SharedQuizzes /></Suspense></ErrorBoundary>} />
          </Suspense>
        </ErrorBoundary>
      )}
      </TabPanel>
    </Page>
  );
}
