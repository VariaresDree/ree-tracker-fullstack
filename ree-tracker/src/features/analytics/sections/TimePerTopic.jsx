// src/features/analytics/sections/TimePerTopic.jsx
// Average answer time per topic (deep/time-analysis): where the clock goes,
// and a drill on the slowest.
import { drillPreset } from '../../active-recall/presets';
import { useDeepAnalytics } from '../useDeepAnalytics';
import { BarList, DeepStatus, PractiseLink, SectionCard } from './shared';
import { slowestTopic } from './nextSteps';

export default function TimePerTopic() {
  const { data, status, retry } = useDeepAnalytics('time-analysis');
  const items = (data?.items || []).map((d) => ({ ...d, avgTimeSec: Math.round(d.avgTimeMs / 1000) }));
  const slowest = slowestTopic(data?.items);
  return (
    <SectionCard eyebrow="Pace" title="Time per question, by topic">
      <DeepStatus status={status} retry={retry}>
        <div className="flex flex-col gap-3">
          <BarList
            items={items}
            valueKey="avgTimeSec"
            labelKey="subtopic"
            unit="s"
            color="var(--color-reeCyan)"
            empty="Answer some timed questions to see where your time goes."
          />
          {slowest && (
            <PractiseLink preset={drillPreset({ topic: slowest.subtopic })}>
              Drill {slowest.subtopic}, your slowest
            </PractiseLink>
          )}
        </div>
      </DeepStatus>
    </SectionCard>
  );
}
