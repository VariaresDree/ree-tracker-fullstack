// A past sitting, item by item: filters, your answer beside the key, pacing,
// and a timed retake or a practice set of the misses. Plus the states that
// aren't a review: still in progress, still syncing, offline.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../components/SmartText', () => ({ default: ({ text }) => <span>{text}</span> }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
vi.mock('../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
const fetchSittingReview = vi.fn();
vi.mock('../services/dbQueries', () => ({ fetchSittingReview: (...a) => fetchSittingReview(...a) }));
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

const renderAt = () => render(
  <MemoryRouter initialEntries={['/exams/sittings/sess-1']}>
    <Routes>
      <Route path="/exams/sittings/:sessionId" element={<SittingReview />} />
      <Route path="/simulator" element={<Probe label="simulator" />} />
      <Route path="/practice" element={<Probe label="practice" />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => fetchSittingReview.mockReset());

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

  it('explains a sitting that is still in progress', async () => {
    fetchSittingReview.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('x'), { status: 409, code: 'IN_PROGRESS' })));
    renderAt();
    expect(await screen.findByRole('heading', { level: 1, name: 'This sitting isn’t finished yet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('offers Try again while the answers are still syncing', async () => {
    fetchSittingReview.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('x'), { status: 409, code: 'SYNCING' })));
    fetchSittingReview.mockResolvedValueOnce(REVIEW);
    renderAt();
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Question 1')).toBeInTheDocument();
  });
});
