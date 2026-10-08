// src/features/analytics/sections/TimePerTopic.jsx
// Average answer time per topic (deep/time-analysis): where the clock goes.
import { useDeepAnalytics } from '../useDeepAnalytics';
import { BarList, DeepStatus, SectionCard } from './shared';

export default function TimePerTopic() {
  const { data, status, retry } = useDeepAnalytics('time-analysis');
  const items = (data?.items || []).map((d) => ({ ...d, avgTimeSec: Math.round(d.avgTimeMs / 1000) }));
  return (
    <SectionCard eyebrow="Pace" title="Time per question, by topic">
      <DeepStatus status={status} retry={retry}>
        <BarList
          items={items}
          valueKey="avgTimeSec"
          labelKey="subtopic"
          unit="s"
          color="var(--color-reeCyan)"
          empty="Answer some timed questions to see where your time goes."
        />
      </DeepStatus>
    </SectionCard>
  );
}
