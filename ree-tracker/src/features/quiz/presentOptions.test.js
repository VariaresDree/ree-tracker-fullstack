// The order a sitting shows a question's choices in.
import { describe, it, expect } from 'vitest';
import { optionKey, orderOptions } from '@ree/shared';
import { presentOptions } from './presentOptions';

const opts = (n) => [`a${n}`, `b${n}`, `c${n}`, `d${n}`];

describe('presentOptions', () => {
  it('keys a question with an id on the sitting and the id, as a review rebuilds it', () => {
    const q = { id: 'q1', options: opts(1) };
    expect(presentOptions(q, 's1').options).toEqual(orderOptions(opts(1), optionKey('s1', 'q1')));
    expect(presentOptions(q, 's1')).toEqual(presentOptions(q, 's1'));
    expect(q.options).toEqual(opts(1));
  });

  it("questions with no id (an unsaved AI question) don't all share one order", () => {
    const orders = new Set();
    for (let i = 0; i < 20; i += 1) {
      const shown = presentOptions({ text: `Question ${i}`, options: ['w', 'x', 'y', 'z'] }, 'sitting');
      orders.add(shown.options.join());
    }
    expect(orders.size).toBeGreaterThan(5);
  });

  it('leaves a question with fewer than two choices as it is', () => {
    const q = { id: 'q', options: ['only'] };
    expect(presentOptions(q, 's')).toBe(q);
    expect(presentOptions(null, 's')).toBeNull();
  });
});
