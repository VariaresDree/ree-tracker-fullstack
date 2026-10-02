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
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../components/LatexRenderer', () => ({
  default: ({ content }) => <span>{content}</span>,
}));
vi.mock('../components/Scratchpad', () => ({ default: () => null }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
vi.mock('../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));

const handleAnswerSelection = vi.fn();
const setSession = vi.fn();
let sessionState;

vi.mock('../features/active-recall/useReviewSession', () => ({
  useReviewSession: () => ({
    config: { sessionMode: 'mcq' },
    setConfig: vi.fn(),
    session: sessionState,
    setSession,
    elapsedTime: 0,
    bookmarks: new Set(),
    startSession: vi.fn(),
    endSession: vi.fn(),
    loadNextQuestion: vi.fn(),
    handleAnswerSelection,
    handleFlashcardReveal: vi.fn(),
    handleFlashcardRating: vi.fn(),
    toggleBookmark: vi.fn(),
    handleFlagQuestion: vi.fn(),
    fetchOrToggleAI: vi.fn(),
    safeTOS: {},
    isSubmitting: false,
  }),
}));

const { default: ActiveReview } = await import('./ActiveReview');

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
    <ActiveReview />
  </MemoryRouter>,
);

describe('Active Review hotkeys', () => {
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
