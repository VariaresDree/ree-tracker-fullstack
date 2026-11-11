import { describe, it, expect, vi } from 'vitest';

// A confidence nobody chose leaves the request without the field: the server
// records it as UNRATED, and an older server (before 2026-11-11) as MED, as it
// always had, so no request fails on a value that server doesn't know.

vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: null } }));
vi.mock('idb-keyval', () => ({ get: vi.fn(async () => null), set: vi.fn(async () => {}), del: vi.fn(async () => {}) }));

const { confidenceField } = await import('./confidence');
const { useStore } = await import('../store/useStore');

describe('confidenceField', () => {
  it('sends a chosen level, and nothing for none or UNRATED', () => {
    expect(confidenceField('HIGH')).toEqual({ confidenceLevel: 'HIGH' });
    expect(confidenceField('LOW')).toEqual({ confidenceLevel: 'LOW' });
    expect(confidenceField('UNRATED')).toEqual({});
    expect(confidenceField(undefined)).toEqual({});
    expect(confidenceField(null)).toEqual({});
  });
});

describe('a queued answer', () => {
  it('carries no confidence when none was chosen, and the one chosen otherwise', () => {
    vi.useFakeTimers(); // the queue's flush waits on a timer; nothing here should send
    const { recordAttempt } = useStore.getState();
    recordAttempt({ questionId: 'q-blank', subject: 'EE', subtopic: 'Machines', isCorrect: true });
    recordAttempt({ questionId: 'q-sure', subject: 'EE', subtopic: 'Machines', isCorrect: false, confidenceLevel: 'HIGH' });
    const queued = useStore.getState().syncQueue.slice(-2);
    expect(queued[0].questionId).toBe('q-blank');
    expect('confidenceLevel' in queued[0]).toBe(false);
    expect(queued[1]).toMatchObject({ questionId: 'q-sure', confidenceLevel: 'HIGH' });
    // The device's own matrix leaves the blank one out.
    expect(useStore.getState().stats.matrix).toMatchObject({ hc: 0, lc: 0, hw: 1, lw: 0 });
    vi.useRealTimers();
  });
});
