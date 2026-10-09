// src/pages/admin/Admin.jsx
//
// Content tools, in one place and out of the learners' way: the question bank
// (AI/PDF ingestion, manual entry, review queue, syllabus), the explanation
// review queue, formula-card management, and handout uploads. These used to sit
// inside learner pages — a Profile tab, a Materials tab, and the whole
// "Module Library" — with the AI ingestion visible to every learner.
// Reached through routes/AdminRoute; every tab body is lazy, so a learner's
// device never downloads any of it.
import { lazy, Suspense, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useTabParam from '../../hooks/useTabParam';
import { Page, PageHeader, Tabs, Skeleton } from '../../components/ui';
import { Library, ClipboardList, BookOpen, Cloud } from '../../components/ui/icons';
import ErrorBoundary from '../../components/ErrorBoundary';

const QuestionBank = lazy(() => import('./QuestionBank'));
const ExplanationReview = lazy(() => import('../../features/analytics/ExplanationReview'));
const ReferenceAdminV2 = lazy(() => import('../../features/reference/ReferenceAdminV2'));
const CloudVaultTab = lazy(() => import('../../features/materials/CloudVaultTab'));
const MaterialViewer = lazy(() => import('../../features/materials/MaterialViewer'));

const TABS = [
  { id: 'questions', label: 'Question bank', icon: Library },
  { id: 'explanations', label: 'Explanation review', icon: ClipboardList },
  { id: 'references', label: 'Formula cards', icon: BookOpen },
  { id: 'handouts', label: 'Handouts', icon: Cloud },
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
      <Tabs label="Admin sections" active={tab} onChange={setTab} tabs={TABS} />

      <ErrorBoundary name="Admin">
        <Suspense fallback={<TabFallback />}>
          {tab === 'questions' && <QuestionBank />}

          {tab === 'explanations' && <ExplanationReview />}

          {tab === 'references' && (
            <div>
              <div className="mb-6">
                <h2 className="text-display text-2xl text-textMain tracking-tight">Formula cards</h2>
                <p className="text-sm text-muted2 mt-1">Review AI-generated cards, create and re-categorize cards, manage cited sources, and keep the data debt at zero.</p>
              </div>
              <ReferenceAdminV2 />
            </div>
          )}

          {tab === 'handouts' && (viewingMaterial
            ? <MaterialViewer material={viewingMaterial} onClose={() => setViewingMaterial(null)} headingLevel={2} />
            : <CloudVaultTab currentUser={currentUser} isAdmin onViewMaterial={setViewingMaterial} />)}
        </Suspense>
      </ErrorBoundary>
    </Page>
  );
}
