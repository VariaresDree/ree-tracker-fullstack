// src/features/study-plan/planTopics.js
//
// The topics a study plan is built from: every syllabus topic of the chosen
// subjects with its PRC weight, heaviest subject first (EE is 45%). Shared by
// Progress › Study plan and the first-run exam plan, which offers to make
// the plan the placement prompt promises.
import { normalizeSubject } from '@ree/shared';
import { TOS_WEIGHTS } from '../../utils/tosWeights';

export const PLAN_SUBJECTS = ['Mathematics', 'ESAS', 'EE'];

export function planTopics(tos, subjects = PLAN_SUBJECTS) {
  const topics = [];
  for (const subject of subjects) {
    const weight = TOS_WEIGHTS[normalizeSubject(subject)] || 0.33;
    for (const subtopic of (tos || {})[subject] || []) topics.push({ subject, subtopic, weight });
  }
  return topics.sort((a, b) => b.weight - a.weight);
}
