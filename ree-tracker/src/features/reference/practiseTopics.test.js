import { describe, it, expect, vi, beforeEach } from 'vitest';

// After a card review, two questions on each topic rated.
const fetchVaultQuestions = vi.fn();
vi.mock('../../services/dbQueries', () => ({ fetchVaultQuestions: (...a) => fetchVaultQuestions(...a) }));
const { topicsOf, questionsForTopics, MAX_TOPICS } = await import('./practiseTopics');

const card = (id, subject, name) => ({ id, subject, topic: { id: `t-${name}`, name } });
const q = (id, extra = {}) => ({ id, text: `Q ${id}`, answer: 'A', ...extra });

beforeEach(() => fetchVaultQuestions.mockReset());

describe('topicsOf', () => {
  it('the distinct topics rated, in order, at most five', () => {
    const cards = [card('a', 'EE', 'Machines'), card('b', 'EE', 'Machines'), card('c', 'EE', 'Protection'), { id: 'd', subject: 'EE', topic: null }];
    expect(topicsOf(cards)).toEqual([{ subject: 'EE', topic: 'Machines' }, { subject: 'EE', topic: 'Protection' }]);
    const many = Array.from({ length: 8 }, (_, i) => card(`m${i}`, 'EE', `T${i}`));
    expect(topicsOf(many)).toHaveLength(MAX_TOPICS);
  });
});

describe('questionsForTopics', () => {
  it('draws two per topic, skipping a topic that fails, repeats and questions without a key', async () => {
    fetchVaultQuestions
      .mockResolvedValueOnce([q('1'), q('2'), q('3')])
      .mockRejectedValueOnce(new Error('[OFFLINE]'))
      .mockResolvedValueOnce([q('2'), q('4', { answer: '' }), q('5')]);
    const items = await questionsForTopics([
      { subject: 'EE', topic: 'Machines' }, { subject: 'EE', topic: 'Protection' }, { subject: 'ESAS', topic: 'Chemistry' },
    ]);
    expect(fetchVaultQuestions).toHaveBeenCalledWith('EE', 'Machines', 2);
    expect(fetchVaultQuestions).toHaveBeenCalledWith('ESAS', 'Chemistry', 2);
    // Two from the first; from the third, '2' is a repeat and '4' has no key.
    expect(items.map((x) => x.id)).toEqual(['1', '2']);
  });
});
