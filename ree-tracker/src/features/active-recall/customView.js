// src/features/active-recall/customView.js
//
// Practice's "Build your own": the session it describes, and the last one built,
// remembered on this device. A preset (a drill, the due queue) leaves its config
// behind in the session's form; the builder offers only its own choices, so it
// reads a leftover as a question-bank session over every subject.
//
// The session code still takes `studyMode`, which the builder works out from the
// two questions it asks: which subject, and which topics. Two or more topics
// (2026-11-16) are a subject session with `topics` (features/syllabus/topicPick).
import { pickedTopics, topicFields, topicsLabel } from '../syllabus/topicPick';

const STORAGE_KEY = 'ree:practice-builder';
const STUDY_MODES = ['interleaved', 'subject', 'subtopic'];
const CUSTOM_SOURCES = ['library', 'bookmarks', 'ai'];
const SUBJECT_LABEL = { Mathematics: 'Math', ESAS: 'ESAS', EE: 'EE' };
const FOCUS_LABEL = { mixed: 'mixed', conceptual: 'theory', calculation: 'calculation' };
const SOURCE_LABEL = { bookmarks: 'saved', ai: 'AI' };

export const BUILDER_COUNTS = [10, 20, 50, 100];

export function customView(config) {
  const scoped = STUDY_MODES.includes(config.studyMode);
  const inTopic = config.studyMode === 'subtopic' && !!config.subtopicId;
  return {
    ...config,
    studyMode: scoped ? config.studyMode : 'interleaved',
    subject: scoped ? config.subject : 'All',
    subtopic: scoped ? config.subtopic : 'All',
    subtopicId: inTopic ? config.subtopicId : null,
    subtopicName: inTopic ? config.subtopicName || null : null,
    topics: scoped && config.studyMode === 'subject' && config.topics?.length > 1 ? config.topics : undefined,
    source: CUSTOM_SOURCES.includes(config.source) ? config.source : 'library',
  };
}

/**
 * Which subject and topics, in the session's terms. `topics` is a topic name, a
 * list of them, or 'All' / [] for every one; two or more stay a subject session
 * with the list in `topics`.
 */
export function chooseScope(view, subject, topics = 'All', subjectTopics = null) {
  const none = { subtopicId: null, subtopicName: null, topics: undefined };
  if (subject === 'All') return { ...view, ...none, studyMode: 'interleaved', subject: 'All', subtopic: 'All' };
  const fields = topicFields([].concat(topics), subjectTopics);
  const one = fields.subtopic !== 'All';
  return { ...view, ...none, ...fields, studyMode: one ? 'subtopic' : 'subject', subject };
}

/** One subtopic of the picked topic (Question.subtopicId), or null for all of it. */
export function chooseSubtopic(view, sub) {
  if (view.studyMode !== 'subtopic') return view;
  return { ...view, subtopicId: sub?.id ?? null, subtopicName: sub?.name ?? null };
}

/** Topics retired since they were remembered drop out; none left is the whole subject. */
export function liveScope(view, topicsBySubject) {
  const picked = pickedTopics(view);
  if (view.studyMode === 'interleaved' || picked.length === 0) return view;
  const live = topicsBySubject?.[view.subject] || [];
  if (picked.every((t) => live.includes(t))) return view;
  return chooseScope(view, view.subject, picked.filter((t) => live.includes(t)), live);
}

/** "20 choice · EE · mixed", with the source when it isn't the bank. */
export function builderSummary(view) {
  const where = view.studyMode === 'interleaved' ? 'all subjects'
    : view.studyMode === 'subtopic' ? view.subtopicName || view.subtopic
      : view.topics?.length > 1 ? topicsLabel(view.topics, 1)
        : SUBJECT_LABEL[view.subject] || view.subject;
  return [
    `${view.count} ${view.sessionMode === 'flashcard' ? 'cards' : 'choice'}`,
    where,
    FOCUS_LABEL[view.cognitiveFocus] || 'mixed',
    SOURCE_LABEL[view.source],
  ].filter(Boolean).join(' · ');
}

/** The builder's own fields, as last set on this device, or null. */
export function readRememberedBuilder() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !BUILDER_COUNTS.includes(saved.count)) return null;
    return customView(saved);
  } catch {
    return null;
  }
}

export function rememberBuilder(view) {
  const { studyMode, subject, subtopic, subtopicId, subtopicName, topics, sessionMode, cognitiveFocus, count, source } = view;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ studyMode, subject, subtopic, subtopicId, subtopicName, topics, sessionMode, cognitiveFocus, count, source }));
  } catch { /* it holds for this visit */ }
}
