import { describe, it, expect } from 'vitest';
import { changeWords, halves, halvesLine, sittingChange } from './sittingDelta';

const row = (id, date, extra = {}) => ({ id, date, kind: 'blended', isPrcStandard: false, targetSubject: 'BLENDED', score: 60, ...extra });

describe('sittingChange', () => {
  const history = [
    row('new', '2026-11-14T02:00:00Z', { generalAverage: 66.4, subjectScores: { Mathematics: 70, ESAS: 60, EE: 62 } }),
    row('ee-paper', '2026-11-10T02:00:00Z', { kind: 'subject', targetSubject: 'EE', generalAverage: 90 }),
    row('old', '2026-11-03T02:00:00Z', { generalAverage: 62.2, subjectScores: { Mathematics: 70, ESAS: 71, EE: 54 } }),
    row('oldest', '2026-10-01T02:00:00Z', { generalAverage: 20, subjectScores: { Mathematics: 10, ESAS: 10, EE: 10 } }),
  ];

  it('compares with the newest earlier sitting of the same format, skipping other formats', () => {
    expect(sittingChange(history, 'new')).toEqual({ date: '2026-11-03T02:00:00Z', overall: 4.2, subjects: { Mathematics: 0, ESAS: -11, EE: 8 } });
    // Any order in, the same answer out.
    expect(sittingChange([...history].reverse(), 'new').overall).toBe(4.2);
  });

  it('the first of its format, or a sitting not in the history yet, has nothing to compare', () => {
    expect(sittingChange(history, 'ee-paper')).toBeNull();
    expect(sittingChange(history, 'oldest')).toBeNull();
    expect(sittingChange(history, 'missing')).toBeNull();
    expect(sittingChange(null, 'new')).toBeNull();
  });

  it('a subject only one of the two sittings asked is left out; no average falls back to the raw score', () => {
    const two = [
      row('b', '2026-11-14T02:00:00Z', { score: 75, subjectScores: { EE: 75 } }),
      row('a', '2026-11-03T02:00:00Z', { score: 60, subjectScores: { Mathematics: 60 } }),
    ];
    expect(sittingChange(two, 'b')).toEqual({ date: '2026-11-03T02:00:00Z', overall: 15, subjects: {} });
  });

  it('says a change in words', () => {
    expect([8, -3.5, 0].map(changeWords)).toEqual(['Up 8', 'Down 3.5', 'Level']);
  });
});

describe('halves', () => {
  // `right` of the first half and of the second, out of 10 each.
  const paper = (firstRight, secondRight, n = 20) => Array.from({ length: n }, (_, i) => {
    const half = i < n / 2 ? firstRight : secondRight;
    return { answer: 'A', userAnswer: (i % (n / 2)) < half ? 'A' : (i % 3 === 0 ? null : 'B') };
  });

  it('says when the second half fell away, or picked up, by 10 points or more', () => {
    expect(halves(paper(8, 5))).toEqual({ first: 80, second: 50 });
    expect(halvesLine(paper(8, 5))).toBe('Your second half was 30 points lower than your first (50% against 80%).');
    expect(halvesLine(paper(5, 7))).toBe('Your second half was 20 points higher than your first (70% against 50%).');
  });

  it('even halves, or a short paper, say nothing', () => {
    expect(halves(paper(7, 7))).toBeNull();
    expect(halvesLine(paper(4, 1, 10))).toBeNull();
    expect(halves(null)).toBeNull();
  });
});
