// How a paper's questions are picked, and the sitting that draws by it.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BOARD_GROUPS, ownBlueprint, ownCountsFromBoard } from '@ree/shared/boardItems';

vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => 't') }) }));
vi.mock('../../services/geminiApi', () => ({ generateQuestionsAI: vi.fn() }));
const api = {
  updateQuestionInBank: vi.fn(), fetchVaultQuestions: vi.fn(), finalizeExamSession: vi.fn(() => Promise.resolve({})),
  syncTelemetryBatch: vi.fn(() => Promise.resolve({})), getAnalyticsProfile: vi.fn(() => Promise.resolve(null)),
  fetchMultiplayerBattle: vi.fn(), fetchSyllabusWeights: vi.fn(async () => ({ Mathematics: 0.25, ESAS: 0.3, EE: 0.45 })),
  fetchBoardGroups: vi.fn(), saveBookmark: vi.fn(), removeBookmark: vi.fn(),
};
vi.mock('../../services/dbQueries', () => api);
const storeState = { stats: {}, currentSessionId: 's', dynamicTOS: {}, queuePendingWrite: vi.fn(), setStats: vi.fn() };
vi.mock('../../store/useStore', () => ({ useStore: { getState: () => storeState } }));
vi.mock('../../store/slices', () => ({
  useEngineActionsSlice: () => ({ dynamicTOS: {}, setStats: vi.fn(), startSession: vi.fn(), endSession: vi.fn(() => Promise.resolve()) }),
}));
vi.mock('../../services/analyticsSync', () => ({ normalizeMicroTopics: (m) => m }));

const { drawApplies, groupsForDraw } = await import('./drawModes');
const { useSimulatorEngine } = await import('./useSimulatorEngine');

const OWN = { EE: { Big: 30, Small: 10, Skipped: 0 } };

describe('groupsForDraw', () => {
  it('an even spread has no groups, and is the default', async () => {
    const fetch = vi.fn();
    expect(await groupsForDraw({ drawMode: 'even' }, fetch)).toBeNull();
    expect(await groupsForDraw({}, fetch)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('Board’s counts asks for Admin’s, and falls back to PRC’s table', async () => {
    const saved = { EE: [{ items: 7, topics: ['A'] }] };
    expect(await groupsForDraw({ drawMode: 'board' }, async () => saved)).toBe(saved);
    expect(await groupsForDraw({ drawMode: 'board' }, async () => null)).toBe(BOARD_GROUPS);
    expect(await groupsForDraw({ drawMode: 'board' }, async () => { throw new Error('offline'); })).toBe(BOARD_GROUPS);
  });

  it('My own is one group per topic with a count', async () => {
    const groups = await groupsForDraw({ drawMode: 'own', ownCounts: OWN }, vi.fn());
    expect(groups.EE).toEqual([{ items: 30, topics: ['Big'] }, { items: 10, topics: ['Small'] }]);
    expect(groups.ESAS).toEqual([]);
  });

  it('a pinned topic or an AI mock has no choice to make', async () => {
    const pinned = { mode: 'subject', subtopic: 'Machines', drawMode: 'board' };
    expect(drawApplies(pinned)).toBe(false);
    expect(await groupsForDraw(pinned, vi.fn())).toBeNull();
    expect(drawApplies({ mode: 'subject', source: 'ai' })).toBe(false);
    expect(drawApplies({ mode: 'subject', subtopic: 'All' })).toBe(true);
    expect(drawApplies({ mode: 'subject' })).toBe(true);
    expect(drawApplies({ mode: 'blended' })).toBe(true);
    // PRC papers ignore a topic left over in the setup.
    expect(drawApplies({ mode: 'subject', isPrcStandard: true, subtopic: 'Machines' })).toBe(true);
  });
});

describe('own counts from the board', () => {
  it('splits a shared count evenly, keeping its total', () => {
    const counts = ownCountsFromBoard({ EE: [{ items: 5, topics: ['A', 'B'] }, { items: 10, topics: ['C'] }, { items: 1, topics: ['D', 'E', 'F'] }] });
    expect(counts.EE).toEqual({ A: 3, B: 2, C: 10, D: 1, E: 0, F: 0 });
  });

  it('PRC’s table comes through at 100 per subject, and round-trips into groups', () => {
    const counts = ownCountsFromBoard(BOARD_GROUPS);
    for (const subject of Object.keys(BOARD_GROUPS)) {
      expect(Object.values(counts[subject]).reduce((a, b) => a + b, 0)).toBe(100);
      expect(ownBlueprint(counts)[subject].reduce((sum, g) => sum + g.items, 0)).toBe(100);
    }
  });
});

describe('the sitting draws as chosen', () => {
  const topic = (name, n, subject = 'EE') => Array.from({ length: n }, (_, i) => ({ id: `${name}-${i}`, subject, subtopic: name, text: `${name} ${i}`, options: ['a', 'b'], answer: 'a' }));
  const pool = [...topic('Big', 200), ...topic('Small', 200), ...topic('Other', 200)];
  const PRC = { mode: 'subject', subject: 'EE', isPrcStandard: true, count: 100, source: 'library', cognitiveFocus: 'mixed' };
  const countOf = (questions, name) => questions.filter((q) => q.subtopic === name).length;
  const sit = async (config) => {
    const { result } = renderHook(() => useSimulatorEngine({ uid: 'u1' }, true));
    await act(() => result.current.startSimulation(config));
    return result.current.session.questions;
  };

  beforeEach(() => {
    localStorage.clear();
    Object.values(api).forEach((f) => f.mockClear());
    api.fetchVaultQuestions.mockImplementation(async () => pool);
    api.fetchBoardGroups.mockResolvedValue({ EE: [{ items: 70, topics: ['Big'] }, { items: 30, topics: ['Small'] }] });
  });

  it('with no choice made, an even spread, without asking for the board’s counts', async () => {
    const questions = await sit(PRC);
    expect(questions).toHaveLength(100);
    for (const name of ['Big', 'Small', 'Other']) expect(Math.abs(countOf(questions, name) - 33)).toBeLessThanOrEqual(1);
    expect(api.fetchBoardGroups).not.toHaveBeenCalled();
  });

  it('Board’s counts follows Admin’s setup', async () => {
    const questions = await sit({ ...PRC, drawMode: 'board' });
    expect(countOf(questions, 'Big')).toBe(70);
    expect(countOf(questions, 'Small')).toBe(30);
    expect(countOf(questions, 'Other')).toBe(0);
  });

  it('My own scales to the paper, and works on a custom mock with all topics', async () => {
    const questions = await sit({ mode: 'subject', subject: 'EE', isPrcStandard: false, count: 20, source: 'library', subtopic: 'All', cognitiveFocus: 'mixed', drawMode: 'own', ownCounts: OWN });
    expect(questions).toHaveLength(20);
    expect(countOf(questions, 'Big')).toBe(15);
    expect(countOf(questions, 'Small')).toBe(5);
  });

  it('My own with no counts for the subject draws evenly and stays full', async () => {
    const questions = await sit({ ...PRC, drawMode: 'own', ownCounts: {} });
    expect(questions).toHaveLength(100);
    expect(countOf(questions, 'Other')).toBeGreaterThan(0);
  });

  it('a mixed paper applies the choice per subject', async () => {
    api.fetchVaultQuestions.mockImplementation(async (subject) => (subject === 'EE' ? pool : topic(`${subject} topic`, 100, subject)));
    const questions = await sit({ mode: 'blended', subject: 'blended', isPrcStandard: true, count: 100, source: 'library', cognitiveFocus: 'mixed', drawMode: 'board' });
    expect(questions).toHaveLength(100);
    // EE's 45 items, 70/30.
    expect(countOf(questions, 'Big')).toBe(32);
    expect(countOf(questions, 'Small')).toBe(13);
  });

  it('a PRC paper covers the whole subject, even with a topic left in the setup', async () => {
    await sit({ ...PRC, subtopic: 'Small' });
    expect(api.fetchVaultQuestions).toHaveBeenCalledWith('EE', 'All', 2000);
  });

  it('a custom mock still honours its pinned topic', async () => {
    await sit({ mode: 'subject', subject: 'EE', isPrcStandard: false, count: 10, source: 'library', subtopic: 'Small', cognitiveFocus: 'mixed', drawMode: 'board' });
    expect(api.fetchVaultQuestions).toHaveBeenCalledWith('EE', 'Small', 2000);
    expect(api.fetchBoardGroups).not.toHaveBeenCalled();
  });
});
