// Every lesson file in content/ (2026-11-16): for its topic, every subtopic it
// writes about is one the syllabus has, no section is empty, and every formula
// renders. Lessons are code: a wrong name or broken math fails here, not on a
// learner's screen.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import katex from 'katex';
import { lessonFiles, lessonSlug, sectionFor } from './lessonContent';

const LOADERS = import.meta.glob('./content/*/*.js', { import: 'default', eager: true });

// The syllabus subtopics as seeded: VALUES ('Subject', 'Topic', 'Subtopic', order).
const SEED = fs.readFileSync(path.resolve(__dirname, '../../../../ree-tracker-backend/prisma/migrations/20261105000000_syllabus_subtopics/migration.sql'), 'utf8');
const syllabus = new Map();
for (const m of SEED.matchAll(/\(\s*'((?:[^']|'')+)'\s*,\s*'((?:[^']|'')+)'\s*,\s*'((?:[^']|'')+)'\s*,\s*\d+\s*\)/g)) {
  const [subject, topic, name] = [m[1], m[2], m[3]].map((x) => x.replace(/''/g, "'"));
  const key = `${lessonSlug(subject)}/${lessonSlug(topic)}`;
  if (!syllabus.has(key)) syllabus.set(key, []);
  syllabus.get(key).push(name);
}

/** Every $…$ and $$…$$ in a text, as written. */
function mathIn(text) {
  const out = [];
  const s = String(text ?? '');
  for (const m of s.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)) out.push({ display: !!m[1], tex: m[1] ?? m[2] });
  return out;
}
const textsOf = (lesson) => [
  lesson.overview,
  ...(lesson.subtopics || []).flatMap((s) => [s.inShort, ...(s.keyIdeas || []), s.example?.problem, s.example?.solution, ...(s.traps || [])]),
].filter(Boolean);

describe('lesson content', () => {
  it('the seed parses into topics (the check below has something to check against)', () => {
    expect(syllabus.get('mathematics/algebra')).toContain('Algebraic Expressions');
    expect(syllabus.get('mathematics/trigonometry')).toContain('Spherical Trigonometry');
  });

  it('finds a lesson by its topic, by subject and name', () => {
    expect(lessonSlug('Numerical Methods & Analysis')).toBe('numerical-methods-analysis');
    expect(sectionFor({ subtopics: [{ name: 'Functions' }] }, 'functions')).toEqual({ name: 'Functions' });
  });

  for (const file of lessonFiles()) {
    const lesson = LOADERS[file];
    const key = file.replace('./content/', '').replace(/\.js$/, '');
    describe(file, () => {
      it('names a topic of the syllabus, and only its subtopics, each once', () => {
        const names = syllabus.get(key);
        expect(names, `${key} is not a topic in the syllabus seed`).toBeTruthy();
        const keys = names.map((n) => n.toLowerCase());
        const written = (lesson.subtopics || []).map((s) => s.name);
        for (const n of written) expect(keys, `"${n}" is not a subtopic of ${key}`).toContain(n.toLowerCase());
        expect(new Set(written.map((n) => n.toLowerCase())).size).toBe(written.length);
      });

      it('has an overview, and no empty section', () => {
        expect(String(lesson.overview || '').trim().length).toBeGreaterThan(40);
        for (const s of lesson.subtopics || []) {
          expect(String(s.inShort || '').trim().length, s.name).toBeGreaterThan(20);
          expect((s.keyIdeas || []).length, s.name).toBeGreaterThan(0);
        }
      });

      it('every formula renders', () => {
        for (const text of textsOf(lesson)) {
          for (const { tex, display } of mathIn(text)) {
            expect(() => katex.renderToString(tex, { throwOnError: true, displayMode: display }), tex).not.toThrow();
          }
        }
      });
    });
  }
});
