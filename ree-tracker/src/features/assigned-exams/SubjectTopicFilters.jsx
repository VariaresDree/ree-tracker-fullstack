// Subject and Topic pickers for both assigned-exam lists (Exams › Assigned and
// Admin › Assigned exams). Each shows only when it has a choice to offer: one
// subject, or one topic, needs no picker. Changing the subject clears the topic.
// Renders bare fields, so the list lays them out in its own grid.
import { toDisplaySubject } from '@ree/shared';
import { FormField, Select } from '../../components/ui';
import { subjectCounts, topicCounts } from './examMath';

export default function SubjectTopicFilters({ items, subject, topic, onSubject, onTopic, fieldClassName }) {
  const subjects = subjectCounts(items);
  const topics = topicCounts(items, subject);
  const grouped = subject === 'all' && subjects.length > 1;
  const option = (t) => <option key={`${t.subject}-${t.topic}`} value={t.topic}>{t.topic} · {t.count}</option>;
  return (
    <>
      {subjects.length > 1 && (
        <FormField label="Subject" className={fieldClassName}>
          <Select value={subject} onChange={(e) => { onSubject(e.target.value); onTopic('all'); }}>
            <option value="all">All subjects · {items.length}</option>
            {subjects.map((s) => <option key={s.value} value={s.value}>{s.label} · {s.count}</option>)}
          </Select>
        </FormField>
      )}
      {topics.length > 1 && (
        <FormField label="Topic" className={fieldClassName}>
          <Select value={topic} onChange={(e) => onTopic(e.target.value)}>
            <option value="all">All topics</option>
            {grouped
              ? subjects.map((s) => (
                <optgroup key={s.value} label={toDisplaySubject(s.value)}>
                  {topics.filter((t) => t.subject === s.value).map(option)}
                </optgroup>
              ))
              : topics.map(option)}
          </Select>
        </FormField>
      )}
    </>
  );
}
