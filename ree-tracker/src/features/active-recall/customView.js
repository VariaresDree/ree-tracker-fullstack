// src/features/active-recall/customView.js
//
// The custom-session form's view of the session config. A preset (a drill,
// the due queue) leaves its config behind in the form; the form offers only
// its own choices, so it reads a leftover as a question-bank session over
// every subject.

export const SCOPES = [
  { value: 'interleaved', label: 'All subjects' },
  { value: 'subject', label: 'One subject' },
  { value: 'subtopic', label: 'One topic' },
];

const CUSTOM_SOURCES = ['library', 'bookmarks', 'ai'];

export function customView(config) {
  const scoped = SCOPES.some((s) => s.value === config.studyMode);
  return {
    ...config,
    studyMode: scoped ? config.studyMode : 'interleaved',
    subject: scoped ? config.subject : 'All',
    subtopic: scoped ? config.subtopic : 'All',
    source: CUSTOM_SOURCES.includes(config.source) ? config.source : 'library',
  };
}
