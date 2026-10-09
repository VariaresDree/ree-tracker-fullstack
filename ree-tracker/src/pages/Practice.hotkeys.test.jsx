// One keypress, one recorded attempt.
//
// Active Review used to bind the option hotkeys TWICE: the page registered a
// window keydown for 1-4 (and Q/W/E), and MCQMode renders QuestionCard with
// `hotkeys={true}`, which registers its own. Both listeners ran on the same
// event, inside the same render, so both saw `isAnswered === false` and both
// called handleAnswerSelection — and every call stages an attempt under a fresh
// uuid. The server could not dedupe them (distinct clientAttemptIds), so every
// keyboard answer was stored twice: inflated totals, a double BKT update, and a
// doubled θ step.
//
// The page is rendered for real here — only its data hook and the providers
// around it are stubbed — so the test exercises both listeners exactly as they
// coexist in the app.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react';

vi.mock('../components/LatexRenderer', () => ({
  default: ({ content }) => <span>{content}</span>,
}));
vi.mock('../components/Scratchpad', () => ({ default: () => null }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
vi.mock('../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));

const handleAnswerSelection = vi.fn();
const setSession = vi.fn();
const endSession = vi.fn();
const loadNextQuestion = vi.fn();
const startSession = vi.fn();
let sessionState;

vi.mock('../features/active-recall/useReviewSession', () => ({
  useReviewSession: () => ({
    config: { sessionMode: 'mcq' },
    setConfig: vi.fn(),
    session: sessionState,
    setSession,
    elapsedTime: 0,
    bookmarks: new Set(),
    startSession,
    endSession,
    loadNextQuestion,
    handleAnswerSelection,
    handleFlashcardReveal: vi.fn(),
    handleFlashcardRating: vi.fn(),
    toggleBookmark: vi.fn(),
    handleFlagQuestion: vi.fn(),
    explainQuestion: vi.fn(),
    aiText: null,
    aiLoading: false,
    safeTOS: {},
    isSubmitting: false,
  }),
}));

const { default: Practice } = await import('./Practice');

const QUESTION = {
  id: 'q1',
  text: 'Unit of inductance?',
  options: ['Henry', 'Farad', 'Ohm', 'Tesla'],
  answer: 'Henry',
  subject: 'EE',
  subtopic: 'Circuits',
};

beforeEach(() => {
  handleAnswerSelection.mockReset();
  setSession.mockReset();
  endSession.mockReset();
  loadNextQuestion.mockReset();
  sessionState = {
    isActive: true,
    loading: false,
    isFinished: false,
    questions: [QUESTION],
    currentIndex: 0,
    isAnswered: false,
    isFlipped: false,
    confidence: 'HIGH',
    selectedOption: null,
    totalAnswered: 0,
    correctHits: 0,
  };
});

const renderPage = () => render(
  <MemoryRouter>
    <Practice />
  </MemoryRouter>,
);

describe('Practice hotkeys', () => {
  it('records exactly one answer per option keypress', () => {
    renderPage();
    fireEvent.keyDown(window, { key: '1' });
    expect(handleAnswerSelection).toHaveBeenCalledTimes(1);
    expect(handleAnswerSelection).toHaveBeenCalledWith('Henry');
  });

  it('sets confidence from one listener only', () => {
    sessionState.confidence = null;
    renderPage();
    fireEvent.keyDown(window, { key: 'q' });
    // QuestionCard routes Q/W/E through onConfidenceChange → setSession once.
    expect(setSession).toHaveBeenCalledTimes(1);
  });
});

describe('Practice session controls', () => {
  it('asks before ending a session with answers in it', () => {
    sessionState.totalAnswered = 3;
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'End session' }));
    expect(endSession).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'End and see summary' }));
    expect(endSession).toHaveBeenCalledTimes(1);
  });

  it('ends an empty session without asking', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'End session' }));
    expect(endSession).toHaveBeenCalledTimes(1);
  });

  it('Enter on a focused button leaves it to the button', () => {
    sessionState.isAnswered = true;
    renderPage();
    const next = screen.getByRole('button', { name: /Finish session|Next question/ });
    next.focus();
    fireEvent.keyDown(next, { key: 'Enter' });
    expect(loadNextQuestion).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(loadNextQuestion).toHaveBeenCalledTimes(1);
  });
});

describe('Practice launched from another page', () => {
  it('shows "Starting your session…" until it opens, not the setup form', async () => {
    let finish;
    startSession.mockImplementationOnce(() => new Promise((r) => { finish = r; }));
    sessionState = { ...sessionState, isActive: false, questions: [] };
    render(
      <MemoryRouter initialEntries={[{ pathname: '/practice', state: { preset: { count: 20 } } }]}>
        <Practice />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Starting your session');
    expect(startSession).toHaveBeenCalledWith({ count: 20 });
    await act(async () => { finish(); });
    expect(screen.queryByText('Starting your session…')).not.toBeInTheDocument();
  });
});
