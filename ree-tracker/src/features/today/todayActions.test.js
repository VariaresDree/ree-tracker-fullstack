import { describe, it, expect } from 'vitest';
import { todayManila, dayBefore } from '@ree/shared';
import { buildTodayActions, dailyProgress, daysToExam, pickPlanTask, readinessTrend } from './todayActions';

// "What should I do next?" — one ordered shortlist assembled from the review
// queue, the forecast's prescription, today's target and the exam calendar.

const forecast = (actions) => ({ recommendedActions: actions });

describe('buildTodayActions', () => {
  it('orders: due reviews, then the forecast\'s top fix, then today\'s target, then a mock', () => {
    const actions = buildTodayActions({
      srs: { due: 12, overdue: 3 },
      forecast: forecast([{ type: 'BLIND_SPOT', payload: { topic: 'Protection', subject: 'EE', topicId: 't' }, reason: 'r' }]),
      daily: { done: 10, target: 50 },
      examInDays: 40,
    });
    expect(actions.map((a) => a.key)).toEqual(['srs', 'fix', 'target', 'mock']);
    expect(actions[0].title).toBe('Review 12 due questions');
    expect(actions[1]).toMatchObject({ title: 'Fix a blind spot: Protection', preset: expect.objectContaining({ drillMode: 'blind-spot', drillTopicId: 't' }) });
    expect(actions[2].title).toBe('40 more to hit today’s target');
  });

  it('a DRILL prescription becomes a targeted drill on that topic', () => {
    const [fix] = buildTodayActions({ forecast: forecast([{ type: 'DRILL', payload: { topic: 'Calculus', subject: 'Mathematics' } }]) });
    expect(fix).toMatchObject({ key: 'fix', title: 'Drill Calculus', preset: expect.objectContaining({ source: 'smart-drill', drillTopic: 'Calculus' }) });
  });

  it('leaves out what is already done, and caps the list at four', () => {
    const actions = buildTodayActions({ srs: { due: 0 }, forecast: forecast([]), daily: { done: 60, target: 50 }, examInDays: null });
    expect(actions.map((a) => a.key)).toEqual(['mock']);
  });

  it('says "1 day to go", not "1 days"', () => {
    const mock = buildTodayActions({ examInDays: 1 }).find((a) => a.key === 'mock');
    expect(mock.detail).toMatch(/^1 day to go/);
    expect(buildTodayActions({ examInDays: 2 }).find((a) => a.key === 'mock').detail).toMatch(/^2 days to go/);
  });

  it('always has something to do', () => {
    expect(buildTodayActions({}).length).toBeGreaterThan(0);
  });
});

describe("formula cards and today's loop", () => {
  it("the loop names its cards, and the cards action covers only the ones it doesn't hold", () => {
    const loop = { items: [{ id: 'q1' }, { id: 'card:c1', kind: 'card' }], counts: { due: 1, mistakes: 0, cards: 1 } };
    const actions = buildTodayActions({ loop, cards: { due: 3 } });
    expect(actions[0].detail).toBe('1 due review and 1 formula card, mixed by board weight.');
    expect(actions.find((a) => a.key === 'cards').title).toBe('Review 2 formula cards');
    const all = buildTodayActions({ loop, cards: { due: 1 } });
    expect(all.some((a) => a.key === 'cards')).toBe(false);
  });

  it('three kinds read as a list', () => {
    const [first] = buildTodayActions({ loop: { items: [{ id: 'q1' }], counts: { due: 2, mistakes: 1, cards: 3 } } });
    expect(first.detail).toBe('2 due reviews, 1 open mistake and 3 formula cards, mixed by board weight.');
  });
});

describe('a new learner follows the placement plan', () => {
  const base = { daily: { done: 0, target: 50 }, examInDays: 90, answered: 4 };
  const loop = { items: [{ id: 'q1' }], counts: { due: 1, mistakes: 0 } };

  it('a subject under the floor: an adaptive set on it, right after the loop, and no mock', () => {
    const actions = buildTodayActions({ ...base, loop, start: { mode: 'practice', subject: 'ESAS', reason: 'floor' } });
    expect(actions.map((a) => a.key)).toEqual(['loop', 'start', 'target']);
    expect(actions[1]).toMatchObject({
      title: 'Practise ESAS first',
      detail: 'ESAS is under the 50% subject floor. An adaptive set, picked to match your level.',
      preset: expect.objectContaining({ source: 'adaptive', subject: 'ESAS', count: 20 }),
    });
  });

  it('a low average: an adaptive set across the board, first when there is no loop', () => {
    const [first] = buildTodayActions({ ...base, start: { mode: 'practice', subject: null, reason: 'average' } });
    expect(first).toMatchObject({ key: 'start', title: 'Build your base in Practice', preset: expect.objectContaining({ source: 'adaptive', subject: 'All' }) });
  });

  it('mock board: the mock moves up; Gauntlet: it leads, the mock stays last', () => {
    expect(buildTodayActions({ ...base, start: { mode: 'mock' } }).map((a) => a.key)).toEqual(['mock', 'target']);
    const g = buildTodayActions({ ...base, start: { mode: 'gauntlet' } });
    expect(g.map((a) => a.key)).toEqual(['start', 'target', 'mock']);
    expect(g[0]).toMatchObject({ title: 'Climb the Gauntlet', to: '/exams?tab=gauntlet' });
  });

  it('no placement yet: no timed board on day one, unless nothing else is left', () => {
    expect(buildTodayActions({ ...base, start: null }).map((a) => a.key)).toEqual(['target']);
    expect(buildTodayActions({ answered: 0, examInDays: 90 }).map((a) => a.key)).toEqual(['mock']);
  });

  it('an established learner is unaffected by the plan', () => {
    const actions = buildTodayActions({ ...base, answered: 200, start: { mode: 'practice', subject: 'ESAS', reason: 'floor' } });
    expect(actions.map((a) => a.key)).toEqual(['target', 'mock']);
  });
});

describe('an established learner follows the forecast on the subject floor', () => {
  const base = { daily: { done: 0, target: 50 }, examInDays: 90, answered: 200 };
  const loop = { items: [{ id: 'q1' }], counts: { due: 1, mistakes: 0 } };
  const floor = { mode: 'practice', subject: 'ESAS', reason: 'floor', expected: 46.4 };

  it('a subject projected under the floor: an adaptive set on it, right after the loop', () => {
    const actions = buildTodayActions({ ...base, loop, floor });
    expect(actions.map((a) => a.key)).toEqual(['loop', 'floor', 'target', 'mock']);
    expect(actions[1]).toMatchObject({
      title: 'Lift ESAS above the 50% floor',
      detail: 'Your forecast puts ESAS at 46%, and a subject under 50% fails the board whatever the average. An adaptive set on ESAS.',
      preset: expect.objectContaining({ source: 'adaptive', subject: 'ESAS', count: 20 }),
    });
  });

  it("says where the reading comes from: the placement test's, until the forecast is trusted", () => {
    const [, action] = buildTodayActions({ ...base, loop, floor: { ...floor, expected: 44, source: 'placement' } });
    expect(action.detail).toMatch(/^Your placement test put ESAS at 44%, and a subject under 50% fails the board/);
  });

  it('nothing is added while every subject clears the floor, or for a new learner (the placement plan leads)', () => {
    expect(buildTodayActions({ ...base, floor: { mode: 'gauntlet', subject: null, reason: 'average' } }).map((a) => a.key)).toEqual(['target', 'mock']);
    expect(buildTodayActions({ ...base, answered: 10, floor }).some((a) => a.key === 'floor')).toBe(false);
  });
});

describe('today’s study-plan task', () => {
  const drillTask = { id: 'd', kind: 'drill', topic: 'Protection', subject: 'EE', topicId: 't', targetCount: 15, dueDate: '2026-10-08', text: 'Drill Protection — 15 questions' };
  const blindSpot = forecast([{ type: 'BLIND_SPOT', payload: { topic: 'protection ', subject: 'EE', topicId: 't' } }]);

  it('comes right after due reviews', () => {
    const actions = buildTodayActions({
      srs: { due: 3 }, planTask: drillTask,
      forecast: forecast([{ type: 'DRILL', payload: { topic: 'Calculus', subject: 'Mathematics' } }]),
      daily: { done: 0, target: 50 },
    });
    expect(actions.map((a) => a.key)).toEqual(['srs', 'plan', 'fix', 'target']);
    expect(actions[1]).toMatchObject({ title: 'Drill Protection — 15 questions', cta: 'Start', preset: expect.objectContaining({ drillTopic: 'Protection' }) });
  });

  it('replaces the action it duplicates: same-topic fix, the target, the mock', () => {
    const keys = (planTask) => buildTodayActions({ planTask, forecast: blindSpot, daily: { done: 0, target: 50 } }).map((a) => a.key);
    expect(keys(drillTask)).toEqual(['plan', 'target', 'mock']);
    expect(keys({ ...drillTask, kind: 'review', topic: null })).toEqual(['plan', 'fix', 'mock']);
    expect(keys({ ...drillTask, kind: 'mock', topic: null })).toEqual(['plan', 'fix', 'target']);
  });

  it('a mock task opens the simulator; progress shows in the detail', () => {
    const [plan] = buildTodayActions({ planTask: { kind: 'mock', text: 'Timed ESAS sitting', progress: { count: 0, target: 1 } } });
    expect(plan).toMatchObject({ key: 'plan', cta: 'Set up', to: '/simulator', detail: 'From your study plan for today.' });
    const [drill] = buildTodayActions({ planTask: { ...drillTask, progress: { count: 20, target: 15 } } });
    expect(drill.detail).toBe('From your study plan · 15 of 15 done today.');
  });

  it('pickPlanTask: today’s (Manila) open, launchable task only', () => {
    const today = '2026-10-08';
    expect(pickPlanTask([
      { ...drillTask, id: 'yesterday', dueDate: '2026-10-07' },
      { id: 'free', text: 'Read chapter 4', dueDate: today },
      { ...drillTask, id: 'ticked', completed: true },
      { ...drillTask, id: 'auto-done', progress: { done: true } },
      { ...drillTask, id: 'open' },
    ], today)).toMatchObject({ id: 'open' });
    expect(pickPlanTask([], today)).toBeNull();
    expect(pickPlanTask(null, today)).toBeNull();
  });
});

describe('dailyProgress', () => {
  const TODAY = todayManila();
  const YESTERDAY = dayBefore(TODAY);

  it('sums today across subjects against the daily target', () => {
    expect(dailyProgress({ lastActiveDate: TODAY, dailyMath: 5, dailyESAS: 3, dailyEE: 12, dailyTarget: 50 }, TODAY))
      .toEqual({ done: 20, target: 50, counts: { dailyMath: 5, dailyESAS: 3, dailyEE: 12 } });
    expect(dailyProgress({})).toEqual({ done: 0, target: 50, counts: { dailyMath: 0, dailyESAS: 0, dailyEE: 0 } });
  });

  it('a new day starts at 0, before its first answer clears the saved counters', () => {
    // Saved on this device yesterday (offline, or open past midnight).
    const saved = { lastActiveDate: YESTERDAY, activityCalendar: { [YESTERDAY]: 20 }, dailyMath: 5, dailyESAS: 3, dailyEE: 12, dailyTarget: 40 };
    expect(dailyProgress(saved, TODAY)).toEqual({ done: 0, target: 40, counts: { dailyMath: 0, dailyESAS: 0, dailyEE: 0 } });
  });
});

describe('daysToExam', () => {
  it('counts whole days, null without a date', () => {
    const now = new Date('2026-10-02T04:00:00Z');
    expect(daysToExam('2026-10-12', now)).toBe(10);
    expect(daysToExam(null, now)).toBeNull();
  });
});

describe('readinessTrend', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  const at = (iso, score) => ({ createdAt: iso, score });

  it('orders the snapshots and compares with the one closest to a week ago', () => {
    const t = readinessTrend([
      at('2026-10-19T00:00:00Z', 60),
      at('2026-10-15T00:00:00Z', 55),
      at('2026-10-12T00:00:00Z', 52),
      at('2026-10-05T00:00:00Z', 40),
    ], now);
    expect(t.scores).toEqual([40, 52, 55, 60]);
    expect(t.delta).toBe(8); // 60 vs 52 on the 12th — the latest at least a week old
  });

  it('a young history compares with its oldest point; one point has no trend', () => {
    expect(readinessTrend([at('2026-10-19T00:00:00Z', 60), at('2026-10-17T00:00:00Z', 57)], now).delta).toBe(3);
    expect(readinessTrend([at('2026-10-19T00:00:00Z', 60)], now)).toEqual({ scores: [60], delta: null });
    expect(readinessTrend(null, now)).toEqual({ scores: [], delta: null });
  });
});
