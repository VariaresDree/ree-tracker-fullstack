import { describe, it, expect } from 'vitest';
import { buildTodayActions, dailyProgress, daysToExam, readinessTrend } from './todayActions';

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

  it('always has something to do', () => {
    expect(buildTodayActions({}).length).toBeGreaterThan(0);
  });
});

describe('dailyProgress', () => {
  it('sums today across subjects against the daily target', () => {
    expect(dailyProgress({ dailyMath: 5, dailyESAS: 3, dailyEE: 12, dailyTarget: 50 })).toEqual({ done: 20, target: 50 });
    expect(dailyProgress({})).toEqual({ done: 0, target: 50 });
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
