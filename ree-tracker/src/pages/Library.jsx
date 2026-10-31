// src/pages/Library.jsx
//
// The learner's study material in one place, in this order (2026-10-31):
// Handouts (with the learner's own links under them), Formula cards, Unit
// conversion (coming next), Notebook, Bookmarks and Imported quizzes. (This
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
import { Page, PageHeader, Tabs, TabPanel, Skeleton, EmptyState } from '../components/ui';
import { Cloud, BookOpen, Bookmark, FileUp, NotebookPen, ArrowLeftRight } from '../components/ui/icons';
import ErrorBoundary from '../components/ErrorBoundary';

import BookmarkVaultTab from '../features/vault/BookmarkVaultTab';
import NotebookTab from '../features/notebook/NotebookTab';
import CloudVaultTab from '../features/materials/CloudVaultTab';
import ReferenceBrowser from '../features/reference/ReferenceBrowser';
import MaterialViewer from '../features/materials/MaterialViewer';

// Lazy, not eagerly imported like the tabs above: this pulls in fflate and
// the CAQ parser, which most Library visitors will never touch.
const QuizLauncherTab = lazy(() => import('../features/quiz-launcher/QuizLauncherTab'));
// The learner's own links (CELE round), under the handouts: lazy, like the quizzes.
const LinksTab = lazy(() => import('../features/links/LinksTab'));

const TABS = [
  { id: 'handouts', label: 'Handouts', icon: Cloud },
  { id: 'formulas', label: 'Formula cards', icon: BookOpen },
  { id: 'conversion', label: 'Unit conversion', icon: ArrowLeftRight, badge: 'Soon' },
  { id: 'notebook', label: 'Notebook', icon: NotebookPen },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'quizzes', label: 'Imported quizzes', icon: FileUp },
];

export default function Library() {
  const { currentUser } = useAuth();
  const isOnline = useNetworkStatus();
  const location = useLocation();
  const deepLink = location.state || {};
  // Library opens on Handouts. A deep link into the formula cards (a search,
  // or a topic) that names no tab still opens them, and the old Links tab
  // (?tab=links) is now the "Your links" part of Handouts.
  const toCards = !!(deepLink.search || deepLink.topic);
  const [tab, setTab] = useTabParam(TABS.map((t) => t.id), toCards ? 'formulas' : 'handouts');
  // An open handout is in the URL (?material=<id>), pushed: Back closes it
  // (it used to leave Library), and a reload or a shared link reopens it once
  // the handouts have loaded.
  const [params, setParams] = useSearchParams();
  const materialId = params.get('material');
  const wantsLinks = params.get('tab') === 'links' || params.get('view') === 'links';
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

  if (viewingMaterial && materialId && String(viewingMaterial.id) === materialId) {
    return <MaterialViewer material={viewingMaterial} onClose={closeMaterial} />;
  }

  return (
    <Page>
      <PageHeader title="Library" subtitle="Your study material in one place: handouts and your own links, formula cards, your mistakes and notes, bookmarked questions, and imported quizzes." />

      <Tabs id="library" label="Library sections" active={tab} onChange={setTab} tabs={TABS} />

      <TabPanel id="library" active={tab}>
      {tab === 'formulas' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4">
          {/* The tab and the location trail below already say "Formula cards":
              no visible title repeating them. The heading stays for screen
              readers' heading list, and the topic headings of the quick
              sheet (h3) sit under it. */}
          <h2 className="sr-only">Formula cards</h2>
          <p className="text-muted2 text-sm max-w-prose">
            The formulas and constants for Math, ESAS and EE. Open a subject, then a topic, and flip the cards,
            or switch to its quick sheet to see every one at a glance.
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

      {tab === 'conversion' && (
        <div className="animate-in fade-in">
          <h2 className="sr-only">Unit conversion</h2>
          <EmptyState
            icon={ArrowLeftRight}
            title="Unit conversion is coming next"
            description="Convert between the units board problems mix: kW, hp and BTU/h; kcmil, mm² and AWG; °C, °F and K; per-unit values on a new base. It will work offline, on this device."
          />
        </div>
      )}

      {tab === 'bookmarks' && (
        <BookmarkVaultTab currentUser={currentUser} isOnline={isOnline} />
      )}

      {tab === 'notebook' && (
        <NotebookTab currentUser={currentUser} isOnline={isOnline} />
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
