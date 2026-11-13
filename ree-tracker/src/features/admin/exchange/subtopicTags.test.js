import { describe, it, expect } from 'vitest';
import { buildTagPrompt, readTagReply, splitTags } from './subtopicTags';

const subtopics = [{ id: 's-ac', name: 'AC Circuits' }, { id: 's-dc', name: 'DC Circuits' }];
const items = [
  { id: 'q1', text: 'Find the impedance.', options: ['1 Ω', '2 Ω'] },
  { id: 'q2', text: 'Find the current.', options: [] },
  { id: 'q3', text: 'Who wrote the code?', options: [] },
];

describe('buildTagPrompt', () => {
  it('names the subtopics and numbers the questions', () => {
    const p = buildTagPrompt({ subject: 'EE', topic: 'Circuits', subtopics, items });
    expect(p).toContain('Topic: EE › Circuits');
    expect(p).toContain('- AC Circuits\n- DC Circuits');
    expect(p).toContain('1. Find the impedance.\n   Options: 1 Ω | 2 Ω');
    expect(p).toContain('3. Who wrote the code?');
    expect(p).not.toContain('q1');
  });

  it('clips a long stem', () => {
    const p = buildTagPrompt({ subject: 'EE', topic: 'C', subtopics, items: [{ id: 'q', text: 'x'.repeat(2000) }] });
    expect(p).toContain(`${'x'.repeat(500)}…`);
    expect(p).not.toContain('x'.repeat(501));
  });
});

describe('readTagReply', () => {
  it('matches names loosely, and only sure exact names save', () => {
    const read = readTagReply({ tags: [
      { n: 1, subtopic: ' ac circuits ', sure: true },
      { n: 2, subtopic: 'DC Circuits', sure: false },
      { n: 3, subtopic: 'none', sure: true },
    ] }, items, subtopics);
    expect(read).toEqual([
      { id: 'q1', guess: 'ac circuits', subtopicId: 's-ac', sure: true },
      { id: 'q2', guess: 'DC Circuits', subtopicId: 's-dc', sure: false },
      { id: 'q3', guess: null, subtopicId: null, sure: false },
    ]);
    expect(splitTags(read)).toEqual({ apply: [{ id: 'q1', subtopicId: 's-ac' }], review: [read[1], read[2]] });
  });

  it('a name not on the list waits for review, however sure', () => {
    const [row] = readTagReply([{ n: 1, subtopic: 'Three-phase', sure: true }], items.slice(0, 1), subtopics);
    expect(row).toEqual({ id: 'q1', guess: 'Three-phase', subtopicId: null, sure: false });
  });

  it('skipped, repeated and out-of-range numbers', () => {
    const read = readTagReply({ tags: [{ n: 9, subtopic: 'AC Circuits', sure: true }, { n: '2', subtopic: 'DC Circuits', sure: true }, { n: 2, subtopic: 'AC Circuits', sure: true }] }, items, subtopics);
    expect(read.map((r) => r.subtopicId)).toEqual([null, 's-dc', null]);
    expect(readTagReply(null, items, subtopics).every((r) => !r.sure)).toBe(true);
  });

  it('"sure" must be true itself, not a truthy string', () => {
    const [row] = readTagReply({ tags: [{ n: 1, subtopic: 'AC Circuits', sure: 'yes' }] }, items.slice(0, 1), subtopics);
    expect(row.sure).toBe(false);
  });

  // The first live run named "Substation Bus Schemes" for "Substation Types and Bus Schemes".
  it('a near name preselects the one subtopic it clearly means, but never saves on its own', () => {
    const subs = [{ id: 's-bus', name: 'Substation Types and Bus Schemes' }, { id: 's-eq', name: 'Substation Equipment' }];
    const read = readTagReply({ tags: [
      { n: 1, subtopic: 'Substation Bus Schemes', sure: true },
      { n: 2, subtopic: 'Substation', sure: true },
    ] }, items.slice(0, 2), subs);
    expect(read[0]).toEqual({ id: 'q1', guess: 'Substation Bus Schemes', subtopicId: 's-bus', sure: false });
    // Fits both: nothing preselected.
    expect(read[1]).toMatchObject({ subtopicId: null, sure: false });
    expect(splitTags(read).apply).toEqual([]);
  });
});
