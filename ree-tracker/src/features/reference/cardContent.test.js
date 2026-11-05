// Every field of the hand-written formula cards through the real KaTeX, as the
// server has no KaTeX to catch a typo with: a bad command would show on the card in
// red. Also keeps them to a card's length, as the rules' limits count LaTeX source.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { mathIssues } from '../../utils/mathIssues';
import { withMathDelimiters } from '../../utils/mathDelimiters';

const require = createRequire(import.meta.url);
const { REWRITES } = require('../../../../ree-tracker-backend/scripts/data/referenceCardRewrites');
const { DRAFTS } = require('../../../../ree-tracker-backend/scripts/data/referenceCardDrafts');

const all = [...REWRITES, ...DRAFTS];

const fieldsOf = (card) => [
  ['symbol', card.symbol],
  ['formula', card.f],
  ['value', card.value],
  ['unit', card.unit],
  ['description', card.d],
  ['tip', card.tip],
  ...(card.vars ?? []).flatMap((v) => [[`${v.symbol} symbol`, v.symbol], [`${v.symbol} meaning`, v.meaning], [`${v.symbol} unit`, v.unit]]),
].filter(([, text]) => text);

describe('the hand-written formula cards', () => {
  it('has them all', () => {
    expect(REWRITES.length).toBe(65);
    expect(DRAFTS.length).toBeGreaterThan(150);
  });

  it('typesets every field, each as the card will render it', () => {
    const broken = [];
    for (const card of all) {
      for (const [field, text] of fieldsOf(card)) {
        const issues = mathIssues(withMathDelimiters(text));
        if (issues.length > 0) broken.push(`${card.name} › ${field}: ${issues.join('; ')}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('keeps math in the symbol and formula, not stray in the name', () => {
    for (const card of all) expect(card.name, card.name).not.toMatch(/[$\\]/);
  });
});
