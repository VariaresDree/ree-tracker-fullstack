// src/features/analytics/sections/WeakSignals.jsx
// Blind spots, time sinks and recent confident misses (deep/weak-signals).
import WeakSignalsPanel from '../WeakSignalsPanel';
import { useDeepAnalytics } from '../useDeepAnalytics';
import { DeepStatus, SectionCard } from './shared';

export default function WeakSignals() {
  const { data, status, retry } = useDeepAnalytics('weak-signals');
  if (status === 'loaded') return <WeakSignalsPanel data={data} />;
  return (
    <SectionCard eyebrow="Weak spots" title="Blind spots and time sinks">
      <DeepStatus status={status} retry={retry} />
    </SectionCard>
  );
}
