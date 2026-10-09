// The simulator end of "Retake missed" and the sitting review:
//   - a retake runs exactly the handed-over questions, timed at the board's
//     pace for each, and never stores them in the config or draft;
//   - every attempt carries its position, and a blank says it was blank, so
//     the review can list items in order and tell blank from not recorded;
//   - the sitting finalises as a retake, and the results know its session id.
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
vi.mock('../../store/slices', () => ({
  useEngineActionsSlice: () => ({ dynamicTOS: {}, setStats: vi.fn(), startSession: vi.fn(), endSession: vi.fn(() => Promise.resolve()) }),
}));
vi.mock('../../services/analyticsSync', () => ({ normalizeMicroTopics: (m) => m }));

const { useSimulatorEngine } = await import('./useSimulatorEngine');

const QUESTIONS = [
  { id: 'q1', subject: 'EE', subtopic: 'Machines', text: 'Q1', options: ['A', 'B'], answer: 'A' },
  { id: 'q2', subject: 'Mathematics', subtopic: 'Calculus', text: 'Q2', options: ['C', 'D'], answer: 'D' },
];

beforeEach(() => { localStorage.clear(); Object.values(api).forEach((f) => f.mockClear()); });

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
    expect(api.finalizeExamSession).toHaveBeenCalledWith('sess-r', expect.objectContaining({ kind: 'retake' }));
    expect(result.current.session.diagnostics).toMatchObject({ sessionId: 'sess-r', correctItems: 1 });
    expect(result.current.session.diagnostics.pacingItems).toHaveLength(2);
  });

  it('back to setup drops what the run left behind', async () => {
    const { result } = renderHook(() => useSimulatorEngine({ uid: 'u1' }, true));
    act(() => result.current.setConfig({ mode: 'subject', subject: 'EE', battleId: 'ABC123', fullBoard: { sessionId: 'b' }, source: 'retake' }));
    act(() => result.current.resetToSetup());
    expect(result.current.config).toEqual({ mode: 'subject', subject: 'EE', source: 'library' });
    expect(result.current.session.isActive).toBe(false);
  });
});
