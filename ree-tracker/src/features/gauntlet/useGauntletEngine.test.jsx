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
    // The engine now exposes an absolute deadline rather than a per-second
    // countdown — the countdown itself belongs to <ExamClock>, so a tick no
    // longer re-renders this hook's consumer. The restored run must still have
    // time left, and no more than the cached draft allowed.
    const restoredSecs = Math.round((result.current.gauntletEndTime - Date.now()) / 1000);
    expect(restoredSecs).toBeGreaterThan(0);
    expect(restoredSecs).toBeLessThanOrEqual(300);

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

  // The server answers 503 when it graded the run but could not SAVE it. That
  // is retryable, not a reason to strand the run on an error screen — the
  // outbox replays it, and clientAttemptId keeps the replay exactly-once.
  it('a 5xx from the grade call defers to the outbox (graded-but-not-saved is retryable)', async () => {
    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('active'));
    act(() => { result.current.handleAnswer(0, 'A'); });

    apiRequestMock.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('not saved'), { status: 503 })));

    await act(async () => {
      await result.current.submitExam();
    });

    expect(queuePendingWrite).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('pending');
  });

  // The post-submit refresh waits on the profile request, then writes stats.
  // It used to spread the copy the render had closed over, so anything that
  // changed while the request was out (an exam date set on another screen, a
  // sync landing) was written back over with the older copy.
  it('after grading, writes the lock on top of the stats as they are then, not as they were', async () => {
    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('active'));
    act(() => { result.current.handleAnswer(0, 'B'); }); // wrong: the run fails

    apiRequestMock.mockImplementationOnce(() => Promise.resolve({ results: [] }));
    let releaseProfile;
    getAnalyticsProfileMock.mockImplementationOnce(() => new Promise((resolve) => { releaseProfile = () => resolve({ data: null }); }));

    let submitting;
    await act(async () => { submitting = result.current.submitExam(); });
    await waitFor(() => expect(getAnalyticsProfileMock).toHaveBeenCalled());
    storeState.stats = { ...storeState.stats, examDate: '2027-04-01' }; // changed meanwhile
    await act(async () => { releaseProfile(); await submitting; });

    const last = setStats.mock.calls.at(-1)[0];
    expect(last.examDate).toBe('2027-04-01');
    expect(last.gauntletLockUntil).toBeGreaterThan(Date.now());
  });

  it('a 4xx from the grade call is NOT deferred — the run is kept and Try again resends it', async () => {
    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('active'));
    act(() => { result.current.handleAnswer(0, 'A'); });

    apiRequestMock.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('Validation failed.'), { status: 400 })));

    await act(async () => {
      await result.current.submitExam();
    });

    expect(queuePendingWrite).not.toHaveBeenCalled();
    expect(result.current.status).toBe('submit-error');
    // The draft used to be cleared before grading, so a refused run was gone.
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)).answers['0']).toBe('A');

    apiRequestMock.mockImplementationOnce(() => Promise.resolve({ results: [{ questionId: 'q-0', isCorrect: true }] }));
    await act(async () => { await result.current.submitExam(); });
    expect(result.current.status).toBe('diagnostics');
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    const grades = apiRequestMock.mock.calls.filter(([url]) => url === '/api/exams/grade');
    expect(grades).toHaveLength(2);
    // The same run both times, so the server dedupes the attempts.
    expect(grades[1][2].gauntlet.runId).toBe(grades[0][2].gauntlet.runId);
  });
});

describe('useGauntletEngine — the ladder on the server', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
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
    vi.useRealTimers();
    localStorage.clear();
  });

  it('starts the clock once the questions are loaded, not before the fetch', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000_000);
    let release;
    apiRequestMock = vi.fn(() => new Promise((resolve) => { release = () => resolve({ items: makeQuestions(60) }); }));

    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalled());
    expect(result.current.gauntletEndTime).toBeNull();

    vi.setSystemTime(1_000_000 + 90_000); // a slow connection: 90 s to load
    await act(async () => { release(); });
    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(result.current.gauntletEndTime).toBe(1_090_000 + 75 * 60 * 1000);
  });

  it('sends the run as a gauntlet block with stable attempt ids, and applies the server outcome', async () => {
    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('active'));
    act(() => { result.current.handleAnswer(0, 'A'); });

    apiRequestMock.mockImplementationOnce(() => Promise.resolve({
      results: [{ questionId: 'q-0', isCorrect: true }],
      gauntlet: {
        sessionId: 'run-from-server', outcome: 'advanced', verdict: 'PASSED', generalAverage: 81.5,
        subjectScores: { Mathematics: 82 }, level: 4, lockUntil: null, boardClears: [],
      },
    }));
    await act(async () => { await result.current.submitExam(); });

    const [, , body] = apiRequestMock.mock.calls.find(([url]) => url === '/api/exams/grade');
    expect(body.gauntlet).toMatchObject({ level: 1, knownLevel: 3 });
    expect(typeof body.gauntlet.runId).toBe('string');
    expect(body.gauntlet.startedAt).toEqual(expect.any(String));
    expect(body.answers[0]).toMatchObject({ clientAttemptId: `${body.gauntlet.runId}:q-0`, itemIndex: 0 });
    expect(body.answers[7]).toMatchObject({ itemIndex: 7, userAnswer: '' });

    expect(result.current.status).toBe('diagnostics');
    expect(result.current.diagnostics).toMatchObject({
      outcome: 'advanced', isPassed: true, ladderLevel: 4, generalAverage: 81.5, sessionId: 'run-from-server',
    });
    expect(setStats.mock.calls.at(-1)[0]).toMatchObject({ gauntletLevel: 4, gauntletLockUntil: null });
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it('a run graded by an older server (no gauntlet block) is judged here: not passing locks', async () => {
    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('active'));
    apiRequestMock.mockImplementationOnce(() => Promise.resolve({ results: [] }));
    await act(async () => { await result.current.submitExam(); });

    expect(result.current.diagnostics.outcome).toBe('failed');
    expect(result.current.diagnostics.isPassed).toBe(false);
    expect(result.current.diagnostics.sessionId).toBeNull();
    expect(setStats.mock.calls.at(-1)[0].gauntletLockUntil).toBeGreaterThan(Date.now() + 11 * 3600 * 1000);
  });

  it('leaving a run forfeits it: the lock is set here, the server is told, and the draft goes', async () => {
    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(localStorage.getItem(CACHE_KEY)).not.toBeNull();
    apiRequestMock.mockImplementationOnce(() => Promise.resolve({ success: true }));

    await act(async () => { await result.current.forfeitRun(); });

    expect(setStats.mock.calls[0][0].gauntletLockUntil).toBeGreaterThan(Date.now() + 11 * 3600 * 1000);
    expect(apiRequestMock).toHaveBeenCalledWith('/api/exams/gauntlet/forfeit', 'POST', expect.objectContaining({ level: 1, knownLevel: 3, runId: expect.any(String) }));
    expect(queuePendingWrite).not.toHaveBeenCalled();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    expect(result.current.status).toBe('forfeited');
  });

  it('a forfeit while offline goes to the outbox', async () => {
    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('active'));
    Object.defineProperty(window.navigator, 'onLine', { value: false, writable: true, configurable: true });

    await act(async () => { await result.current.forfeitRun(); });

    expect(queuePendingWrite).toHaveBeenCalledWith('/api/exams/gauntlet/forfeit', 'POST', expect.objectContaining({ level: 1 }));
    expect(apiRequestMock).not.toHaveBeenCalledWith('/api/exams/gauntlet/forfeit', expect.anything(), expect.anything());
  });

  it('a saved run is submitted as it stands, under its own run id', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      level: '1',
      questions: makeQuestions(50),
      answers: { 0: 'A', 4: 'C' },
      confidences: {},
      currentIndex: 4,
      endTime: Date.now() + 5 * 60 * 1000,
      bookmarks: [],
      flags: [],
      runId: 'saved-run',
      startedAt: '2026-10-09T01:00:00.000Z',
      savedAt: Date.now(),
    }));
    const { result } = renderHook(() => useGauntletEngine('1'), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('resume'));
    expect(result.current.discardAndStartFresh).toBeUndefined();

    apiRequestMock.mockImplementationOnce(() => Promise.resolve({ results: [] }));
    await act(async () => { result.current.submitSavedRun(); });
    await waitFor(() => expect(result.current.status).toBe('diagnostics'));

    const [, , body] = apiRequestMock.mock.calls.find(([url]) => url === '/api/exams/grade');
    expect(body.gauntlet).toMatchObject({ runId: 'saved-run', startedAt: '2026-10-09T01:00:00.000Z' });
    expect(body.answers[4]).toMatchObject({ userAnswer: 'C', clientAttemptId: 'saved-run:q-4' });
    // No fresh question set was fetched.
    expect(apiRequestMock).not.toHaveBeenCalledWith('/api/exams?limit=100');
  });
});
