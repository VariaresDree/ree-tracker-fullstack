// A past sitting, item by item: filters, your answer beside the key, pacing,
// and a timed retake or a practice set of the misses. Plus the states that
// aren't a review: still in progress, still syncing, offline.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../components/SmartText', () => ({ default: ({ text }) => <span>{text}</span> }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
vi.mock('../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
const fetchSittingReview = vi.fn();
const fetchBattleReplay = vi.fn();
const requestRematch = vi.fn();
const apiRequest = vi.fn(async () => ({ items: [], truncated: false }));
vi.mock('../services/dbQueries', () => ({
  fetchSittingReview: (...a) => fetchSittingReview(...a),
  fetchBattleReplay: (...a) => fetchBattleReplay(...a),
  requestRematch: (...a) => requestRematch(...a),
  apiRequest: (...a) => apiRequest(...a),
}));
vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: { uid: 'u1' } } }));
vi.mock('idb-keyval', () => ({ get: async () => undefined, set: async () => {}, del: async () => {} }));
vi.mock('../services/geminiApi', () => ({ generateMasterExplanation: vi.fn() }));

const { default: SittingReview } = await import('./SittingReview');

const item = (order, over = {}) => ({
  order, questionId: `q${order}`, subject: 'EE', topic: 'Machines', text: `Question ${order}`,
  options: ['10 A', '20 A', '30 A', '40 A'], correctAnswer: '20 A', explanation: `Solution ${order}`,
  selectedAnswer: '20 A', answered: true, isCorrect: true, confidence: 'MED', timeSpentMs: 90_000, marked: false, ...over,
});
const REVIEW = {
  session: { id: 'sess-1', kind: 'blended', verdict: 'FAILED', generalAverage: 66.5, createdAt: '2026-10-05T03:00:00Z', timeTakenSecs: 5400, hasMarks: true },
  items: [
    item(1),
    item(2, { isCorrect: false, selectedAnswer: '10 A', confidence: 'HIGH', marked: true }),
    item(3, { isCorrect: false, selectedAnswer: '', answered: false, subject: 'Mathematics' }),
  ],
};

function Probe({ label }) {
  const loc = useLocation();
  return <p>{label}: {JSON.stringify(loc.state)?.slice(0, 200)}</p>;
}

function PathProbe() {
  return <p>at: {useLocation().pathname}</p>;
}

const renderAt = (path = '/exams/sittings/sess-1') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/exams/sittings/:sessionId" element={<SittingReview />} />
      <Route path="/simulator" element={<Probe label="simulator" />} />
      <Route path="/practice" element={<Probe label="practice" />} />
      <Route path="/battle/:battleId" element={<PathProbe />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  fetchSittingReview.mockReset();
  fetchBattleReplay.mockReset();
  requestRematch.mockReset();
});

describe('SittingReview', () => {
  it('shows the sitting with its verdict, and each item with your answer', async () => {
    fetchSittingReview.mockResolvedValue(REVIEW);
    renderAt();
    expect(await screen.findByRole('heading', { level: 1, name: 'Mixed paper review' })).toBeInTheDocument();
    expect(fetchSittingReview).toHaveBeenCalledWith('sess-1');
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('66.5%')).toBeInTheDocument();
    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByText(/You answered this correctly/)).toBeInTheDocument();
  });

  it('the answer sheet shows your bubble and the correct one', async () => {
    fetchSittingReview.mockResolvedValue(REVIEW);
    renderAt();
    await screen.findByText('Question 1');
    fireEvent.click(screen.getByRole('radio', { name: 'Answer sheet' }));
    expect(screen.getByRole('button', { name: 'Item 1, answered B, correct answer B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Item 2, answered A, correct answer B, marked for review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Item 3, not answered, correct answer B' })).toBeInTheDocument();
  });

  it('filters to the wrong answers and blanks', async () => {
    fetchSittingReview.mockResolvedValue(REVIEW);
    renderAt();
    await screen.findByText('Question 1');
    fireEvent.click(screen.getByRole('radio', { name: /^Wrong/ }));
    expect(screen.getByText('Question 2')).toBeInTheDocument();
    expect(screen.getByText(/Your answer is marked wrong/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /^Blank/ }));
    expect(screen.getByText('Question 3')).toBeInTheDocument();
    expect(screen.getByText(/You left this item blank/)).toBeInTheDocument();
  });

  it('retakes the misses as a timed mock, for this account', async () => {
    fetchSittingReview.mockResolvedValue(REVIEW);
    renderAt();
    fireEvent.click(await screen.findByRole('button', { name: /Retake missed/ }));
    const state = screen.getByText(/^simulator:/).textContent;
    expect(state).toContain('"ownerUid":"u1"');
    expect(state).toContain('"sourceSessionId":"sess-1"');
  });

  it('practises the misses untimed', async () => {
    fetchSittingReview.mockResolvedValue(REVIEW);
    renderAt();
    fireEvent.click(await screen.findByRole('button', { name: /Practise missed/ }));
    expect(screen.getByText(/^practice:/).textContent).toContain('"source":"items"');
  });

  it('tags why a wrong answer was missed, suggesting a cause from the data', async () => {
    fetchSittingReview.mockResolvedValue(REVIEW);
    renderAt();
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
    // Item 2: answered wrong, and sure of it.
    const concept = await screen.findByRole('button', { name: /Concept/ });
    expect(concept).toHaveTextContent('suggested');
    fireEvent.click(screen.getByRole('button', { name: /Misread/ }));
    expect(screen.getByRole('button', { name: /Misread/ })).toHaveAttribute('aria-pressed', 'true');
    // The mistakes list doesn't hold it, so the fixed mark is left as it stands.
    await vi.waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/user/mistakes/q2', 'PUT', { cause: 'misread' }));
    // A blank is not a mistake to tag.
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByRole('group', { name: 'Why did you miss it?' })).not.toBeInTheDocument();
  });

  it('explains a sitting that is still in progress', async () => {
    fetchSittingReview.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('x'), { status: 409, code: 'IN_PROGRESS' })));
    renderAt();
    expect(await screen.findByRole('heading', { level: 1, name: 'This sitting isn’t finished yet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it("says when a running battle's review opens, and opens it then by itself", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const opensAt = new Date(Date.now() + 60_000);
      fetchSittingReview.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('x'), { status: 409, code: 'IN_PROGRESS', opensAt: opensAt.toISOString() })));
      fetchSittingReview.mockResolvedValueOnce(REVIEW);
      renderAt();
      const time = opensAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      expect(await screen.findByRole('heading', { level: 1, name: `This battle’s review opens at ${time}` })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(64_000);
      expect(await screen.findByText('Question 1')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers Try again while the answers are still syncing', async () => {
    fetchSittingReview.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('x'), { status: 409, code: 'SYNCING' })));
    fetchSittingReview.mockResolvedValueOnce(REVIEW);
    renderAt();
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Question 1')).toBeInTheDocument();
  });
});

describe('SittingReview — a battle', () => {
  const BATTLE_REVIEW = { ...REVIEW, session: { ...REVIEW.session, id: 'ABC123:u1', kind: 'battle', verdict: null, hasMarks: false } };
  const REPLAY = {
    battle: { id: 'ABC123', config: { mode: 'subject', subject: 'EE' }, timeLimitSecs: 1800, createdAt: '2026-10-05T03:00:00Z', questionOrder: ['q1', 'q2', 'q3'] },
    players: [
      { userId: 'ana', displayName: 'Ana', placement: 1, score: 3, total: 3, timeTakenSecs: 600, eloDelta: 8 },
      { userId: 'u1', displayName: 'Rey', placement: 2, score: 1, total: 3, timeTakenSecs: 700, eloDelta: -8 },
    ],
    picks: {
      q1: [{ userId: 'ana', answer: '20 A', isCorrect: true, timeMs: 42_000 }, { userId: 'u1', answer: '20 A', isCorrect: true, timeMs: 90_000 }],
      q2: [{ userId: 'ana', answer: '20 A', isCorrect: true, timeMs: 5000 }, { userId: 'u1', answer: '10 A', isCorrect: false, timeMs: 8000 }],
    },
  };
  const BATTLE_PATH = `/exams/sittings/${encodeURIComponent('ABC123:u1')}`;
  const picksShown = () => within(screen.getByRole('region', { name: 'How everyone answered' })).getAllByRole('listitem').map((li) => li.textContent);

  it('shows the final places and, under each question, how everyone answered', async () => {
    fetchSittingReview.mockResolvedValue(BATTLE_REVIEW);
    fetchBattleReplay.mockResolvedValue(REPLAY);
    renderAt(BATTLE_PATH);
    const places = await screen.findByRole('list', { name: 'Final places' });
    expect(fetchBattleReplay).toHaveBeenCalledWith('ABC123');
    expect(within(places).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['1stAna3/3', '2ndRey (you)1/3']);
    expect(picksShown()).toEqual(['Ana: B, right, 42s', 'You: B, right, 1m 30s']);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(picksShown()).toEqual(['Ana: B, right, 5s', 'You: A, wrong, 8s']);
    // No picks for a question the replay leaves out.
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByRole('region', { name: 'How everyone answered' })).not.toBeInTheDocument();
  });

  it('starts a rematch from the header and goes to its lobby', async () => {
    fetchSittingReview.mockResolvedValue(BATTLE_REVIEW);
    fetchBattleReplay.mockResolvedValue(REPLAY);
    requestRematch.mockResolvedValue({ battleId: 'NEW123', created: true });
    renderAt(BATTLE_PATH);
    fireEvent.click(await screen.findByRole('button', { name: /Rematch/ }));
    expect(await screen.findByText('at: /battle/NEW123')).toBeInTheDocument();
    expect(requestRematch).toHaveBeenCalledWith('ABC123');
  });

  it('joins a rematch someone already started (the server hands back theirs, not another)', async () => {
    fetchSittingReview.mockResolvedValue(BATTLE_REVIEW);
    fetchBattleReplay.mockResolvedValue({ ...REPLAY, battle: { ...REPLAY.battle, rematch: { battleId: 'REM456', status: 'WAITING' } } });
    requestRematch.mockResolvedValue({ battleId: 'REM456', created: false });
    renderAt(BATTLE_PATH);
    fireEvent.click(await screen.findByRole('button', { name: /Join rematch/ }));
    expect(await screen.findByText('at: /battle/REM456')).toBeInTheDocument();
    expect(requestRematch).toHaveBeenCalledWith('ABC123');
  });

  it('reviews the battle like any sitting when the replay fails to load', async () => {
    fetchSittingReview.mockResolvedValue(BATTLE_REVIEW);
    fetchBattleReplay.mockRejectedValue(new Error('500'));
    renderAt(BATTLE_PATH);
    expect(await screen.findByText('Question 1')).toBeInTheDocument();
    await vi.waitFor(() => expect(fetchBattleReplay).toHaveBeenCalled());
    expect(screen.queryByRole('list', { name: 'Final places' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'How everyone answered' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rematch/ })).not.toBeInTheDocument();
  });

  it('asks for no replay, and shows no picks, for a sitting that is not a battle', async () => {
    fetchSittingReview.mockResolvedValue(REVIEW);
    renderAt();
    expect(await screen.findByText('Question 1')).toBeInTheDocument();
    expect(fetchBattleReplay).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'How everyone answered' })).not.toBeInTheDocument();
  });
});
