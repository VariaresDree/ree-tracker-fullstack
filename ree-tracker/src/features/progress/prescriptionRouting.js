// src/features/progress/prescriptionRouting.js
//
// Where each "Recommended fixes" action goes (moved from the old Dashboard).
// v2 actions name their topic AND subject: READ and FORMULA_CARDS open the
// Library, the rest start a practice session.
import toast from 'react-hot-toast';
import { drillPreset, dueReviewPreset, launchPractice } from '../active-recall/presets';

/**
 * @param {object} action  a forecast `recommendedActions` entry
 * @param {{ navigate: Function, tos?: object }} ctx  tos = the dynamic TOS,
 *   used only to resolve the subject of a v1 action that names just a topic
 */
export function routePrescription(action, { navigate, tos }) {
  const type = action?.type;
  const payload = action?.payload || {};
  const topic = payload.topic;

  if (type === 'READ') {
    toast(`Open your ${topic || 'weak-topic'} handouts and read for ${payload.durationMin || 25} minutes.`);
    navigate('/library?tab=handouts');
    return;
  }
  if (type === 'FORMULA_CARDS') {
    navigate('/library?tab=formulas', { state: { search: topic || '', kind: 'formula' } });
    return;
  }
  if (type === 'DRILL' || type === 'BLIND_SPOT') {
    launchPractice(navigate, drillPreset({
      topicId: payload.topicId, topic, subject: payload.subject,
      mode: type === 'BLIND_SPOT' ? 'blind-spot' : undefined, count: payload.count,
    }));
    return;
  }
  if (type === 'SRS_DUE') {
    launchPractice(navigate, dueReviewPreset(payload.count || 20));
    return;
  }

  // v1 snapshot types (SRS_REVIEW) name only a topic: resolve its subject
  // through the TOS and start a question-bank session on it.
  const safeTOS = tos || {};
  const isSubject = topic && Object.prototype.hasOwnProperty.call(safeTOS, topic);
  const parentSubject = payload.subject || (isSubject
    ? topic
    : Object.keys(safeTOS).find((subj) => (safeTOS[subj] || []).some(
        (sub) => sub.trim().toLowerCase() === String(topic || '').trim().toLowerCase(),
      )));

  const preset = {
    sessionMode: type === 'SRS_REVIEW' ? 'flashcard' : 'mcq',
    cognitiveFocus: 'mixed',
    source: 'library',
    count: payload.count || payload.cardCount || 10,
    ...(parentSubject && !isSubject
      ? { studyMode: 'subtopic', subject: parentSubject, subtopic: topic }
      : { studyMode: 'interleaved', subject: isSubject ? topic : 'All', subtopic: 'All' }),
  };

  toast(`Starting a ${preset.count}-item ${preset.sessionMode === 'flashcard' ? 'flashcard' : 'practice'} session${topic ? ` on ${topic}` : ''}.`);
  launchPractice(navigate, preset);
}
