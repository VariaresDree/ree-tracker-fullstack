import { describe, it, expect } from 'vitest';
import { answerOf, chooseQuestions, distractorsFor, matchRounds, pickDrillCards, savesRating, shuffled } from './drillPlan';

const card = (id, over = {}) => ({ id, name: `Card ${id}`, kind: 'formula', subject: 'EE', topic: { name: 'Circuits' }, formulaLatex: `$F_${id}$`, ...over });
const POOL = [
  card('a'), card('b'), card('c'), card('d'),
  card('m1', { topic: { name: 'Machines' } }),
  card('e1', { subject: 'ESAS', topic: { name: 'Mechanics' } }),
  card('k1', { kind: 'constant', formulaLatex: null, valueUnit: '$8.854$' }),
];
const fixed = () => 0.42;

describe('shuffled', () => {
  it('keeps every item and leaves the original alone', () => {
    const list = [1, 2, 3, 4, 5];
    expect(shuffled(list, fixed).sort()).toEqual(list);
    expect(list).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('pickDrillCards', () => {
  it('takes the count, or every card for all', () => {
    expect(pickDrillCards(POOL, 3, fixed)).toHaveLength(3);
    expect(pickDrillCards(POOL, 'all', fixed)).toHaveLength(POOL.length);
    expect(pickDrillCards(POOL, 100, fixed)).toHaveLength(POOL.length);
  });

  it('leaves out a card with nothing to ask', () => {
    expect(pickDrillCards([card('x', { formulaLatex: null })], 'all', fixed)).toEqual([]);
  });
});

describe('distractorsFor', () => {
  it('draws from the same topic first', () => {
    const wrong = distractorsFor(POOL[0], POOL, answerOf, 3, fixed);
    expect(wrong.sort()).toEqual(['$F_b$', '$F_c$', '$F_d$']);
  });

  it('widens to the subject, then the kind, and mixes kinds only when it must', () => {
    const small = [card('a'), card('b'), card('m1', { topic: { name: 'Machines' } }), card('e1', { subject: 'ESAS', topic: { name: 'Mechanics' } }), POOL[6]];
    expect(distractorsFor(small[0], small, answerOf, 2, fixed).sort()).toEqual(['$F_b$', '$F_m1$']);
    expect(distractorsFor(small[0], small, answerOf, 3, fixed).sort()).toEqual(['$F_b$', '$F_e1$', '$F_m1$']);
    expect(distractorsFor(small[0], small, answerOf, 4, fixed)).toContain('$8.854$');
  });

  it('never offers one that reads the same as the answer, or itself twice', () => {
    const twins = [card('a'), card('t1', { formulaLatex: '$F_a$' }), card('t2', { formulaLatex: '$F_b$' }), card('t3', { formulaLatex: '$F_b$' })];
    expect(distractorsFor(twins[0], twins, answerOf, 3, fixed)).toEqual(['$F_b$']);
  });

  it('asks a constant for its value, against other constants', () => {
    const constants = [POOL[6], card('k2', { kind: 'constant', formulaLatex: null, valueUnit: '$1.38$' }), card('f')];
    expect(distractorsFor(constants[0], constants, answerOf, 1, fixed)).toEqual(['$1.38$']);
  });
});

describe('chooseQuestions', () => {
  it('asks for the formula from the name, with four different options holding the answer', () => {
    const [q] = chooseQuestions([POOL[0]], POOL, 'formula', fixed);
    expect(q.text).toBe('Card a');
    expect(q.answer).toBe('$F_a$');
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain('$F_a$');
  });

  it('asks for the name from the formula', () => {
    const [q] = chooseQuestions([POOL[0]], POOL, 'name', fixed);
    expect(q.text).toBe('$F_a$');
    expect(q.answer).toBe('Card a');
    expect(q.options).toContain('Card a');
    expect(q.options.every((o) => o.startsWith('Card'))).toBe(true);
  });

  it('wraps a bare formula, so it typesets', () => {
    const bare = [card('x', { formulaLatex: 'F_x' }), ...POOL];
    expect(chooseQuestions([bare[0]], bare, 'formula', fixed)[0].answer).toBe('$F_x$');
  });

  it('leaves out a card it can\'t offer three wrong answers for', () => {
    expect(chooseQuestions([POOL[0]], [POOL[0], POOL[1]], 'formula', fixed)).toEqual([]);
  });
});

describe('matchRounds', () => {
  const many = (n) => Array.from({ length: n }, (_, i) => card(`c${i}`));

  it('makes rounds of five, each holding the same cards twice over', () => {
    const rounds = matchRounds(many(10), fixed);
    expect(rounds.map((r) => r.cards.length)).toEqual([5, 5]);
    for (const r of rounds) {
      expect(r.names.map((c) => c.id).sort()).toEqual(r.cards.map((c) => c.id).sort());
      expect(r.answers.map((c) => c.id).sort()).toEqual(r.cards.map((c) => c.id).sort());
    }
  });

  it('adds a lone card to the round before it', () => {
    expect(matchRounds(many(6), fixed).map((r) => r.cards.length)).toEqual([6]);
    expect(matchRounds(many(7), fixed).map((r) => r.cards.length)).toEqual([5, 2]);
  });

  it('lets only one of two cards with the same formula play', () => {
    const twins = [card('a'), card('b', { formulaLatex: '$F_a$' }), card('c')];
    expect(matchRounds(twins, fixed)[0].cards.map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('has no round for a single card', () => {
    expect(matchRounds([card('a')], fixed)).toEqual([]);
  });
});

describe('savesRating', () => {
  const now = Date.parse('2026-11-05T00:00:00Z');
  const due = { nextReviewDate: '2026-11-04T00:00:00Z' };
  const later = { nextReviewDate: '2026-11-20T00:00:00Z' };

  it('saves any rating of a card you have not rated before', () => {
    expect(savesRating(null, 'good', now)).toBe(true);
  });

  it('saves any rating of a card that is due', () => {
    expect(savesRating(due, 'easy', now)).toBe(true);
  });

  it('saves only Again for a card that is not due, so drilling can\'t stretch its interval', () => {
    expect(savesRating(later, 'again', now)).toBe(true);
    expect(savesRating(later, 'hard', now)).toBe(false);
    expect(savesRating(later, 'good', now)).toBe(false);
    expect(savesRating(later, 'easy', now)).toBe(false);
  });
});
