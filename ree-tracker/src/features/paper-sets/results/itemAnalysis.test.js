// A printed set's results from its scanned sheets: the takers' scores, each
// item's difficulty and answer counts, the wrong answer chosen most, and the
// discrimination index once there are enough takers.
import { describe, it, expect } from 'vitest';
import { itemAnalysis } from './itemAnalysis';

const item = (n, subject, answerIndex, options = ['a', 'b', 'c', 'd']) => ({
  n, subject, text: `Question ${n}: $x^${n}$`, options, answer: options[answerIndex] ?? 'x', answerIndex, explanation: null,
});
const SET = {
  id: 'K7P29QXAM3TD',
  label: 'SET B',
  profile: 'custom',
  sections: [{ subject: 'EE', from: 1, to: 4 }],
  // Keys: B, A, C, and item 4 has no matching key (not scored).
  items: [item(1, 'EE', 1), item(2, 'EE', 0), item(3, 'EE', 2, ['a', 'b', 'c', 'd', 'e']), item(4, 'EE', -1)],
  edits: {},
};
const sheet = (answers, extra = {}) => ({ id: answers + Math.random(), answers, isSelf: false, scannedAt: '2026-10-27T02:00:00.000Z', takerName: 'T', ...extra });

describe('itemAnalysis', () => {
  it('scores the takers and leaves self-checks out unless asked', () => {
    const sheets = [sheet('BACA'), sheet('BD*-'), sheet('CDE-'), sheet('BAC-', { isSelf: true, takerName: null })];
    const a = itemAnalysis(SET, sheets);
    expect(a.takers).toBe(3);
    // 3 scored items each: 100, 33.3, 0.
    expect(a.highest).toBe(100);
    expect(a.lowest).toBe(0);
    expect(a.mean).toBe(44.4);
    expect(a.sd).toBe(41.6);
    expect(a.passRate).toBeNull(); // not a PRC paper
    expect(itemAnalysis(SET, sheets, { includeSelf: true }).takers).toBe(4);
  });

  it('counts each option, blanks and double marks, and finds the wrong answer chosen most', () => {
    const a = itemAnalysis(SET, [sheet('BACA'), sheet('BD*-'), sheet('CDE-'), sheet('-DA-')]);
    const [one, two, three, four] = a.items;
    expect(one).toMatchObject({ n: 1, key: 'B', p: 0.5, counts: { A: 0, B: 2, C: 1, D: 0, blank: 1, multiple: 0 }, topWrong: 'C' });
    expect(two).toMatchObject({ key: 'A', p: 0.25, topWrong: 'D' });
    expect(three.counts).toEqual({ A: 1, B: 0, C: 1, D: 0, E: 1, blank: 0, multiple: 1 });
    // A tie between A and E: the earlier letter.
    expect(three.topWrong).toBe('A');
    // No key: no difficulty, nothing is "wrong".
    expect(four).toMatchObject({ key: null, p: null, topWrong: 'A' });
    expect(one.discrimination).toBeNull(); // under 10 takers
  });

  it('lists the most-missed items, lowest share right first, with their stems', () => {
    const a = itemAnalysis(SET, [sheet('BACA'), sheet('BD*-'), sheet('CDE-'), sheet('-DA-')]);
    expect(a.mostMissed.map((x) => [x.n, x.p])).toEqual([[2, 0.25], [3, 0.25], [1, 0.5]]);
    expect(a.mostMissed[0].text).toBe('Question 2: $x^2$');
    // An item everyone got is not "missed".
    expect(itemAnalysis(SET, [sheet('BAC-')]).mostMissed).toEqual([]);
  });

  it('measures discrimination (upper minus lower 27%) from 10 takers up', () => {
    // 10 takers: 3 strong ones get item 1 right, 3 weak ones get it wrong.
    const strong = Array.from({ length: 3 }, () => sheet('BAC-'));
    const middle = Array.from({ length: 4 }, () => sheet('BAA-'));
    const weak = Array.from({ length: 3 }, () => sheet('CBA-'));
    const a = itemAnalysis(SET, [...weak, ...middle, ...strong]);
    expect(a.takers).toBe(10);
    expect(a.items[0].discrimination).toBe(1); // 3/3 - 0/3
    expect(a.items[1].discrimination).toBe(1);
    expect(a.items[3].discrimination).toBeNull(); // not scored
  });

  it('a PRC paper has a pass rate; edits to the key re-score every sheet', () => {
    const prc = { ...SET, profile: 'prc_subject' };
    const a = itemAnalysis(prc, [sheet('BAC-'), sheet('CDA-')]);
    expect(a.passRate).toBe(50);
    const edited = { ...SET, edits: { 1: { answerIndex: 2 } } };
    expect(itemAnalysis(edited, [sheet('CAC-')]).highest).toBe(100);
  });

  it('no sheets: nothing to average', () => {
    const a = itemAnalysis(SET, []);
    expect(a).toMatchObject({ takers: 0, mean: null, sd: null, highest: null, lowest: null, passRate: null, mostMissed: [] });
    expect(a.items).toHaveLength(4);
  });
});
