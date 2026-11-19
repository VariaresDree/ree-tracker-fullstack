// src/features/lessons/lessonContent.js
//
// Library › Lessons (2026-11-16): each topic's lesson is a module of the app,
// `content/<subject>/<topic>.js`, written and reviewed like code, not rows in the
// database: no Supabase egress, and offline once opened. Each file is its own
// lazy chunk, loaded only when its topic is opened.
//
// A lesson file's default export:
//   { topic, subject, overview, sources?: [string],
//     subtopics: [{ name, inShort, keyIdeas: [md], traps?: [md],
//       body?: [md | figure],          the discussion; a figure among the paragraphs
//       figures?: [figure],            drawings under In short (the first lessons')
//       examples?: [{ title?, level?: 'basic' | 'board', problem, steps: [md], answer }],
//       example?: { problem, solution }, the one-example format, when there are no examples
//       check?: [{ q, a }] }] }        Check yourself
// Markdown with $…$ and $$…$$ math, and pipe tables in body. `name` is the syllabus
// subtopic's name. A figure is a drawing's props plus an optional `caption` (plain
// text). No number straight before a fraction: it reads as a mixed number.

import { normSubtopicKey } from '@ree/shared/subtopics';

const LOADERS = import.meta.glob('./content/*/*.js', { import: 'default' });

/** "Numerical Methods & Analysis" → "numerical-methods-analysis". */
export const lessonSlug = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const keyOf = (subject, topic) => `./content/${lessonSlug(subject)}/${lessonSlug(topic)}.js`;

/** Whether a topic has its lesson written yet. */
export const hasLesson = (subject, topic) => keyOf(subject, topic) in LOADERS;

/** The topic's lesson, or null when it isn't written yet. */
export function loadLesson(subject, topic) {
  const load = LOADERS[keyOf(subject, topic)];
  return load ? load() : Promise.resolve(null);
}

/** A lesson's section for a subtopic, by the name the syllabus gives it. */
export function sectionFor(lesson, name) {
  if (!lesson || !name) return null;
  const key = normSubtopicKey(name);
  return (lesson.subtopics || []).find((s) => normSubtopicKey(s.name) === key) || null;
}

/** Library › Lessons at a topic (Progress › Syllabus and Formula cards link here). */
export const topicLessonLink = (subject, topic) => `/library?${new URLSearchParams({ tab: 'lessons', subject, topic })}`;

/** Test seam: the lesson files there are. */
export const lessonFiles = () => Object.keys(LOADERS);
