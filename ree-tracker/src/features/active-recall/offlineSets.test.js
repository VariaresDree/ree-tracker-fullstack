import { describe, it, expect, vi, beforeEach } from 'vitest';

const getOfflineQuestions = vi.fn();
vi.mock('../../services/offlinePack', () => ({ getOfflineQuestions: (...a) => getOfflineQuestions(...a) }));

const { offlineDrill, offlineMix, weakestTopics } = await import('./offlineSets');

const q = (id, subtopic) => ({ id, subtopic, text: id, answer: 'A' });
const POOL = [q('a', 'Protection'), q('b', 'Machines'), q('c', 'Calculus')];

beforeEach(() => {
  getOfflineQuestions.mockReset();
  getOfflineQuestions.mockResolvedValue(POOL);
});

describe('weakestTopics', () => {
  const topic = (subtopic, attempts, correct) => ({ subtopic, attempts, correct });

  it('takes the lowest scores, with enough answers to mean anything', () => {
    expect(weakestTopics({
      A: topic('A', 10, 9),
      B: topic('B', 10, 2),
      C: topic('C', 2, 0), // too few
      D: topic('D', 0, 0), // a heatmap tile with no answers
      E: topic('E', 4, 2),
    }, 2)).toEqual(['B', 'E']);
  });

  it('has nothing to say with no stats', () => {
    expect(weakestTopics(null)).toEqual([]);
    expect(weakestTopics(undefined)).toEqual([]);
  });
});

describe('offlineDrill', () => {
  it('drills the chosen topic, in the chosen subject, and says where it came from', async () => {
    const { items, note } = await offlineDrill({ topic: ' protection ', subject: 'EE' });
    expect(getOfflineQuestions.mock.calls[0][0]).toBe('EE');
    expect(items.map((x) => x.id)).toEqual(['a']);
    expect(note).toMatch(/saved on this device, on {2}protection/);
  });

  it('with no topic, it uses the weakest this device knows of', async () => {
    const { items, note } = await offlineDrill({
      microTopics: { Machines: { subtopic: 'Machines', attempts: 5, correct: 1 }, Calculus: { subtopic: 'Calculus', attempts: 5, correct: 5 } },
    });
    expect(items.map((x) => x.id)).toEqual(['b', 'c']);
    expect(note).toMatch(/your weakest topics/);
  });

  it('with nothing on that topic, it says so and gives a mix', async () => {
    const { items, note } = await offlineDrill({ topic: 'Illumination' });
    expect(items).toEqual(POOL);
    expect(note).toMatch(/no questions on Illumination/);
  });

  it('with no stats, it says it doesn’t know your weak topics yet', async () => {
    const { items, note } = await offlineDrill();
    expect(items).toEqual(POOL);
    expect(note).toMatch(/doesn’t know your weakest topics yet/);
  });

  it('with no pack, it says what to do', async () => {
    getOfflineQuestions.mockResolvedValue([]);
    await expect(offlineDrill({ topic: 'Protection' })).rejects.toThrow(/Connect once/);
  });
});

describe('offlineMix', () => {
  it('draws the whole pack and names what it stands in for', async () => {
    const { items, note } = await offlineMix('your review queue');
    expect(items).toEqual(POOL);
    expect(note).toMatch(/not your review queue/);
  });

  it('with no pack, it says what to do', async () => {
    getOfflineQuestions.mockResolvedValue([]);
    await expect(offlineMix('today’s loop')).rejects.toThrow(/Connect once/);
  });
});
