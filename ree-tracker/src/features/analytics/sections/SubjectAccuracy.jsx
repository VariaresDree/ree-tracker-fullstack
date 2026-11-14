// src/features/analytics/sections/SubjectAccuracy.jsx
// Accuracy per board subject (deep/subject-radar), and a set on the lowest.
import { toDisplaySubject } from '@ree/shared';
import { adaptivePreset } from '../../active-recall/presets';
import { useDeepAnalytics } from '../useDeepAnalytics';
import { BarList, DeepStatus, PractiseLink, SectionCard } from './shared';
import { lowestSubject } from './nextSteps';

export default function SubjectAccuracy() {
  const { data, status, retry } = useDeepAnalytics('subject-radar');
  const lowest = lowestSubject(data?.items);
  return (
    <SectionCard eyebrow="Subjects" title="Accuracy by subject">
      <DeepStatus status={status} retry={retry}>
        <div className="flex flex-col gap-3">
          <BarList
            items={data?.items || []}
            valueKey="accuracy"
            labelKey="subject"
            maxVal={100}
            unit="%"
            color="var(--accent-success)"
            empty="Answer questions in each subject to compare them."
          />
          {lowest && (
            <PractiseLink preset={adaptivePreset({ subject: lowest.subject, count: 20 })}>
              Practise {toDisplaySubject(lowest.subject)}, your lowest
            </PractiseLink>
          )}
        </div>
      </DeepStatus>
    </SectionCard>
  );
}
