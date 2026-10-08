// useReviewSession: the bookmarks source (new: bookmarks could be saved but
// never practised) and the end-of-session summary (new: a session used to end
// on a toast). The store and network are mocked; the hook runs for real.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), loading: vi.fn(() => 'id') });
  return { default: toast };
});
vi.mock('../../services/geminiApi', () => ({ generateQuestionsAI: vi.fn(), generateMasterExplanation: vi.fn() }));
vi.mock('../../services/dbQueries', () => ({
  fetchBookmarks: vi.fn(),
  fetchVaultQuestions: vi.fn(),
  fetchSmartDrillQuestions: vi.fn(),
  fetchSrsDue: vi.fn(),
  getAnalyticsProfile: vi.fn(() => Promise.resolve(null)),
  apiRequest: vi.fn(() => Promise.resolve({})),
  updateQuestionCache: vi.fn(),
  updateQuestionInBank: vi.fn(),
  saveQuestionToBank: vi.fn(),
  saveBookmark: vi.fn(),
  removeBookmark: vi.fn(),
}));
const engine = {
  dynamicTOS: {},
  setStats: vi.fn(),
  recordAttempt: vi.fn(),
  queuePendingWrite: vi.fn(),
  startSession: vi.fn(),
  endSession: vi.fn(() => Promise.resolve()),
};
vi.mock('../../store/slices', () => ({ useEngineActionsSlice: () => engine }));
vi.mock('../../store/useStore', () => ({ useStore: { getState: () => ({ stats: {}, dynamicTOS: {}, }) } }));

const toast = (await import('react-hot-toast')).default;
const { fetchBookmarks, fetchSmartDrillQuestions } = await import('../../services/dbQueries');
const { useReviewSession } = await import('./useReviewSession');
const { bookmarksPreset, drillPreset } = await import('./presets');

const q = (id, subject, subtopic) => ({ id, subject, subtopic, text: `Q ${id}`, options: ['A', 'B', 'C', 'D'], answer: 'A' });
const saved = [q('b1', 'EE', 'Protection'), q('b2', 'Mathematics', 'Calculus'), q('b3', 'EE', 'Machines'), q('b4', 'Math', 'Algebra')];

const setup = (online = true) => renderHook(() => useReviewSession({ uid: 'u1' }, online));

beforeEach(() => {
  vi.clearAllMocks();
  fetchBookmarks.mockResolvedValue(saved);
});

describe('bookmarks source', () => {
  it('practises the saved questions, and shows them as bookmarked', async () => {
    const { result } = setup();
    await act(() => result.current.startSession(bookmarksPreset(20)));
    expect(fetchBookmarks).toHaveBeenCalledWith({ limit: 100 });
    expect(result.current.session.isActive).toBe(true);
    expect(result.current.session.questions.map((x) => x.id).sort()).toEqual(['b1', 'b2', 'b3', 'b4']);
    expect([...result.current.bookmarks].sort()).toEqual(['b1', 'b2', 'b3', 'b4']);
  });

  it('one subject keeps only that subject’s bookmarks, whatever spelling they were saved under', async () => {
    const { result } = setup();
    await act(() => result.current.startSession({ ...bookmarksPreset(20), studyMode: 'subject', subject: 'Mathematics' }));
    expect(result.current.session.questions.map((x) => x.id).sort()).toEqual(['b2', 'b4']);
  });

  it('no bookmarks, or offline, says so and stays on setup', async () => {
    fetchBookmarks.mockResolvedValue([]);
    const { result } = setup();
    await act(() => result.current.startSession(bookmarksPreset()));
    expect(result.current.session.isActive).toBe(false);
    expect(toast.error).toHaveBeenLastCalledWith(expect.stringMatching(/No bookmarks yet/));

    const offline = setup(false);
    await act(() => offline.result.current.startSession(bookmarksPreset()));
    expect(toast.error).toHaveBeenLastCalledWith('Your bookmarks need a connection.');
  });
});

describe('end-of-session summary', () => {
  const answer = async (result, option) => {
    act(() => result.current.setSession((s) => ({ ...s, confidence: 'HIGH' })));
    act(() => result.current.handleAnswerSelection(option));
  };

  it('summarizes what was answered, and "again" repeats the same session', async () => {
    fetchSmartDrillQuestions.mockResolvedValue({ items: [q('d1', 'EE', 'Protection'), q('d2', 'EE', 'Protection')] });
    const { result } = setup();
    await act(() => result.current.startSession(drillPreset({ topic: 'Protection', subject: 'EE', count: 2 })));
    await answer(result, 'A');
    act(() => result.current.loadNextQuestion());
    await answer(result, 'B');
    await act(() => result.current.endSession());

    const s = result.current.lastSummary;
    expect(s).toMatchObject({ total: 2, correct: 1, accuracy: 50, confidentMisses: 1, missedCount: 1 });
    expect(s.weakest).toMatchObject({ topic: 'Protection', subject: 'EE' });
    expect(s.config).toMatchObject({ source: 'smart-drill', drillTopic: 'Protection', drillSubject: 'EE' });
    expect(result.current.session.isActive).toBe(false);

    act(() => result.current.clearSummary());
    expect(result.current.lastSummary).toBeNull();
  });

  it('an untargeted drill after a targeted one replays untargeted', async () => {
    fetchSmartDrillQuestions.mockResolvedValue({ items: [q('d1', 'EE', 'Protection')] });
    const { result } = setup();
    await act(() => result.current.startSession(drillPreset({ topic: 'Protection', subject: 'EE', count: 1 })));
    await act(() => result.current.endSession());
    // A preset without target keys: the form config still holds Protection.
    // eslint-disable-next-line no-unused-vars
    const { drillTopic, drillSubject, drillTopicId, drillMode, ...untargeted } = drillPreset({ count: 1 });
    await act(() => result.current.startSession(untargeted));
    expect(result.current.config.drillTopic).toBe('Protection');
    await answer(result, 'A');
    await act(() => result.current.endSession());
    expect(result.current.lastSummary.config).toMatchObject({ drillTopic: null, drillSubject: null });
  });

  it('nothing answered, no summary', async () => {
    const { result } = setup();
    await act(() => result.current.startSession(bookmarksPreset()));
    await act(() => result.current.endSession());
    expect(result.current.lastSummary).toBeNull();
  });
});
