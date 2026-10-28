// src/features/syllabus/ChecklistTab.jsx
//
// Progress › Syllabus: the two checklists of a review, one switch apart —
// **Topics** (the TOS topics read, watched and drilled) and **Sets** (the
// papers to get through, the CELE tracker's "Progress check"). The choice is
// in the URL (`?view=sets`), so it survives a reload and can be linked; the
// tab id stays `syllabus`.
import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SegmentedControl, Skeleton } from '../../components/ui';
import SyllabusTab from './SyllabusTab';

const SetsPanel = lazy(() => import('../sets/SetsPanel'));

const VIEWS = [
  { value: 'topics', label: 'Topics' },
  { value: 'sets', label: 'Sets' },
];

export default function ChecklistTab({ examDate = null }) {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'sets' ? 'sets' : 'topics';
  const choose = (v) => setParams((p) => {
    if (v === 'sets') p.set('view', 'sets'); else p.delete('view');
    return p;
  }, { replace: true });

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl label="Checklist" options={VIEWS} value={view} onChange={choose} />
      {view === 'sets' ? (
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <SetsPanel />
        </Suspense>
      ) : (
        <SyllabusTab examDate={examDate} />
      )}
    </div>
  );
}
