// src/features/quiz-launcher/quizRun.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as idb from 'idb-keyval';
import { buildRun, missedIds, runProgress, runQuestions, scoreRun } from './quizRun';
import { deleteQuiz, getAttempts, listQuizzes, recordAttempt, saveQuiz, saveRun } from './quizStore';
import { deviceEntries, deviceGet, deviceSet } from '../../services/deviceStore';

vi.mock('idb-keyval', () => {
  const data = new Map();
  return {
    __data: data,
    createStore: vi.fn(() => 'store'),
    get: vi.fn(async (k) => data.get(k)),
    set: vi.fn(async (k, v) => { data.set(k, v); }),
    del: vi.fn(async (k) => { data.delete(k); }),
    keys: vi.fn(async () => [...data.keys()]),
    getMany: vi.fn(async (ks) => ks.map((k) => data.get(k))),
  };
});

const questions = Array.from({ length: 30 }, (_, i) => ({
  id: `q${i}`,
  text: `Question ${i}`,
  options: [`right ${i}`, `wrong ${i}`, `other ${i}`, `last ${i}`],
  answer: `right ${i}`,
}));
const setup = (over) => ({ mode: 'exam', count: 'all', order: 'file', minutesEach: 0, ...over });

describe('buildRun', () => {
  it('takes every question in file order by default', () => {
    const run = buildRun(questions, setup());
    expect(run.items.map((i) => i.id)).toEqual(questions.map((q) => q.id));
    expect(run.deadline).toBeNull();
  });

  it('keeps all of each question’s choices, whatever their order', () => {
    const run = buildRun(questions, setup());
    run.items.forEach((item, i) => expect([...item.options].sort()).toEqual([...questions[i].options].sort()));
  });

  it('a count takes that many at random, still in file order', () => {
    const run = buildRun(questions, setup({ count: 10 }));
    expect(run.items).toHaveLength(10);
    const positions = run.items.map((i) => Number(i.id.slice(1)));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('shuffled changes the order, not the set', () => {
    const run = buildRun(questions, setup({ order: 'shuffled' }));
    expect(run.items.map((i) => i.id).sort()).toEqual(questions.map((q) => q.id).sort());
  });

  it('a time limit is per item, and only for an exam', () => {
    const exam = buildRun(questions, setup({ count: 10, minutesEach: 2 }), { now: 1000 });
    expect(exam.limitSecs).toBe(1200);
    expect(exam.deadline).toBe(1000 + 1200 * 1000);
    expect(buildRun(questions, setup({ mode: 'practice', minutesEach: 2 })).deadline).toBeNull();
  });

  it('only limits it to those questions and ignores the count', () => {
    const run = buildRun(questions, setup({ count: 10 }), { only: ['q3', 'q7', 'q2'] });
    expect(run.items.map((i) => i.id)).toEqual(['q2', 'q3', 'q7']);
  });
});

describe('runQuestions', () => {
  it('gives the run’s order of questions and of choices', () => {
    const run = buildRun(questions.slice(0, 3), setup({ order: 'shuffled' }));
    const shown = runQuestions(run, questions);
    expect(shown.map((q) => q.id)).toEqual(run.items.map((i) => i.id));
    expect(shown[0].options).toEqual(run.items[0].options);
    expect(shown[0].answer).toBe(questions.find((q) => q.id === shown[0].id).answer);
  });

  it('skips an item the file no longer has', () => {
    const run = buildRun(questions.slice(0, 2), setup());
    expect(runQuestions(run, questions.slice(1, 2))).toHaveLength(1);
  });
});

describe('scoring', () => {
  const run = { ...buildRun(questions.slice(0, 4), setup()), answers: { q0: 'right 0', q1: 'wrong 1', q2: null } };
  const shown = runQuestions(run, questions);

  it('scores by the choice’s text, wherever it was shuffled to', () => {
    expect(scoreRun(run, shown)).toEqual({ correct: 1, answered: 2, total: 4, pct: 25 });
  });

  it('counts wrong and blank as missed', () => {
    expect(missedIds(run, shown)).toEqual(['q1', 'q2', 'q3']);
  });

  it('progress counts answers, not nulls', () => {
    expect(runProgress(run)).toEqual({ answered: 2, total: 4 });
  });
});

describe('quizStore', () => {
  beforeEach(() => idb.__data.clear());
  const quiz = (id, addedAt) => ({ id, fileName: `${id}.quiz`, addedAt, result: { questions: [] } });

  it('one account never sees another’s quizzes', async () => {
    await saveQuiz('a', quiz('one', 1));
    await saveQuiz('b', quiz('two', 2));
    expect((await listQuizzes('a')).map((q) => q.id)).toEqual(['one']);
    expect((await listQuizzes('b')).map((q) => q.id)).toEqual(['two']);
  });

  it('lists newest first, with the run and attempts', async () => {
    await saveQuiz('a', quiz('old', 1));
    await saveQuiz('a', quiz('new', 2));
    await saveRun('a', 'old', { items: [] });
    await recordAttempt('a', 'old', { pct: 50 });
    const [first, second] = await listQuizzes('a');
    expect(first.id).toBe('new');
    expect(first.run).toBeNull();
    expect(second.run).toEqual({ items: [] });
    expect(second.attempts).toEqual([{ pct: 50 }]);
  });

  it('keeps the last twenty attempts', async () => {
    for (let i = 0; i < 23; i += 1) await recordAttempt('a', 'one', { pct: i });
    const attempts = await getAttempts('a', 'one');
    expect(attempts).toHaveLength(20);
    expect(attempts[19].pct).toBe(22);
  });

  it('deleting a quiz takes its run and attempts with it', async () => {
    await saveQuiz('a', quiz('one', 1));
    await saveRun('a', 'one', { items: [] });
    await recordAttempt('a', 'one', { pct: 1 });
    await deleteQuiz('a', 'one');
    expect(idb.__data.size).toBe(0);
  });
});

describe('deviceStore', () => {
  beforeEach(() => idb.__data.clear());

  it('lists only what starts with the prefix', async () => {
    await deviceSet('a:1', 'x');
    await deviceSet('b:1', 'y');
    expect(await deviceEntries('a:')).toEqual([['a:1', 'x']]);
  });

  it('a full disk gets a plain message', async () => {
    idb.set.mockRejectedValueOnce(Object.assign(new Error('quota'), { name: 'QuotaExceededError' }));
    await expect(deviceSet('k', 'v')).rejects.toThrow('out of space');
  });

  it('reads as empty when the browser won’t open storage', async () => {
    idb.get.mockRejectedValueOnce(new Error('blocked'));
    idb.keys.mockRejectedValueOnce(new Error('blocked'));
    expect(await deviceGet('k')).toBeUndefined();
    expect(await deviceEntries('')).toEqual([]);
  });
});
