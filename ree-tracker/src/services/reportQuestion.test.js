import { describe, it, expect, vi, beforeEach } from 'vitest';

const writeOrQueue = vi.fn();
vi.mock('./writeOrQueue', () => ({ writeOrQueue: (...a) => writeOrQueue(...a) }));
const { reportQuestion } = await import('./reportQuestion');

describe('reportQuestion', () => {
  beforeEach(() => writeOrQueue.mockReset());

  it('sends the reason, and queues offline, through the flag route', () => {
    reportQuestion('q1', 'The answer key looks wrong');
    expect(writeOrQueue).toHaveBeenCalledWith('/api/questions/q1/flag', 'PATCH', { reason: 'The answer key looks wrong' }, { queueKey: '/api/questions/q1/flag' });
  });

  it('a report with no reason still goes', () => {
    reportQuestion('q1');
    expect(writeOrQueue.mock.calls[0][2]).toEqual({ reason: null });
  });
});
