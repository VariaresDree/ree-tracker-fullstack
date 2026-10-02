import { describe, it, expect } from 'vitest';
import { buildTodayActions, dailyProgress, daysToExam } from './todayActions';

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
