// Regression coverage for the Gauntlet resume-cache + offline-submit work
// (port of the Board Simulator's useSimulatorEngine.js pattern). Before this,
// useGauntletEngine had NO localStorage persistence at all — connection loss
// or a killed tab silently discarded an in-progress run, and submitExam had
// no offline path: a failed grade call set status:'error' and the whole run
// was gone. This suite exercises the actual hook (not a full page render) so
// it stays fast and focuses on the localStorage contract and the
// online/offline submit branching.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useGauntletEngine } from './useGauntletEngine';

const CACHE_KEY = 'ree_gauntlet_cache';

// --- Controllable store double -------------------------------------------
// The real store is a persisted Zustand store; driving it for these tests
// would be slow and side-effectful (IndexedDB writes). A plain object with
// the handful of fields/actions useGauntletEngine actually touches is enough
// to assert on (setStats/startSession/endSession/queuePendingWrite calls,
// and the gate-check fields fetchFreshGauntlet reads via getState()).
let storeState;
const setStats = vi.fn((next) => { storeState.stats = next; });
const startSession = vi.fn().mockResolvedValue('session-1');
const endSession = vi.fn().mockResolvedValue();
const queuePendingWrite = vi.fn();

vi.mock('../../store/useStore', () => {
  const useStoreImpl = (selector) => (selector ? selector(storeState) : storeState);
  useStoreImpl.getState = () => storeState;
  return { useStore: useStoreImpl };
});

vi.mock('../../store/slices', () => ({
  useEngineActionsSlice: () => ({
    dynamicTOS: {},
    setStats,
    startSession,
    endSession,
  }),
}));

let apiRequestMock;
let getAnalyticsProfileMock;
vi.mock('../../services/dbQueries', () => ({
  apiRequest: (...args) => apiRequestMock(...args),
  getAnalyticsProfile: (...args) => getAnalyticsProfileMock(...args),
  fetchVaultQuestions: vi.fn().mockResolvedValue([]),
  saveBookmark: vi.fn().mockResolvedValue({}),
  removeBookmark: vi.fn().mockResolvedValue({}),
  updateQuestionInBank: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../config/firebaseDb', () => ({
  auth: { currentUser: { uid: 'user-1' } },
}));

const makeQuestions = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `q-${i}`,
    subject: 'Mathematics',
    subtopic: 'Algebra',
    text: `Question ${i}`,
    answer: 'A',
    options: ['A', 'B', 'C', 'D'],
    isFlagged: false,
  }));

function wrapper({ children }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe('useGauntletEngine — resume cache + offline submit', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Level 1 gate: totalAnswered >= 200 (reqQs) and gauntletLevel >= 1.
    storeState = {
      stats: { totalAnswered: 5000, gauntletLevel: 3, gauntletLockUntil: null },
      currentSessionId: null,
      queuePendingWrite,
    };
    apiRequestMock = vi.fn().mockResolvedValue({ items: makeQuestions(60) });
    getAnalyticsProfileMock = vi.fn().mockResolvedValue({ data: null });
    Object.defineProperty(window.navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('persists answers, currentIndex, and endTime to localStorage as the run progresses', async () => {
    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(apiRequestMock).toHaveBeenCalledWith('/api/exams?limit=100');

    act(() => { result.current.handleAnswer(0, 'A'); });
    act(() => { result.current.setCurrentIndex(1); });

    const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
    expect(saved.level).toBe('1');
    expect(saved.answers['0']).toBe('A');
    expect(saved.currentIndex).toBe(1);
    expect(typeof saved.endTime).toBe('number');
    expect(saved.questions).toHaveLength(50); // tier 1's item count
  });

  it('offers resume (not a fresh fetch) when a matching-level cache exists on boot, and resumeGauntlet restores state without deleting the cache', async () => {
    const cachedQuestions = makeQuestions(50);
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      level: '1',
      questions: cachedQuestions,
      answers: { 0: 'A', 1: 'B' },
      confidences: { 0: 'HIGH' },
      currentIndex: 2,
      endTime: Date.now() + 5 * 60 * 1000, // 5 min left
      bookmarks: [3],
      flags: [],
      timeSpentPerQuestion: { 0: 4000 },
      savedAt: Date.now(),
    }));

    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('resume'));
    // No auto-fetch while waiting on the resume decision.
    expect(apiRequestMock).not.toHaveBeenCalled();

    act(() => { result.current.resumeGauntlet(); });

    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(result.current.answers).toEqual({ 0: 'A', 1: 'B' });
    expect(result.current.currentIndex).toBe(2);
    expect(result.current.bookmarks.has(3)).toBe(true);
    expect(result.current.timeLeft).toBeGreaterThan(0);
    expect(result.current.timeLeft).toBeLessThanOrEqual(300);

    // Resume does NOT delete the draft — only a genuine submitExam does.
    expect(localStorage.getItem(CACHE_KEY)).not.toBeNull();
  });

  it('ignores a stale cache for a different level and fetches fresh instead', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      level: '2',
      questions: makeQuestions(75),
      answers: {},
      confidences: {},
      currentIndex: 0,
      endTime: Date.now() + 1000,
      bookmarks: [],
      flags: [],
      savedAt: Date.now(),
    }));

    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(apiRequestMock).toHaveBeenCalledWith('/api/exams?limit=100');
    // The stale level-2 cache is now overwritten by the fresh level-1 run.
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
    expect(saved.level).toBe('1');
  });

  it('submitExam defers to the durable outbox when offline, clears the draft, and never invents a score', async () => {
    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('active'));

    act(() => { result.current.handleAnswer(0, 'A'); });
    expect(localStorage.getItem(CACHE_KEY)).not.toBeNull();

    Object.defineProperty(window.navigator, 'onLine', { value: false, writable: true, configurable: true });

    await act(async () => {
      await result.current.submitExam();
    });

    // The grade endpoint was never called directly while offline — no
    // invented score.
    expect(apiRequestMock).not.toHaveBeenCalledWith('/api/exams/grade', 'POST', expect.anything());
    expect(queuePendingWrite).toHaveBeenCalledTimes(1);
    const [endpoint, method, body] = queuePendingWrite.mock.calls[0];
    expect(endpoint).toBe('/api/exams/grade');
    expect(method).toBe('POST');
    expect(body.mode).toBe('GAUNTLET');
    expect(body.answers).toHaveLength(50);
    expect(body.answers[0]).toMatchObject({ questionId: 'q-0', userAnswer: 'A' });

    // Teardown happened — the run is no longer resumable as "in progress".
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    expect(result.current.status).toBe('pending');
    expect(endSession).toHaveBeenCalled();
  });

  it('a mid-flight [OFFLINE] failure from the grade call ALSO defers to the outbox instead of erroring out', async () => {
    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('active'));
    act(() => { result.current.handleAnswer(0, 'A'); });

    // navigator.onLine still true, but the request itself throws the
    // sentinel apiRequest uses for a tripped circuit breaker / timeout.
    apiRequestMock.mockImplementationOnce(() => Promise.reject(new Error('[OFFLINE]')));

    await act(async () => {
      await result.current.submitExam();
    });

    expect(queuePendingWrite).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('pending');
  });
});
