// The simulator end of coming back to a battle. A player who closed the app
// mid-battle used to reopen it with blank answers and the full time limit
// (or not at all); now:
//   - their saved picks come back onto the reshuffled questions, by id;
//   - the clock counts down to the server's deadline, not the phone's;
//   - with no time left, what was saved is submitted at once;
//   - a battle that isn't running for them says why, for the page to route;
//   - the results screen knows when the results are due at the latest.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => 't') }) }));
vi.mock('../../services/geminiApi', () => ({ generateQuestionsAI: vi.fn() }));
const api = {
  updateQuestionInBank: vi.fn(), fetchVaultQuestions: vi.fn(), finalizeExamSession: vi.fn(() => Promise.resolve({})),
  syncTelemetryBatch: vi.fn(() => Promise.resolve({})), getAnalyticsProfile: vi.fn(() => Promise.resolve(null)),
  fetchMultiplayerBattle: vi.fn(), fetchSyllabusWeights: vi.fn(), saveBookmark: vi.fn(), removeBookmark: vi.fn(),
};
vi.mock('../../services/dbQueries', () => api);
const storeState = { stats: {}, currentSessionId: null, dynamicTOS: {}, queuePendingWrite: vi.fn(), setStats: vi.fn() };
vi.mock('../../store/useStore', () => ({ useStore: { getState: () => storeState } }));
vi.mock('../../store/slices', () => ({
  useEngineActionsSlice: () => ({ dynamicTOS: {}, setStats: vi.fn(), startSession: vi.fn(), endSession: vi.fn(() => Promise.resolve()) }),
}));
vi.mock('../../services/analyticsSync', () => ({ normalizeMicroTopics: (m) => m }));

const { useSimulatorEngine } = await import('./useSimulatorEngine');

const QUESTIONS = [
  { id: 'q1', subject: 'EE', text: 'Q1', options: ['A', 'B', 'C'] },
  { id: 'q2', subject: 'EE', text: 'Q2', options: ['D', 'E', 'F'] },
  { id: 'q3', subject: 'EE', text: 'Q3', options: ['G', 'H', 'I'] },
];

function battle(over = {}) {
  return {
    battle: {
      id: 'ABC123', status: 'IN_PROGRESS', config: { mode: 'custom', subject: 'EE' }, timeLimitSecs: 1800, questions: QUESTIONS,
      timing: { serverNow: Date.now(), endsAt: Date.now() + 20 * 60000, closesAt: Date.now() + 20.5 * 60000, remainingMs: 20 * 60000 },
      me: { answers: { q1: { userAnswer: 'B', confidenceLevel: 'HIGH' }, q3: { userAnswer: 'I', confidenceLevel: 'LOW' } }, finished: false, itemsAnswered: 2 },
      ...over,
    },
  };
}

beforeEach(() => { localStorage.clear(); Object.values(api).forEach((f) => f.mockReset()); });

describe('useSimulatorEngine — coming back to a battle', () => {
  it('restores the saved picks by question and counts down to the server deadline', async () => {
    api.fetchMultiplayerBattle.mockResolvedValue(battle());
    const { result } = renderHook(() => useSimulatorEngine({ uid: 'u1' }, true));
    let status;
    await act(async () => { status = await result.current.startMultiplayerBattle('ABC123'); });

    expect(status).toBe('started');
    const { questions, answers, confidences } = result.current.session;
    const at = (id) => questions.findIndex((q) => q.id === id);
    expect(answers[at('q1')]).toBe('B');
    expect(answers[at('q3')]).toBe('I');
    expect(answers[at('q2')]).toBeUndefined();
    expect(confidences[at('q1')]).toBe('HIGH');
    // 20 minutes left, not the 30-minute limit.
    const left = result.current.examEndTime - Date.now();
    expect(left).toBeGreaterThan(19.9 * 60000);
    expect(left).toBeLessThanOrEqual(20 * 60000);
  });

  it('corrects for a phone clock that is off from the server', async () => {
    const data = battle();
    // The server is 5 minutes ahead of this device.
    data.battle.timing = { serverNow: Date.now() + 5 * 60000, endsAt: Date.now() + 15 * 60000, closesAt: Date.now() + 15.5 * 60000, remainingMs: 10 * 60000 };
    api.fetchMultiplayerBattle.mockResolvedValue(data);
    const { result } = renderHook(() => useSimulatorEngine({ uid: 'u1' }, true));
    await act(() => result.current.startMultiplayerBattle('ABC123'));
    expect(result.current.examEndTime - Date.now()).toBeLessThanOrEqual(10 * 60000);
    expect(result.current.examEndTime - Date.now()).toBeGreaterThan(9.9 * 60000);

    // Submitting records when the results are due, on this device's clock.
    await act(() => result.current.submitExam());
    const { resultsBy, pending, pendingAttempts } = result.current.session.diagnostics;
    expect(pending).toBe(true);
    expect(Math.abs(resultsBy - (Date.now() + 10.5 * 60000))).toBeLessThan(2000);
    expect(pendingAttempts.find((a) => a.questionId === 'q1')).toMatchObject({ userAnswer: 'B', confidenceLevel: 'HIGH' });
  });

  it('submits what was saved at once when the time ran out while away', async () => {
    const data = battle();
    data.battle.timing = { serverNow: Date.now(), endsAt: Date.now() - 5000, closesAt: Date.now() + 25000, remainingMs: 0 };
    api.fetchMultiplayerBattle.mockResolvedValue(data);
    const { result } = renderHook(() => useSimulatorEngine({ uid: 'u1' }, true));
    await act(() => result.current.startMultiplayerBattle('ABC123'));
    await waitFor(() => expect(result.current.session.isFinished).toBe(true), { timeout: 3000 });
    expect(result.current.session.diagnostics.pendingAttempts.filter((a) => a.userAnswer != null)).toHaveLength(2);
  });

  it.each([
    ['completed', { status: 'COMPLETED' }],
    ['waiting', { status: 'WAITING' }],
    ['finished', { me: { answers: {}, finished: true, itemsAnswered: 3 } }],
    ['not-a-player', { me: null }],
  ])('does not open the exam room when the battle is %s', async (expected, over) => {
    api.fetchMultiplayerBattle.mockResolvedValue(battle(over));
    const { result } = renderHook(() => useSimulatorEngine({ uid: 'u1' }, true));
    let status;
    await act(async () => { status = await result.current.startMultiplayerBattle('ABC123'); });
    expect(status).toBe(expected);
    expect(result.current.session.isActive).toBe(false);
    expect(result.current.session.loading).toBe(false);
  });
});
