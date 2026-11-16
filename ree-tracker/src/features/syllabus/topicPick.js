// src/features/syllabus/topicPick.js
//
// Several topics in one session (2026-11-16): Practice, a custom mock and a
// custom battle can take any set of a subject's topics, say Algebra, Complex
// Numbers and Trigonometry. A config keeps its old shape for none or one:
//   none picked   subtopic 'All'             (every topic of the subject)
//   one           subtopic 'Algebra'         (as before; its subtopics can be picked)
//   two or more   subtopic 'All', topics [...] (drawn evenly across them)
// ("subtopic" is the config's name for a topic, Question.subtopic.)

/** The topics a config is on: [] for all of them. */
export function pickedTopics(config) {
  if (Array.isArray(config?.topics) && config.topics.length > 0) return config.topics;
  return config?.subtopic && config.subtopic !== 'All' ? [config.subtopic] : [];
}

/** The config fields for a pick, in the subject's own order; drops topics it doesn't have. */
export function topicFields(list, subjectTopics = null) {
  const wanted = new Set((list || []).filter((t) => t && t !== 'All'));
  const ordered = subjectTopics ? subjectTopics.filter((t) => wanted.has(t)) : [...wanted];
  if (ordered.length === 0) return { subtopic: 'All', topics: undefined };
  if (ordered.length === 1) return { subtopic: ordered[0], topics: undefined };
  return { subtopic: 'All', topics: ordered };
}

/** Whether the config is on two or more topics. */
export const isMultiTopic = (config) => Array.isArray(config?.topics) && config.topics.length > 1;

/** "Algebra", "Algebra and Trigonometry", "Algebra, Trigonometry and 2 more". */
export function topicsLabel(list, shown = 2) {
  const l = list || [];
  if (l.length <= shown) return l.length === 2 ? `${l[0]} and ${l[1]}` : l.join(', ');
  return `${l.slice(0, shown).join(', ')} and ${l.length - shown} more`;
}

/** Whether a question is in the config's topics (every one, when none are picked). */
export function inPickedTopics(config) {
  const set = new Set(pickedTopics(config));
  return (q) => set.size === 0 || set.has(q?.subtopic);
}
