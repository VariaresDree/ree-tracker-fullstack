// src/features/quiz-launcher/quizRun.js
//
// One sitting of an imported quiz, as plain data: which questions, in what order,
// each with its choices in this run's order, what's been answered, and the clock.
// Plain so it can be saved after every answer and picked up again exactly as it
// was: a reshuffle on resume would move the choices under the learner's answers.
//
// Scoring is by option TEXT, not position. The parser has already collapsed
// identical choices, so either copy of a duplicate counts as correct, and the
// source format lists the right answer first, which is why choices always shuffle.
import { shuffleArray } from '../../utils/shuffle';

export const DEFAULT_SETUP = { mode: 'practice', count: 'all', order: 'file', minutesEach: 0 };

/**
 * @param questions  the quiz's questions, in file order
 * @param setup      { mode: 'practice'|'exam', count: 'all'|number, order: 'file'|'shuffled', minutesEach }
 * @param options.only  question ids to limit it to (Retry missed)
 */
export function buildRun(questions, setup, { only = null, now = Date.now() } = {}) {
  const position = new Map(questions.map((q, i) => [q.id, i]));
  let pool = only ? questions.filter((q) => only.includes(q.id)) : questions;
  if (setup.count !== 'all' && !only && setup.count < pool.length) {
    pool = shuffleArray(pool).slice(0, setup.count).sort((a, b) => position.get(a.id) - position.get(b.id));
  }
  if (setup.order === 'shuffled') pool = shuffleArray(pool);
  const limitSecs = setup.mode === 'exam' && setup.minutesEach > 0 ? pool.length * setup.minutesEach * 60 : 0;
  return {
    setup,
    items: pool.map((q) => ({ id: q.id, options: shuffleArray(q.options) })),
    answers: {},
    marked: [],
    index: 0,
    elapsedMs: 0,
    limitSecs,
    deadline: limitSecs ? now + limitSecs * 1000 : null,
    startedAt: now,
    finished: false,
    timedOut: false,
  };
}

/** The run's questions, in its order, with its order of choices. */
export function runQuestions(run, questions) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return run.items.filter((item) => byId.has(item.id)).map((item) => ({ ...byId.get(item.id), options: item.options }));
}

export function scoreRun(run, shown) {
  const correct = shown.filter((q) => run.answers[q.id] != null && run.answers[q.id] === q.answer).length;
  const answered = shown.filter((q) => run.answers[q.id] != null).length;
  return { correct, answered, total: shown.length, pct: shown.length ? Math.round((correct / shown.length) * 100) : 0 };
}

/** Wrong or left blank. */
export const missedIds = (run, shown) => shown.filter((q) => run.answers[q.id] !== q.answer).map((q) => q.id);

/** For a quiz's row: how far along an unfinished run is. */
export function runProgress(run) {
  return { answered: Object.values(run.answers || {}).filter((a) => a != null).length, total: run.items?.length || 0 };
}
