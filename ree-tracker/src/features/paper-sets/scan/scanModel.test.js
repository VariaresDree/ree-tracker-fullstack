// The scanner's rules: pages merged per taker, the rows a person should
// check and how they are described, corrections over the reading, the steady
// lock that takes the picture, and the self-check's history entry.
import { describe, it, expect } from 'vitest';
import { scorePaperSheet } from '@ree/shared';
import {
  answerLabel, answersOf, cornerLocks, correctionChoices, firstSelfCheckId, flagSentence, flaggedRows, guideRect,
  mergePages, nearestRow, nextPage, progressLine, refusalReason, selfCheckEntry, selfCheckSubject, steadyLock,
} from './scanModel';

const row = (n, status, extra = {}) => ({ n, status, choice: null, marked: [], confidence: 1, bubbles: [], ...extra });
const single = (n, l) => row(n, 'single', { choice: l, marked: [l] });

describe('pages', () => {
  const page1 = { page: { index: 0, from: 1, to: 3 }, rows: [single(1, 'A'), row(2, 'blank'), row(3, 'multiple', { marked: ['A', 'C'] })] };
  const page2 = { page: { index: 1, from: 4, to: 5 }, rows: [single(4, 'D'), row(5, 'unsure', { choice: 'B' })] };

  it('merges the pages of one sheet in item order, whichever was read first', () => {
    const { rows, missing } = mergePages([page2, page1], 5);
    expect(rows.map((r) => [r.n, r.page])).toEqual([[1, 0], [2, 0], [3, 0], [4, 1], [5, 1]]);
    expect(missing).toEqual([]);
    expect(answersOf(rows, {}, 5)).toBe('A-*DB');
  });

  it('a page not read yet leaves its items missing (and blank in the answers)', () => {
    const { rows, missing } = mergePages([page1], 5);
    expect(missing).toEqual([4, 5]);
    expect(answersOf(rows, {}, 5)).toBe('A-*--');
  });

  it('corrections replace the reading', () => {
    const { rows } = mergePages([page1, page2], 5);
    expect(answersOf(rows, { 3: 'C', 2: 'B', 5: '-', 9: 'A', 1: 'x' }, 5)).toBe('ABCD-');
  });

  it('asks for the first page not read, and calls a page read twice a duplicate', () => {
    expect(nextPage(new Set([0]), 2)).toBe(1);
    expect(nextPage(new Set([0, 1]), 2)).toBeNull();
    expect(refusalReason({ ok: false, reason: 'wrong-page', page: { index: 0 } }, new Set([0]))).toBe('duplicate-page');
    expect(refusalReason({ ok: false, reason: 'wrong-page', page: { index: 2 } }, new Set([0]))).toBe('wrong-page');
    expect(refusalReason({ ok: false, reason: 'wrong-set' }, new Set())).toBe('wrong-set');
    expect(progressLine(0, 2, 1)).toBe('Page 1 of 2 read. Now scan page 2.');
  });
});

describe('rows to check', () => {
  it('says why each one needs a look', () => {
    const rows = [
      single(1, 'B'),
      row(12, 'multiple', { marked: ['C', 'A'] }), // read darkest first; said in letter order
      row(13, 'multiple', { marked: ['A', 'B', 'D'] }),
      row(7, 'unsure', { choice: 'B' }),
      row(8, 'unsure', { choice: 'C', marked: ['C'] }),
      row(9, 'blank'),
    ];
    expect(flaggedRows(rows).map(({ row: r, flag }) => flagSentence(r, flag))).toEqual([
      'Item 12: two marks, A and C',
      'Item 13: three marks, A, B and D',
      'Item 7: faint mark, read as B',
      'Item 8: a second, lighter mark, read as C',
    ]);
    expect(flagSentence(rows[0])).toBe('Item 1: B');
    expect(flagSentence(rows[5])).toBe('Item 9: Blank');
  });

  it('offers the item\u2019s own options, Blank and Two marks', () => {
    expect(correctionChoices(4).map((c) => c.label)).toEqual(['A', 'B', 'C', 'D', 'Blank', 'Two marks (invalid)']);
    expect(correctionChoices(6).map((c) => c.value)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', '-', '*']);
    expect(answerLabel('*')).toBe('Two marks');
    expect(answerLabel('-')).toBe('Blank');
  });

  it('a tap on the sheet picks the nearest row on that page', () => {
    const rows = [
      { ...single(1, 'A'), page: 0, bubbles: [{ cx: 20, cy: 80 }, { cx: 25, cy: 80 }] },
      { ...single(2, 'A'), page: 0, bubbles: [{ cx: 20, cy: 85 }, { cx: 25, cy: 85 }] },
      { ...single(3, 'A'), page: 1, bubbles: [{ cx: 20, cy: 80 }] },
    ];
    expect(nearestRow(rows, 0, 24, 84)).toBe(2);
    expect(nearestRow(rows, 1, 21, 81)).toBe(3);
    expect(nearestRow(rows, 0, 150, 200)).toBeNull();
  });
});

describe('the live viewfinder', () => {
  const quad = (d = 0) => [{ x: 10 + d, y: 10 }, { x: 90, y: 10 + d }, { x: 90, y: 130 }, { x: 10, y: 130 }];
  const found = (d) => ({ found: true, quad: quad(d) });

  it('locks once six frames in a row find the sheet with the corners still', () => {
    const diag = 1000; // 0.8% = 8 px
    expect(steadyLock([found(0), found(1), found(2), found(3), found(4)], { diag })).toBe(false);
    expect(steadyLock([found(0), found(1), found(2), found(3), found(4), found(5)], { diag })).toBe(true);
    expect(steadyLock([found(0), found(1), found(2), found(3), found(4), found(9)], { diag })).toBe(false);
    expect(steadyLock([found(0), found(1), { found: false, quad: null }, found(3), found(4), found(5)], { diag })).toBe(false);
  });

  it('a guide corner locks when a square is near it', () => {
    const g = guideRect(300, 400);
    expect(g.h / g.w).toBeCloseTo(297 / 210, 5);
    const corners = [{ x: g.x, y: g.y }, { x: g.x + g.w, y: g.y }, { x: g.x + g.w, y: g.y + g.h }, { x: g.x, y: g.y + g.h }];
    expect(cornerLocks(corners, [{ x: g.x + 5, y: g.y + 5 }], 20)).toEqual([true, false, false, false]);
  });
});

describe('the self-check in your history', () => {
  const item = (n, subject, answerIndex) => ({ n, subject, options: ['a', 'b', 'c', 'd'], answerIndex });
  const sections = [{ subject: 'Mathematics', from: 1, to: 2 }, { subject: 'ESAS', from: 3, to: 3 }, { subject: 'EE', from: 4, to: 5 }];
  const items = [item(1, 'Mathematics', 0), item(2, 'Mathematics', 1), item(3, 'ESAS', 0), item(4, 'EE', 0), item(5, 'EE', 1)];
  const set = { id: 'K7P29QXAM3TD', label: 'SET B', title: 'Mixed paper', sections };
  const draw = { plan: { title: 'REE Pre-board, mixed paper' }, setLabel: 'SET B', sections, items };

  it('is one outside score: title, source, subject, the score, and a note with each Part and the verdict', () => {
    const score = scorePaperSheet({ items, sections, profile: 'prc_blended' }, 'AB-AC');
    const entry = selfCheckEntry({ set, draw, score, takenOn: '2026-10-27', id: 'id-1' });
    expect(entry).toEqual({
      id: 'id-1',
      title: 'REE Pre-board, mixed paper, SET B',
      source: 'REE.ai paper set',
      subject: 'ALL',
      score: 3,
      total: 5,
      takenOn: '2026-10-27',
      // Math 100, ESAS 0, EE 50: 25 + 0 + 22.5 = 47.5.
      note: 'Printed set K7P2-9QXA-M3TD. Math 2/2, ESAS 0/1, EE 1/2. 47.5% weighted, FAILED.',
      retestOfId: null,
    });
  });

  it('a one-subject paper is that subject; a custom paper gives its percent', () => {
    const ee = [{ subject: 'EE', from: 1, to: 2 }];
    const eeItems = [item(1, 'EE', 0), item(2, 'EE', 1)];
    const score = scorePaperSheet({ items: eeItems, sections: ee, profile: 'custom' }, 'AC');
    const entry = selfCheckEntry({ set: { ...set, sections: ee }, draw: { ...draw, sections: ee, plan: { title: 'x'.repeat(100) } }, score, takenOn: '2026-10-27', id: 'id-2', retestOfId: 'first' });
    expect(entry.subject).toBe('EE');
    expect(entry.title).toHaveLength(80);
    expect(entry.note).toBe('Printed set K7P2-9QXA-M3TD. EE 1/2. 50%.');
    expect(entry.retestOfId).toBe('first');
    expect(selfCheckSubject([{ subject: 'Mathematics' }, { subject: 'Mathematics' }])).toBe('Mathematics');
  });

  it('a second self-check of the set is a retest of the first, while that entry exists in the same subject', () => {
    const sheets = [
      { id: 's2', isSelf: true, outsideScoreId: 'o2', scannedAt: '2026-10-20T00:00:00Z' },
      { id: 's1', isSelf: true, outsideScoreId: 'o1', scannedAt: '2026-10-10T00:00:00Z' },
      { id: 't1', isSelf: false, scannedAt: '2026-10-01T00:00:00Z' },
    ];
    const entries = [{ id: 'o1', subject: 'ALL', retestOfId: null }, { id: 'o2', subject: 'ALL', retestOfId: 'o1' }];
    expect(firstSelfCheckId(sheets, entries, 'ALL')).toBe('o1');
    expect(firstSelfCheckId(sheets, entries, 'EE')).toBeNull();
    // The first entry was deleted from the history: the next one stands in.
    expect(firstSelfCheckId(sheets, [{ id: 'o2', subject: 'ALL', retestOfId: null }], 'ALL')).toBe('o2');
    expect(firstSelfCheckId([], entries, 'ALL')).toBeNull();
  });
});
