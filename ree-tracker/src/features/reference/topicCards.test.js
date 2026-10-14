import { describe, it, expect } from 'vitest';
import { cardsForTopic, topicCardsLink } from './topicCards';

// A missed question's formula cards: by the shared Topic id when the question
// carries it, otherwise by the topic's name within the subject.
const card = (id, subject, topicId, name) => ({ id, subject, topic: { id: topicId, name } });
const CARDS = [
  card('c1', 'EE', 't-mach', 'Machines'),
  card('c2', 'EE', 't-mach', 'Machines'),
  card('c3', 'EE', 't-prot', 'Protection'),
  card('c4', 'Mathematics', 't-alg', 'Algebra'),
  card('c5', 'ESAS', 't-gen', 'General'),
  card('c6', 'EE', 't-gen-ee', 'General'),
  { id: 'c7', subject: 'EE', topic: null },
];

describe('cardsForTopic', () => {
  it('matches the topic id first', () => {
    expect(cardsForTopic(CARDS, { topicId: 't-prot', topic: 'Something else', subject: 'EE' }).map((c) => c.id)).toEqual(['c3']);
  });

  it('falls back to the name, with the server’s key (trim, any case), within the subject', () => {
    expect(cardsForTopic(CARDS, { topic: '  machines ', subject: 'EE' }).map((c) => c.id)).toEqual(['c1', 'c2']);
    // A name in two subjects: only the question's own.
    expect(cardsForTopic(CARDS, { topic: 'General', subject: 'ESAS' }).map((c) => c.id)).toEqual(['c5']);
    // Subject spellings are normalised ("Math" is Mathematics).
    expect(cardsForTopic(CARDS, { topic: 'Algebra', subject: 'Math' }).map((c) => c.id)).toEqual(['c4']);
  });

  it('nothing to match on, or nothing to match, is no cards', () => {
    expect(cardsForTopic(CARDS, {})).toEqual([]);
    expect(cardsForTopic(null, { topic: 'Machines' })).toEqual([]);
    expect(cardsForTopic(CARDS, { topic: 'Optics', subject: 'EE' })).toEqual([]);
  });
});

describe('topicCardsLink', () => {
  it('opens Formula cards at the topic', () => {
    expect(topicCardsLink('EE', 'Machines')).toEqual({ to: '/library?tab=formulas', state: { subject: 'EE', topic: 'Machines' } });
  });
});
