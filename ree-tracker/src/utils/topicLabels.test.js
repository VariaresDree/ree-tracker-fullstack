import { describe, it, expect } from 'vitest';
import { canonicalTopic, isKnownTopic, labelForGenerated } from './topicLabels';

// Live EE topics on production (TOS editor managed), 2026-10-03.
const EE = ['Electric Circuits 1', 'Electrical Transient Analysis', 'Quantities/units/constants (EE)'];

describe('canonicalTopic', () => {
  it('returns the live spelling for a case/whitespace variant', () => {
    expect(canonicalTopic('  electrical transient analysis ', EE)).toBe('Electrical Transient Analysis');
  });

  it('returns null for a label the live taxonomy does not have', () => {
    expect(canonicalTopic('Transient Response', EE)).toBeNull();
    expect(canonicalTopic('', EE)).toBeNull();
    expect(canonicalTopic('Electric Circuits 1', undefined)).toBeNull();
  });
});

describe('isKnownTopic — the client mirror of the server publish gate', () => {
  it('accepts a live topic and refuses a stale one', () => {
    expect(isKnownTopic('Electric Circuits 1', EE)).toBe(true);
    expect(isKnownTopic('AC Impedance', EE)).toBe(false);
  });

  it('accepts anything when the subject has no taxonomy loaded (the server then decides)', () => {
    expect(isKnownTopic('AC Impedance', [])).toBe(true);
    expect(isKnownTopic('AC Impedance', undefined)).toBe(true);
  });
});

describe('labelForGenerated — the subtopic an AI-generated question is filed under', () => {
  it('a specific target topic wins over whatever the model wrote', () => {
    expect(labelForGenerated('Transient Response', { target: 'Electrical Transient Analysis', topics: EE }))
      .toBe('Electrical Transient Analysis');
  });

  it('for "All topics", snaps the model label to the live spelling', () => {
    expect(labelForGenerated('electric circuits 1', { target: 'All', topics: EE })).toBe('Electric Circuits 1');
  });

  it('for "All topics", keeps an unknown model label as-is so the review queue flags it', () => {
    expect(labelForGenerated('AC Impedance', { target: 'All', topics: EE })).toBe('AC Impedance');
  });

  it('falls back to the target when the model omits the field', () => {
    expect(labelForGenerated(undefined, { target: 'All', topics: EE })).toBe('All');
  });
});
