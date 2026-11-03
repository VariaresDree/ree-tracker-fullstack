// src/pages/admin/Admin.jsx
//
// Content tools, in one place and out of the learners' way: the question bank
// (AI/PDF ingestion, manual entry, review queue, syllabus), the explanation
// review queue, formula-card management, the syllabus (topics, the board's items
// per topic, suggested subtopics), handout uploads, and the AI model
// status (which model answers each AI feature, and whether it is healthy), and
// app health (versions in use, errors people hit). These used to sit
// inside learner pages — a Profile tab, a Materials tab, and the whole
// "Module Library" — with the AI ingestion visible to every learner.
// Reached through routes/AdminRoute; every tab body is lazy, so a learner's
// device never downloads any of it.
import { Suspense, useState } from 'react';
import { lazy } from '../../utils/lazyWithRetry';
import { useAuth } from '../../contexts/AuthContext';
import useTabParam from '../../hooks/useTabParam';
import { Page, PageHeader, Tabs, TabPanel, Skeleton } from '../../components/ui';
import { Library, ClipboardList, BookOpen, Cloud, Activity, ShieldCheck, ListChecks } from '../../components/ui/icons';
import ErrorBoundary from '../../components/ErrorBoundary';

const QuestionBank = lazy(() => import('./QuestionBank'));
const ExplanationReview = lazy(() => import('../../features/analytics/ExplanationReview'));
const ReferenceAdminV2 = lazy(() => import('../../features/reference/ReferenceAdminV2'));
const CloudVaultTab = lazy(() => import('../../features/materials/CloudVaultTab'));
const MaterialViewer = lazy(() => import('../../features/materials/MaterialViewer'));
const SyllabusAdmin = lazy(() => import('../../features/admin/syllabus/SyllabusAdmin'));
const AiStatusPanel = lazy(() => import('../../features/admin/ai/AiStatusPanel'));
const AppHealthPanel = lazy(() => import('../../features/admin/health/AppHealthPanel'));

const TABS = [
  { id: 'questions', label: 'Question bank', icon: Library },
  { id: 'explanations', label: 'Explanation review', icon: ClipboardList },
  { id: 'references', label: 'Formula cards', icon: BookOpen },
  { id: 'syllabus', label: 'Syllabus', icon: ListChecks },
  { id: 'handouts', label: 'Handouts', icon: Cloud },
  { id: 'ai', label: 'AI models', icon: Activity },
  { id: 'health', label: 'App health', icon: ShieldCheck },
];

const TabFallback = () => (
  <div className="flex flex-col gap-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64" /></div>
);

export default function Admin() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useTabParam(TABS.map((t) => t.id), 'questions');
  const [viewingMaterial, setViewingMaterial] = useState(null);

  return (
    <Page>
      <PageHeader title="Admin" subtitle="Content tools. Only admins see this area." />
      <Tabs id="admin" label="Admin sections" active={tab} onChange={setTab} tabs={TABS} />

      <TabPanel id="admin" active={tab}>
      <ErrorBoundary name="Admin">
        <Suspense fallback={<TabFallback />}>
          {tab === 'questions' && <QuestionBank />}

          {tab === 'explanations' && <ExplanationReview />}

          {/* No title of its own: the "Formula cards" tab above already names
              it, and a second "Formula cards" heading repeated it. */}
          {tab === 'references' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted2">Review AI-generated cards, create and re-categorize cards, manage cited sources, and keep the data debt at zero.</p>
              <ReferenceAdminV2 />
            </div>
          )}

          {tab === 'syllabus' && <SyllabusAdmin />}

          {tab === 'handouts' && <CloudVaultTab currentUser={currentUser} isAdmin onViewMaterial={setViewingMaterial} />}

          {tab === 'ai' && <AiStatusPanel />}

          {tab === 'health' && <AppHealthPanel />}
        </Suspense>
      </ErrorBoundary>
      </TabPanel>

      {/* Over the list, with its own boundary: the first open loads this chunk, and
          sharing the tabs' Suspense would swap the list for a skeleton and lose its
          scroll. */}
      {tab === 'handouts' && viewingMaterial && (
        <Suspense fallback={null}>
          <MaterialViewer material={viewingMaterial} onClose={() => setViewingMaterial(null)} />
        </Suspense>
      )}
    </Page>
  );
}
