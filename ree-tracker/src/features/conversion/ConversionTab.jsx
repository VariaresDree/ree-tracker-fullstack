// src/features/conversion/ConversionTab.jsx
//
// Library > Units and tools. What's open lives in the URL, so a conversion can be
// linked and Back goes back a step.
import { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SegmentedControl, Skeleton } from '../../components/ui';
import { lazy } from '../../utils/lazyWithRetry';
import UnitsPanel from './UnitsPanel';

const BoardTools = lazy(() => import('./BoardTools'));
const Calculator = lazy(() => import('./Calculator'));

const VIEWS = [
  { value: 'units', label: 'Units' },
  { value: 'tools', label: 'Tools' },
  { value: 'calculator', label: 'Calculator' },
];

export default function ConversionTab() {
  const [params, setParams] = useSearchParams();
  const view = VIEWS.some((v) => v.value === params.get('view')) ? params.get('view') : 'units';
  const update = (patch, { push = false } = {}) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined) next.delete(key);
      else next.set(key, value);
    }
    return next;
  }, { replace: !push });

  return (
    <div className="flex flex-col gap-5 min-w-0">
      <h2 className="sr-only">Units and tools</h2>
      <SegmentedControl label="Show" value={view} onChange={(next) => update({ view: next === 'units' ? null : next }, { push: true })} options={VIEWS} />
      {view === 'units' && (
        <UnitsPanel
          state={{ cat: params.get('cat'), from: params.get('from'), to: params.get('to'), v: params.get('v') }}
          onChange={update}
        />
      )}
      <Suspense fallback={<Skeleton className="h-64" />}>
        {view === 'tools' && <BoardTools tool={params.get('tool')} onTool={(tool) => update({ tool }, { push: true })} />}
        {view === 'calculator' && <Calculator />}
      </Suspense>
    </div>
  );
}
