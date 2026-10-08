// src/features/analytics/sections/SubjectAccuracy.jsx
// Accuracy per board subject (deep/subject-radar).
import { useDeepAnalytics } from '../useDeepAnalytics';
import { BarList, DeepStatus, SectionCard } from './shared';

export default function SubjectAccuracy() {
  const { data, status, retry } = useDeepAnalytics('subject-radar');
  return (
    <SectionCard eyebrow="Subjects" title="Accuracy by subject">
      <DeepStatus status={status} retry={retry}>
        <BarList
          items={data?.items || []}
          valueKey="accuracy"
          labelKey="subject"
          maxVal={100}
          unit="%"
          color="var(--accent-success)"
          empty="Answer questions in each subject to compare them."
        />
      </DeepStatus>
    </SectionCard>
  );
}
