// The simulator end of "Retake missed" and the sitting review:
//   - a retake runs exactly the handed-over questions, timed at the board's
//     pace for each, and never stores them in the config or draft;
//   - every attempt carries its position, and a blank says it was blank, so
//     the review can list items in order and tell blank from not recorded;
//   - the sitting finalises as a retake, and the results know its session id;
//   - marking an item for review is kept in the draft and sent with the
//     sitting, and never saves it to bookmarks.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => 't') }) }));
vi.mock('../../services/geminiApi', () => ({ generateQuestionsAI: vi.fn() }));
const api = {
  updateQuestionInBank: vi.fn(), fetchVaultQuestions: vi.fn(), finalizeExamSession: vi.fn(() => Promise.resolve({})),
  syncTelemetryBatch: vi.fn(() => Promise.resolve({})), getAnalyticsProfile: vi.fn(() => Promise.resolve(null)),
  fetchMultiplayerBattle: vi.fn(), fetchSyllabusWeights: vi.fn(), saveBookmark: vi.fn(), removeBookmark: vi.fn(),
};
vi.mock('../../services/dbQueries', () => api);
const storeState = { stats: {}, currentSessionId: 'sess-r', dynamicTOS: {}, queuePendingWrite: vi.fn(), setStats: vi.fn() };
vi.mock('../../store/useStore', () => ({ useStore: { getState: () => storeState } }));
const startStoreSession = vi.fn();
vi.mock('../../store/slices', () => ({
  useEngineActionsSlice: () => ({ dynamicTOS: {}, setStats: vi.fn(), startSession: startStoreSession, endSession: vi.fn(() => Promise.resolve()) }),
}));
vi.mock('../../services/analyticsSync', () => ({ normalizeMicroTopics: (m) => m }));

const { useSimulatorEngine } = await import('./useSimulatorEngine');
const { optionKey, orderOptions } = await import('@ree/shared');
// The sitting's own id: the session it submits under, and its order's key.
const sittingId = () => startStoreSession.mock.calls.at(-1)[0].sessionId;

const QUESTIONS = [
  { id: 'q1', subject: 'EE', subtopic: 'Machines', text: 'Q1', options: ['A', 'B'], answer: 'A' },
  { id: 'q2', subject: 'Mathematics', subtopic: 'Calculus', text: 'Q2', options: ['C', 'D'], answer: 'D' },
];

beforeEach(() => { localStorage.clear(); Object.values(api).forEach((f) => f.mockClear()); startStoreSession.mockClear(); });

describe('useSimulatorEngine — retake', () => {
  it('runs the handed-over items at board pace and records position and blanks', async () => {
    const { result } = renderHook(() => useSimulatorEngine({ uid: 'u1' }, true));
    const before = Date.now();
    await act(() => result.current.startSimulation({
      mode: 'subject', subject: 'Mixed', isPrcStandard: false, count: 2, source: 'retake',
      cognitiveFocus: 'mixed', retake: { sourceSessionId: 's1' }, retakeQuestions: QUESTIONS,
    }));

    expect(result.current.session.questions.map((q) => q.id).sort()).toEqual(['q1', 'q2']);
    // EE 216 s + Mathematics 180 s.
    expect(result.current.examEndTime - before).toBeGreaterThanOrEqual(396_000 - 50);
    expect(result.current.examEndTime - before).toBeLessThan(396_000 + 2000);
    expect(result.current.config.retakeQuestions).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('ree_sim_cache')).config.retakeQuestions).toBeUndefined();

    // Answer the q1 item only, then submit.
    const q1Index = result.current.session.questions.findIndex((q) => q.id === 'q1');
    act(() => result.current.handleIndexChange(q1Index));
    act(() => result.current.handleSelectOption('A'));
    await act(() => result.current.submitExam());

    const attempts = api.syncTelemetryBatch.mock.calls[0][4];
    const byId = Object.fromEntries(attempts.map((a) => [a.questionId, a]));
    expect(byId.q1).toMatchObject({ userAnswer: 'A', itemIndex: q1Index });
    expect(byId.q2).toMatchObject({ blank: true, itemIndex: 1 - q1Index });
    expect(byId.q2.userAnswer).toBeUndefined();
    expect(api.finalizeExamSession).toHaveBeenCalledWith(sittingId(), expect.objectContaining({ kind: 'retake' }));
    expect(result.current.session.diagnostics).toMatchObject({ sessionId: sittingId(), correctItems: 1 });
    expect(result.current.session.diagnostics.pacingItems).toHaveLength(2);
  });

  it("shows each question's choices in this sitting's order, keeps it through a resume, and submits under the same id", async () => {
    const four = [
      { id: 'q1', subject: 'EE', text: 'Q1', options: ['a1', 'b1', 'c1', 'd1'], answer: 'a1' },
      { id: 'q2', subject: 'EE', text: 'Q2', options: ['a2', 'b2', 'c2', 'd2'], answer: 'a2' },
    ];
    const { result, unmount } = renderHook(() => useSimulatorEngine({ uid: 'u1' }, true));
    await act(() => result.current.startSimulation({
      mode: 'subject', subject: 'Mixed', isPrcStandard: false, count: 2, source: 'retake',
      cognitiveFocus: 'mixed', retake: { sourceSessionId: 's1' }, retakeQuestions: four,
    }));
    const id = sittingId();
    const shown = result.current.session.questions;
    for (const q of shown) {
      const stored = four.find((x) => x.id === q.id).options;
      expect(q.options).toEqual(orderOptions(stored, optionKey(id, q.id)));
    }
    expect(JSON.parse(localStorage.getItem('ree_sim_cache')).sittingId).toBe(id);
    unmount();

    // Reopened (a reload): the same order, back under the same id.
    startStoreSession.mockClear();
    const again = renderHook(() => useSimulatorEngine({ uid: 'u1' }, true));
    act(() => again.result.current.resumeSimulation());
    expect(again.result.current.session.questions).toEqual(shown);
    expect(startStoreSession).toHaveBeenCalledWith(expect.objectContaining({ sessionId: id }));
    await act(() => again.result.current.submitExam());
    // Marked as shown in the seeded order, so its review lists them that way.
    expect(api.finalizeExamSession).toHaveBeenCalledWith(id, expect.objectContaining({ optionOrder: 'seeded-v1' }));
  });

  it("an older draft (no sitting id) resumes without claiming the seeded order for its review", async () => {
    const { result, unmount } = renderHook(() => useSimulatorEngine({ uid: 'u1' }, true));
    await act(() => result.current.startSimulation({
      mode: 'subject', subject: 'Mixed', isPrcStandard: false, count: 2, source: 'retake',
      cognitiveFocus: 'mixed', retake: { sourceSessionId: 's1' }, retakeQuestions: QUESTIONS,
    }));
    unmount();
    const draft = JSON.parse(localStorage.getItem('ree_sim_cache'));
    delete draft.sittingId;
    localStorage.setItem('ree_sim_cache', JSON.stringify(draft));

    const again = renderHook(() => useSimulatorEngine({ uid: 'u1' }, true));
    act(() => again.result.current.resumeSimulation());
    await act(() => again.result.current.submitExam());
    expect(api.finalizeExamSession).toHaveBeenCalledWith('sess-r', expect.not.objectContaining({ optionOrder: expect.anything() }));
  });

  it('marks for review go with the sitting and the draft, not to bookmarks', async () => {
    const { result } = renderHook(() => useSimulatorEngine({ uid: 'u1' }, true));
    await act(() => result.current.startSimulation({
      mode: 'subject', subject: 'Mixed', isPrcStandard: false, count: 2, source: 'retake',
      cognitiveFocus: 'mixed', retake: { sourceSessionId: 's1' }, retakeQuestions: QUESTIONS,
    }));
    expect(result.current.examTotalSecs).toBe(396);

    act(() => result.current.toggleMarked(1));
    expect(result.current.marked.has(1)).toBe(true);
    expect(JSON.parse(localStorage.getItem('ree_sim_cache')).marked).toEqual([1]);
    act(() => result.current.toggleMarked(0));
    act(() => result.current.toggleMarked(0));
    expect([...result.current.marked]).toEqual([1]);
    expect(api.saveBookmark).not.toHaveBeenCalled();

    const markedId = result.current.session.questions[1].id;
    await act(() => result.current.submitExam());
    expect(api.finalizeExamSession).toHaveBeenCalledWith(sittingId(), expect.objectContaining({ markedQuestionIds: [markedId] }));
  });

  it('back to setup drops what the run left behind', async () => {
    const { result } = renderHook(() => useSimulatorEngine({ uid: 'u1' }, true));
    act(() => result.current.setConfig({ mode: 'subject', subject: 'EE', battleId: 'ABC123', fullBoard: { sessionId: 'b' }, source: 'retake' }));
    act(() => result.current.resetToSetup());
    expect(result.current.config).toEqual({ mode: 'subject', subject: 'EE', source: 'library' });
    expect(result.current.session.isActive).toBe(false);
  });
});
