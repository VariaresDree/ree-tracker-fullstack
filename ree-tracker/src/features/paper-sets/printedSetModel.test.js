// The printed-set model: ids, the create body, edits laid over the drawn
// items (the renderers and the .tex take the result), and the PATCH rules the
// device applies the way the server does.
import { describe, it, expect, beforeEach } from 'vitest';
import { PRINT_ID_RE, keyVersionOf } from '@ree/shared';
import {
  applySetPatch, defaultPrefs, editFor, effectiveDraw, formFor, isUnusedSet, mergeDelta, newPrintId,
  optionCountsOf, rememberPaper, setSizeProblem, summaryOf, toPrintedSet,
} from './printedSetModel';

const item = (n, over = {}) => ({
  n, id: `q${n}`, subject: 'EE', subtopic: 'Protection', difficulty: 2, type: 'conceptual',
  text: `Question ${n}: $x^2$`, options: ['A. 10 V', '20 V', '30 V', '40 V'], answer: '20 V', answerIndex: 1,
  answerLetter: 'B', explanation: 'Because $V = IR$.', figure: false, ...over,
});

const draw = () => ({
  plan: { kind: 'subject', profile: 'prc_subject', code: 'EE', title: 'Electrical Engineering Professional Subjects', sections: [], timeAllotmentMins: 360 },
  sittingKey: 'sk-1',
  generatedAt: '2026-10-21T01:00:00.000Z',
  setId: 'abc123',
  keyVersion: 'k1',
  setLabel: 'SET B',
  sections: [{ subject: 'EE', title: 'Electrical Engineering Professional Subjects', from: 1, to: 3, requested: 3, drawn: 3 }],
  items: [item(1), item(2, { answerIndex: -1, answerLetter: '-', answer: '99 V' }), item(3)],
  warnings: { unmatched: [2], shortfall: [], focusFallback: false },
});

beforeEach(() => localStorage.clear());

describe('printed set model', () => {
  it('makes 12-character Crockford ids from random bytes', () => {
    for (let i = 0; i < 20; i += 1) expect(newPrintId()).toMatch(PRINT_ID_RE);
    expect(newPrintId((n) => new Uint8Array(n).fill(31))).toBe('ZZZZZZZZZZZZ');
    expect(newPrintId((n) => new Uint8Array(n).fill(32))).toBe('000000000000');
  });

  it('starts on the paper last chosen on this device, with every document', () => {
    expect(defaultPrefs()).toEqual({ paper: 'a4', docs: { paper: true, sheet: true, key: true }, solutions: true });
    rememberPaper('long');
    expect(defaultPrefs().paper).toBe('long');
    rememberPaper('tabloid');
    expect(defaultPrefs().paper).toBe('long');
  });

  it('builds the create body from a draw: identity, plan, sections and the items as drawn', () => {
    const body = toPrintedSet(draw(), { id: 'K7P29QXAM3TD', config: { mode: 'subject', subject: 'EE', isPrcStandard: true, count: 100, source: 'library', extra: 'x', cognitiveFocus: 'mixed' } });
    expect(body).toMatchObject({
      id: 'K7P29QXAM3TD', contentId: 'abc123', label: 'SET B', code: 'EE', profile: 'prc_subject',
      sittingKey: 'sk-1', generatedAt: '2026-10-21T01:00:00.000Z', edits: {},
      config: { mode: 'subject', subject: 'EE', isPrcStandard: true, count: 100, source: 'library', cognitiveFocus: 'mixed' },
      sections: [{ subject: 'EE', title: 'Electrical Engineering Professional Subjects', from: 1, to: 3 }],
      prefs: { paper: 'a4', docs: { paper: true, sheet: true, key: true }, solutions: true },
    });
    expect(body.config.extra).toBeUndefined();
    expect(Object.keys(body.items[0]).sort()).toEqual(
      ['answer', 'answerIndex', 'difficulty', 'explanation', 'figure', 'id', 'n', 'options', 'subject', 'subtopic', 'text', 'type'],
    );
    expect(body.items[1].answerIndex).toBe(-1);
    expect(setSizeProblem(body)).toBeNull();
  });

  it('maps an unknown profile to custom, and refuses an oversize item or set', () => {
    const d = draw();
    d.plan.profile = 'mystery';
    const body = toPrintedSet(d, { id: 'K7P29QXAM3TD' });
    expect(body.profile).toBe('custom');
    body.items[2].text = 'x'.repeat(8001);
    expect(setSizeProblem(body)).toBe('Question 3 is too long to print. Draw a new set.');
  });

  it('lays the edits over the items: the draw the paper, sheet, key and .tex render', () => {
    const set = {
      ...toPrintedSet(draw(), { id: 'K7P29QXAM3TD' }),
      edits: { 1: { text: 'Edited: $\\frac{1}{2}$' }, 2: { answerIndex: 3 } },
    };
    const d = effectiveDraw(set);
    expect(d.printId).toBe('K7P29QXAM3TD');
    expect(d.paper).toBe('a4');
    expect(d.setId).toBe('abc123');
    expect(d.setLabel).toBe('SET B');
    expect(d.items[0]).toMatchObject({ text: 'Edited: $\\frac{1}{2}$', edited: true, answerLetter: 'B' });
    expect(d.items[1]).toMatchObject({ answerIndex: 3, answerLetter: 'D', edited: true });
    expect(d.items[2].edited).toBe(false);
    // The key's version follows the edited key, and the unmatched warning clears.
    expect(d.keyVersion).toBe(keyVersionOf([{ answerIndex: 1 }, { answerIndex: 3 }, { answerIndex: 1 }]));
    expect(d.warnings.unmatched).toEqual([]);
    expect(optionCountsOf(d.items)).toEqual([4, 4, 4]);
  });

  it('applies a PATCH as the server does: edits per item, null reverts, prefs replace, printed once', () => {
    const set = { ...toPrintedSet(draw(), { id: 'K7P29QXAM3TD' }), edits: { 1: { text: 'old' } }, printedAt: null };
    const a = applySetPatch(set, { edits: { 1: null, 3: { answerIndex: 0 } }, prefs: { paper: 'long', docs: { paper: true, sheet: false, key: true }, solutions: false } }, 'T1');
    expect(a.edits).toEqual({ 3: { answerIndex: 0 } });
    expect(a.prefs.paper).toBe('long');
    expect(a.printedAt).toBeNull();
    expect(a.keyVersion).toBe(keyVersionOf([{ answerIndex: 1 }, { answerIndex: -1 }, { answerIndex: 0 }]));
    const b = applySetPatch(a, { printed: true }, 'T2');
    const c = applySetPatch(b, { printed: true }, 'T3');
    expect([b.printedAt, c.printedAt]).toEqual(['T2', 'T2']);
    // Applying the same write twice changes nothing.
    expect(applySetPatch(a, { edits: { 3: { answerIndex: 0 } } }, 'T1').edits).toEqual(a.edits);
  });

  it('merges unsent changes: later edits per item win, prefs replace, printed sticks', () => {
    expect(mergeDelta(null, { printed: true })).toEqual({ printed: true });
    expect(mergeDelta({ edits: { 1: { text: 'a' } }, printed: true }, { edits: { 1: null, 2: { text: 'b' } }, prefs: { paper: 'a4' } }))
      .toEqual({ edits: { 1: null, 2: { text: 'b' } }, printed: true, prefs: { paper: 'a4' } });
  });

  it('an edit keeps only what differs from the bank, and options always carry the answer', () => {
    const original = item(1);
    const form = formFor(original);
    expect(form.options).toEqual(['10 V', '20 V', '30 V', '40 V']); // the choice prefix is the paper's own
    expect(editFor(original, form)).toBeNull();
    expect(editFor(original, { ...form, text: '  New stem  ' })).toEqual({ text: 'New stem' });
    expect(editFor(original, { ...form, answerIndex: 2 })).toEqual({ answerIndex: 2 });
    expect(editFor(original, { ...form, options: ['10 V', '20 V', '30 V'], answerIndex: 1 }))
      .toEqual({ options: ['10 V', '20 V', '30 V'], answerIndex: 1 });
    expect(editFor(original, { ...form, explanation: '' })).toEqual({ explanation: null });
    expect(editFor({ ...original, explanation: null }, { ...form, explanation: '  ' })).toBeNull();
  });

  it('a set is unused until it is printed, edited or has sheets', () => {
    const set = { edits: {}, printedAt: null };
    expect(isUnusedSet(set, 0)).toBe(true);
    expect(isUnusedSet({ ...set, printedAt: 'x' }, 0)).toBe(false);
    expect(isUnusedSet({ ...set, edits: { 1: { text: 'x' } } }, 0)).toBe(false);
    expect(isUnusedSet(set, 2)).toBe(false);
  });

  it('a summary drops the items and edits but says whether it was edited', () => {
    const s = summaryOf({ ...toPrintedSet(draw(), { id: 'K7P29QXAM3TD' }), edits: { 2: { text: 'x' } } });
    expect(s.items).toBeUndefined();
    expect(s.edits).toBeUndefined();
    expect(s).toMatchObject({ id: 'K7P29QXAM3TD', itemCount: 3, edited: true });
  });
});
