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
const { fetchBookmarks, fetchSmartDrillQuestions, updateQuestionInBank, updateQuestionCache } = await import('../../services/dbQueries');
const { generateMasterExplanation } = await import('../../services/geminiApi');
const { useReviewSession } = await import('./useReviewSession');
const { bookmarksPreset, drillPreset, itemsPreset } = await import('./presets');

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

describe('flag, AI explanation and leaving mid-session', () => {

  const startTwo = async (result) => {
    fetchBookmarks.mockResolvedValue([q('b1', 'EE', 'Protection'), q('b2', 'EE', 'Machines')]);
    await act(() => result.current.startSession(bookmarksPreset(2)));
  };

  it('flags the question it was asked about, even after moving on', async () => {
    let resolveFlag;
    updateQuestionInBank.mockImplementation(() => new Promise((r) => { resolveFlag = r; }));
    const { result } = setup();
    await startTwo(result);
    const first = result.current.session.questions[0].id;
    let flagging;
    act(() => { flagging = result.current.handleFlagQuestion(); });
    act(() => result.current.setSession((s) => ({ ...s, currentIndex: 1 })));
    await act(async () => { resolveFlag(); await flagging; });
    const byId = Object.fromEntries(result.current.session.questions.map((x) => [x.id, x]));
    expect(byId[first].isFlagged).toBe(true);
    expect(Object.values(byId).filter((x) => x.isFlagged)).toHaveLength(1);
  });

  it('keeps an explanation with its own question, and never writes the shared solution', async () => {
    let resolveAi;
    generateMasterExplanation.mockImplementation(() => new Promise((r) => { resolveAi = r; }));
    const { result } = setup();
    await startTwo(result);
    const [first, second] = result.current.session.questions;
    let explaining;
    act(() => { explaining = result.current.explainQuestion(first); });
    expect(result.current.aiLoading).toBe(true);
    act(() => result.current.setSession((s) => ({ ...s, currentIndex: 1 })));
    await act(async () => { resolveAi('Worked solution for the first'); await explaining; });
    // The current (second) question has none; the first keeps its own.
    expect(result.current.aiText).toBeNull();
    act(() => result.current.setSession((s) => ({ ...s, currentIndex: 0 })));
    expect(result.current.aiText).toBe('Worked solution for the first');
    expect(second.id).not.toBe(first.id);
    expect(updateQuestionCache).not.toHaveBeenCalled();
  });

  it('a failed explanation resolves to null instead of saving an apology', async () => {
    generateMasterExplanation.mockRejectedValue(new Error('down'));
    const { result } = setup();
    await startTwo(result);
    let text;
    await act(async () => { text = await result.current.explainQuestion(result.current.session.questions[0]); });
    expect(text).toBeNull();
    expect(result.current.aiText).toBeNull();
  });

  it('leaving mid-session queues the study-session record and closes the session', async () => {
    const { result, unmount } = setup();
    await startTwo(result);
    act(() => result.current.setSession((s) => ({ ...s, confidence: 'MED' })));
    act(() => result.current.handleAnswerSelection('A'));
    unmount();
    expect(engine.queuePendingWrite).toHaveBeenCalledWith(
      '/api/analytics/study-sessions', 'POST',
      expect.objectContaining({ totalQuestions: 1, correctAnswers: 1 }),
    );
    expect(engine.endSession).toHaveBeenCalled();
  });

  it('leaving after the session ended records nothing more', async () => {
    const { result, unmount } = setup();
    await startTwo(result);
    act(() => result.current.setSession((s) => ({ ...s, confidence: 'MED' })));
    act(() => result.current.handleAnswerSelection('A'));
    await act(() => result.current.endSession());
    engine.queuePendingWrite.mockClear();
    unmount();
    expect(engine.queuePendingWrite).not.toHaveBeenCalled();
  });
});

describe('items source (a past sitting’s misses)', () => {
  it('practises exactly the items handed over, offline too, without keeping them in the form', async () => {
    const items = [q('m1', 'EE', 'Machines'), q('m2', 'Mathematics', 'Calculus')];
    const { result } = setup(false);
    await act(() => result.current.startSession(itemsPreset(items)));
    expect(result.current.session.isActive).toBe(true);
    expect(result.current.session.questions.map((x) => x.id).sort()).toEqual(['m1', 'm2']);
    expect(result.current.config.items).toBeUndefined();
    expect(result.current.config.source).toBe('items');
  });

  it('says so when there is nothing to practise', async () => {
    const { result } = setup();
    await act(() => result.current.startSession(itemsPreset([])));
    expect(result.current.session.isActive).toBe(false);
    expect(toast.error).toHaveBeenLastCalledWith("There's nothing to practise from that sitting.");
  });
});

describe('AI source', () => {
  it('"All subjects" asks the model for one real subject and one of its topics', async () => {
    const { generateQuestionsAI } = await import('../../services/geminiApi');
    const { saveQuestionToBank } = await import('../../services/dbQueries');
    generateQuestionsAI.mockResolvedValue([q(null, 'EE', 'Machines')].map((x, i) => ({ ...x, id: undefined, text: `AI ${i}` })));
    saveQuestionToBank.mockResolvedValue('new-id');
    const { result } = setup();
    await act(() => result.current.startSession({ source: 'ai', subject: 'All', subtopic: 'All', studyMode: 'interleaved', count: 1, sessionMode: 'mcq', cognitiveFocus: 'mixed' }));
    const [subject, topic] = generateQuestionsAI.mock.calls[0];
    expect(['Mathematics', 'ESAS', 'EE']).toContain(subject);
    expect(topic).not.toBe('General');
    expect(result.current.safeTOS[subject]).toContain(topic);
  });

  it('with no live syllabus, the subject lists fall back to the built-in one', () => {
    const { result } = setup();
    expect(Object.keys(result.current.safeTOS)).toEqual(expect.arrayContaining(['Mathematics', 'ESAS', 'EE']));
  });
});
