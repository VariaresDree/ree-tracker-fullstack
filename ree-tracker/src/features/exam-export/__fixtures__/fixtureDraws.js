// Test fixtures for the exam export: draws built from tricky-questions.json
// (math, tables, Unicode, 5-6 options, an unmatched key, missing solutions,
// figures, unsafe macros) through the real drawExamPaper, with a fixed key and
// date so the output is deterministic. Used by the unit tests and by the
// pdflatex compile check (texCompile.check.test.js).
import questions from './tricky-questions.json';
import { drawExamPaper } from '../drawExamPaper';

export const FIXTURE_QUESTIONS = questions;
export const FIXED_NOW = new Date('2026-10-20T01:00:00Z');
export const FIXED_KEY = 'fixture-key';

/** A fake bank: `limit` questions for a subject, cycling with fresh ids. */
export function fixtureBank(pool = questions, { anySubject = false } = {}) {
  return async (subject, subtopic, limit) => {
    const own = anySubject ? pool : pool.filter((q) => q.subject === subject);
    const src = own.length ? own : pool;
    const count = anySubject ? Math.min(limit, src.length) : limit;
    return Array.from({ length: count }, (_, i) => {
      const q = src[i % src.length];
      return i < src.length ? q : { ...q, id: `${q.id}-r${Math.floor(i / src.length)}` };
    });
  };
}

export const CONFIGS = {
  ee100: { mode: 'subject', subject: 'EE', isPrcStandard: true, count: 100, source: 'library', cognitiveFocus: 'mixed' },
  blended: { mode: 'blended', subject: 'blended', isPrcStandard: true, count: 100, source: 'library', cognitiveFocus: 'mixed' },
  custom12: { mode: 'blended', subject: 'blended', isPrcStandard: false, count: 12, source: 'library', cognitiveFocus: 'mixed' },
  allTricky: { mode: 'subject', subject: 'EE', isPrcStandard: false, count: 50, source: 'library', cognitiveFocus: 'mixed' },
};

const byId = (ids) => ids.map((id) => questions.find((q) => q.id === id));

// 12 items, 3/4/5 by board weight: 4, 5 and 6 options, one unmatched key,
// one with no solution, one with a table, one with a figure.
export const TWELVE = byId(['t09', 't10', 't22', 't18', 't19', 't20', 't12', 't03', 't04', 't05', 't06', 't08']);

/** A draw from the fixtures; `deps` overrides the bank, key or date. */
export function fixtureDraw(config, deps = {}) {
  return drawExamPaper(config, {
    sittingKey: FIXED_KEY,
    now: FIXED_NOW,
    fetchQuestions: fixtureBank(),
    fetchWeights: async () => null,
    ...deps,
  });
}

/** The 12-item mixed draw the template tests use. */
export const twelveItemDraw = () => fixtureDraw(CONFIGS.custom12, { fetchQuestions: fixtureBank(TWELVE) });

/** Every tricky case in one paper (45 items, no repeats). */
export const allTrickyDraw = () => fixtureDraw(CONFIGS.allTricky, { fetchQuestions: fixtureBank(questions, { anySubject: true }) });

/** A fake QR module matrix. */
export const FAKE_QR = { size: 21, get: (r, c) => (r * 7 + c * 3) % 5 < 2 };
