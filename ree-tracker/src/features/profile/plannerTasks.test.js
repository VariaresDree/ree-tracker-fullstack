import { describe, it, expect } from 'vitest';
import { taskLaunch, isTaskDone, kindLabel } from './plannerTasks';

describe('planner task helpers', () => {
  it('a planned drill launches a targeted drill on its topic at its size', () => {
    expect(taskLaunch({ kind: 'drill', topic: 'Protection', subject: 'EE', topicId: 't', targetCount: 24 }).preset)
      .toMatchObject({ source: 'smart-drill', drillTopicId: 't', drillTopic: 'Protection', count: 24 });
  });

  it('a review launches a mixed set; a mock opens the simulator; free text launches nothing', () => {
    expect(taskLaunch({ kind: 'review', targetCount: 25 }).preset).toMatchObject({ source: 'library', count: 25 });
    expect(taskLaunch({ kind: 'mock' })).toEqual({ to: '/simulator' });
    expect(taskLaunch({ kind: null, text: 'Read chapter 4' })).toBeNull();
  });

  it('done by hand or by the day\u2019s answers', () => {
    expect(isTaskDone({ completed: true })).toBe(true);
    expect(isTaskDone({ completed: false, progress: { done: true } })).toBe(true);
    expect(isTaskDone({ completed: false, progress: { done: false } })).toBe(false);
    expect(kindLabel({ kind: 'mock' })).toBe('Timed sitting');
  });
});
