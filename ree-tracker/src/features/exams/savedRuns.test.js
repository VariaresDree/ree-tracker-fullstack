// A saved run says how far along it is, and how much of its running clock is left.
import { describe, it, expect, beforeEach } from 'vitest';
import { draftSummary, readSavedRuns } from './savedRuns';

const NOW = 1_000_000_000;
const QS = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

beforeEach(() => localStorage.clear());

describe('draftSummary', () => {
  it('counts answers and the time left', () => {
    expect(draftSummary({ questions: QS, answers: { 0: 'x', 1: null, 2: '' }, endTime: NOW + 95_000 }, NOW)).toBe('1 of 3 answered · 1m 35s left');
  });
  it('says when the clock ran out while away', () => {
    expect(draftSummary({ questions: QS, answers: {}, endTime: NOW - 5 }, NOW)).toBe('0 of 3 answered · time is up, so it submits when you open it');
  });
  it('an older draft with no deadline leaves the time out', () => {
    expect(draftSummary({ questions: QS, answers: {} }, NOW)).toBe('0 of 3 answered');
  });
});

describe('readSavedRuns', () => {
  it('finds nothing on a clean device', () => {
    expect(readSavedRuns(NOW)).toEqual({ mock: null, gauntlet: null, board: null });
  });
  it('finds a mock, a Gauntlet run and a full board', () => {
    localStorage.setItem('ree_sim_cache', JSON.stringify({ questions: QS, answers: {}, endTime: NOW + 60_000 }));
    localStorage.setItem('ree_gauntlet_cache', JSON.stringify({ level: '2', questions: QS, answers: { 0: 'x' } }));
    localStorage.setItem('ree_full_board', JSON.stringify({ sessionId: 's', startedAt: NOW, sectionIndex: 1, sections: [] }));
    const saved = readSavedRuns(NOW);
    expect(saved.mock.summary).toMatch(/^0 of 3 answered/);
    expect(saved.gauntlet).toEqual({ level: '2', summary: '1 of 3 answered' });
    expect(saved.board.summary).toBe('1 of 3 sections done');
  });
  it('a corrupt draft is no draft', () => {
    localStorage.setItem('ree_sim_cache', '{nope');
    expect(readSavedRuns(NOW).mock).toBeNull();
  });
});
