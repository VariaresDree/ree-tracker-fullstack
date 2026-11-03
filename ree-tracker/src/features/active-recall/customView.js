// src/features/active-recall/customView.js
//
// Practice's "Build your own": the session it describes, and the last one built,
// remembered on this device. A preset (a drill, the due queue) leaves its config
// behind in the session's form; the builder offers only its own choices, so it
// reads a leftover as a question-bank session over every subject.
//
// The session code still takes `studyMode`, which the builder works out from the
// two questions it asks: which subject, and which topic.

const STORAGE_KEY = 'ree:practice-builder';
const STUDY_MODES = ['interleaved', 'subject', 'subtopic'];
const CUSTOM_SOURCES = ['library', 'bookmarks', 'ai'];
const SUBJECT_LABEL = { Mathematics: 'Math', ESAS: 'ESAS', EE: 'EE' };
const FOCUS_LABEL = { mixed: 'mixed', conceptual: 'theory', calculation: 'calculation' };
const SOURCE_LABEL = { bookmarks: 'saved', ai: 'AI' };

export const BUILDER_COUNTS = [10, 20, 50, 100];

export function customView(config) {
  const scoped = STUDY_MODES.includes(config.studyMode);
  return {
    ...config,
    studyMode: scoped ? config.studyMode : 'interleaved',
    subject: scoped ? config.subject : 'All',
    subtopic: scoped ? config.subtopic : 'All',
    source: CUSTOM_SOURCES.includes(config.source) ? config.source : 'library',
  };
}

/** Which subject and topic, in the session's terms. 'All' means every one. */
export function chooseScope(view, subject, topic = 'All') {
  if (subject === 'All') return { ...view, studyMode: 'interleaved', subject: 'All', subtopic: 'All' };
  return { ...view, studyMode: topic === 'All' ? 'subject' : 'subtopic', subject, subtopic: topic };
}

/** A topic retired since it was remembered falls back to its whole subject. */
export function liveScope(view, topicsBySubject) {
  if (view.studyMode !== 'subtopic' || (topicsBySubject?.[view.subject] || []).includes(view.subtopic)) return view;
  return chooseScope(view, view.subject);
}

/** "20 choice · EE · mixed", with the source when it isn't the bank. */
export function builderSummary(view) {
  const where = view.studyMode === 'interleaved' ? 'all subjects'
    : view.studyMode === 'subtopic' ? view.subtopic
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
  const { studyMode, subject, subtopic, sessionMode, cognitiveFocus, count, source } = view;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ studyMode, subject, subtopic, sessionMode, cognitiveFocus, count, source }));
  } catch { /* it holds for this visit */ }
}
