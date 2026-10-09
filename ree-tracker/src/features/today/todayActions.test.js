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
