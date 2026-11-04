import { describe, it, expect, beforeEach } from 'vitest';
import { clearSavedSession, loadSavedSession, saveSession } from './savedSession';

const QS = [{ id: 'a' }, { id: 'b' }];
const NOW = Date.now();

beforeEach(() => localStorage.clear());

describe('savedSession', () => {
  it('brings a session back', () => {
    saveSession({ questions: QS, currentIndex: 0, isAnswered: true });
    expect(loadSavedSession().currentIndex).toBe(0);
  });
  it('has nothing to offer once the last item is answered', () => {
    saveSession({ questions: QS, currentIndex: 1, isAnswered: true });
    expect(loadSavedSession()).toBeNull();
    expect(localStorage.getItem('ree_practice_cache')).toBeNull();
  });
  it('an adaptive set is done at its count, not the end of what has loaded', () => {
    saveSession({ questions: QS, currentIndex: 1, isAnswered: true, batch: [{}, {}], adaptive: { target: 5 } });
    expect(loadSavedSession()).not.toBeNull();
    saveSession({ questions: QS, currentIndex: 1, isAnswered: true, batch: [{}, {}], adaptive: { target: 2 } });
    expect(loadSavedSession()).toBeNull();
  });
  it('lets a week-old session go', () => {
    saveSession({ questions: QS, currentIndex: 0, isAnswered: false });
    expect(loadSavedSession(NOW + 8 * 24 * 3600 * 1000)).toBeNull();
  });
  it('survives a corrupt or missing draft', () => {
    localStorage.setItem('ree_practice_cache', '{nope');
    expect(loadSavedSession()).toBeNull();
    clearSavedSession();
    expect(loadSavedSession()).toBeNull();
  });
});
