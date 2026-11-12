// The subtopics a learner can draw questions from, once a topic is picked
// (Practice, a mock, a battle, Progress › Syllabus). Only those with enough
// tagged questions to make a set: tags come from Admin › Question bank ›
// Subtopics, and a subtopic with a handful would repeat them.
import { useEffect, useMemo, useState } from 'react';
import { normalizeSubject } from '@ree/shared';

export const MIN_TAGGED = 10;

/** Pure: a topic's active subtopics with at least MIN_TAGGED questions, in order. */
export function taggedSubtopics(items, subject, topicName) {
  if (!topicName || topicName === 'All') return [];
  const subj = normalizeSubject(subject);
  return (items || [])
    .filter((s) => s.active && s.topicName === topicName && normalizeSubject(s.subject) === subj && (s.questions || 0) >= MIN_TAGGED)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(({ id, name, questions }) => ({ id, name, questions }));
}

// One request a visit: the counts move only when an admin tags questions.
let pending = null;
export function loadSubtopicChoices() {
  // Loaded on use, so a screen that only might offer a subtopic doesn't pull
  // the API module into its own chunk.
  pending ??= import('../../services/dbQueries')
    .then(({ apiRequest }) => apiRequest('/api/config/subtopics'))
    .then((res) => res?.items || [])
    .catch(() => { pending = null; return []; });
  return pending;
}
/** Tests only. */
export const forgetSubtopicChoices = () => { pending = null; };

/** A topic's drillable subtopics; empty while loading, for 'All', or when none qualify. */
export function useSubtopicChoices(subject, topicName) {
  const [items, setItems] = useState(null);
  const wanted = !!topicName && topicName !== 'All';
  useEffect(() => {
    if (!wanted) return undefined;
    let live = true;
    loadSubtopicChoices().then((list) => { if (live) setItems(list); });
    return () => { live = false; };
  }, [wanted]);
  return useMemo(() => taggedSubtopics(items, subject, topicName), [items, subject, topicName]);
}

/**
 * A topic's subtopics that can be drilled (at least MIN_TAGGED questions), as
 * id -> questions, and this learner's answers in each, as id -> { answered,
 * correct }. Counted on the server; nothing while loading or offline.
 */
export function useTopicDrills(topicId) {
  const [state, setState] = useState({ topicId: null, counts: EMPTY, accuracy: EMPTY });
  useEffect(() => {
    if (!topicId) return undefined;
    let live = true;
    (async () => {
      const items = await loadSubtopicChoices();
      const counts = new Map(items.filter((s) => s.topicId === topicId && s.active && (s.questions || 0) >= MIN_TAGGED).map((s) => [s.id, s.questions]));
      if (!live) return;
      setState({ topicId, counts, accuracy: EMPTY });
      if (counts.size === 0) return;
      try {
        const { apiRequest } = await import('../../services/dbQueries');
        const res = await apiRequest(`/api/user/syllabus-subtopics/accuracy?topicId=${encodeURIComponent(topicId)}`);
        const accuracy = new Map((res?.items || []).map((r) => [r.subtopicId, { answered: r.answered, correct: r.correct }]));
        if (live) setState({ topicId, counts, accuracy });
      } catch { /* the counts still show */ }
    })();
    return () => { live = false; };
  }, [topicId]);
  return state.topicId === topicId ? state : { counts: EMPTY, accuracy: EMPTY };
}
const EMPTY = new Map();

/** "75% of 12", or "Not tried yet". */
export function accuracyLine(a) {
  if (!a?.answered) return 'Not tried yet';
  return `${Math.round((a.correct / a.answered) * 100)}% of ${a.answered}`;
}
