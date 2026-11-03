import { describe, it, expect } from 'vitest';
import { GENERAL, groupCards } from './groupCards';

const card = (name, subtopicTag, kind = 'formula') => ({ name, subtopicTag, kind });
const labels = (groups) => groups.map((g) => g.label);

describe('groupCards by subtopic', () => {
  it('treats tags that differ only in letter case or spaces as one', () => {
    const groups = groupCards([card('a', 'AC Power'), card('b', 'ac power '), card('c', 'AC POWER')], { by: 'subtopic' });
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('AC Power');
    expect(groups[0].cards).toHaveLength(3);
  });

  it('folds a tag with one card into General, which comes last', () => {
    const groups = groupCards([card('a', 'Resonance'), card('b', 'Resonance'), card('c', 'Boltzmann Constant'), card('d', null)], { by: 'subtopic' });
    expect(labels(groups)).toEqual(['Resonance', GENERAL]);
    expect(groups[1].cards.map((c) => c.name)).toEqual(['c', 'd']);
  });

  it('a topic of one-card tags has no headings to show', () => {
    expect(labels(groupCards([card('a', 'X'), card('b', 'Y')], { by: 'subtopic' }))).toEqual([GENERAL]);
  });
});
