// Every lesson file in content/ (2026-11-16): for its topic, every subtopic it
// writes about is one the syllabus has, no section is empty, and every formula
// renders. Lessons are code: a wrong name or broken math fails here, not on a
// learner's screen. Since 2026-11-19 also the module parts: every figure in the
// discussion draws, every worked example has its steps and answer, every
// self-check question its answer, and no number sits straight before a fraction.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import katex from 'katex';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ShapeFigure from '../conversion/shapes/ShapeFigure';
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
const isFigure = (item) => typeof item !== 'string';
const textsOf = (lesson) => [
  lesson.overview,
  ...(lesson.subtopics || []).flatMap((s) => [
    s.inShort, ...(s.body || []).filter((b) => !isFigure(b)), ...(s.keyIdeas || []), s.example?.problem, s.example?.solution,
    ...(s.examples || []).flatMap((e) => [e.problem, ...(e.steps || []), e.answer]),
    ...(s.traps || []), ...(s.check || []).flatMap((c) => [c.q, c.a]),
  ]),
].filter(Boolean);
const figuresOf = (sec) => [...(sec.figures || []), ...(sec.body || []).filter(isFigure)];
// A number straight before a fraction reads as a mixed number ("2 1/2"): write × between.
// A number, that is, standing on its own: not a subscript, power or limit (R_2, r^2, \int_0^1).
const MIXED = /(?:^|[^\w^_.}\\])\d+(?:\.\d+)?\s*\\[dt]?frac/;

describe('lesson content', () => {
  it('the seed parses into topics (the check below has something to check against)', () => {
    expect(syllabus.get('mathematics/algebra')).toContain('Algebraic Expressions');
    expect(syllabus.get('mathematics/trigonometry')).toContain('Spherical Trigonometry');
  });

  it('finds a lesson by its topic, by subject and name', () => {
    expect(lessonSlug('Numerical Methods & Analysis')).toBe('numerical-methods-analysis');
    expect(sectionFor({ subtopics: [{ name: 'Functions' }] }, 'functions')).toEqual({ name: 'Functions' });
  });

  it('the mixed-number rule flags a number standing before a fraction, not an index', () => {
    for (const tex of [String.raw`= 16\frac{4}{11}`, String.raw`0.2\frac{a}{b}`, String.raw`\sqrt{2\frac{e}{m}}`, String.raw`1000\frac{1}{2}`]) expect(tex).toMatch(MIXED);
    for (const tex of [String.raw`R_2\frac{a}{b}`, String.raw`r^2\frac{d}{t}`, String.raw`\int_0^1\frac{x}{y}`, String.raw`\sqrt3\frac{1}{2}`, String.raw`10^6\frac{a}{b}`, String.raw`2 \times \frac{a}{b}`]) expect(tex).not.toMatch(MIXED);
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

      // A figure is a Units and tools › Shapes drawing; a wrong id would draw nothing.
      it('every figure draws', () => {
        for (const sec of lesson.subtopics || []) {
          for (const f of figuresOf(sec)) expect(renderToStaticMarkup(createElement(ShapeFigure, f)), `${sec.name}: ${f.figure}`).toMatch(/^<svg/);
        }
      });

      it('every worked example has its steps and answer, every check its answer', () => {
        for (const sec of lesson.subtopics || []) {
          for (const e of sec.examples || []) {
            expect(String(e.problem || '').trim(), sec.name).not.toBe('');
            expect((e.steps || []).length, `${sec.name}: steps`).toBeGreaterThan(0);
            expect(String(e.answer || '').trim(), `${sec.name}: answer`).not.toBe('');
            if (e.level) expect(['basic', 'board'], sec.name).toContain(e.level);
          }
          for (const c of sec.check || []) {
            expect(String(c.q || '').trim(), sec.name).not.toBe('');
            expect(String(c.a || '').trim(), sec.name).not.toBe('');
          }
        }
      });

      it('no number sits straight before a fraction', () => {
        for (const text of textsOf(lesson)) {
          for (const { tex } of mathIn(text)) expect(tex, tex).not.toMatch(MIXED);
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
