// The Gauntlet result: what the run did to the ladder, judged on the PRC
// weighted average; the review link; drills; and solutions with AI on misses.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VERDICT } from '@ree/shared';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
vi.mock('../../components/NotificationOptIn', () => ({ default: () => null }));
vi.mock('../../services/aiExplanations', async (orig) => ({
  ...(await orig()),
  readSavedExplanations: vi.fn().mockResolvedValue({}),
  requestExplanation: vi.fn().mockResolvedValue('Because 2 + 2 = 4.'),
  saveExplanation: vi.fn().mockResolvedValue(),
}));

const { default: GauntletDiagnostics } = await import('./GauntletDiagnostics');

const base = {
  outcome: 'failed',
  verdict: VERDICT.CONDITIONAL,
  generalAverage: 71.4,
  scorePct: 70,
  correctCount: 35,
  totalItems: 50,
  isPassed: false,
  lockUntil: new Date(Date.now() + 12 * 3600e3).toISOString(),
  subjectScores: { Mathematics: 45, ESAS: 80, EE: 82 },
  failedSubtopics: { Arithmetic: 2 },
  review: [{
    questionId: 'q1', text: 'What is 2 + 2?', options: ['3', '4', '5', '6'], subtopic: 'Arithmetic',
    userAnswer: '3', correctAnswer: '4', explanation: null,
  }],
  timeUsedSecs: 1800,
  sessionId: 'run-1',
};

const renderResult = (diagnostics) => render(
  <MemoryRouter><GauntletDiagnostics diagnostics={{ ...base, ...diagnostics }} level="2" /></MemoryRouter>,
);

describe('GauntletDiagnostics', () => {
  it('leads with the outcome and the weighted average, and explains a conditional pass', () => {
    renderResult();
    expect(screen.getByRole('heading', { level: 1, name: 'Not passed this time' })).toBeInTheDocument();
    expect(screen.getByText('71.4%')).toBeInTheDocument();
    expect(screen.getByText(/A conditional pass/)).toBeInTheDocument();
    expect(screen.getByText(/opens again/)).toBeInTheDocument();
    expect(screen.getByText('Under the 50% floor')).toBeInTheDocument();
  });

  it('opens the run item by item', () => {
    renderResult();
    expect(screen.getByRole('link', { name: /Review every item/ })).toHaveAttribute('href', '/exams/sittings/run-1');
  });

  it('has no review link for a run the server did not record', () => {
    renderResult({ sessionId: null });
    expect(screen.queryByRole('link', { name: /Review every item/ })).not.toBeInTheDocument();
  });

  it('a missed item can be explained with AI', async () => {
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: /Explain with AI/ }));
    expect(await screen.findByText(/Because 2 \+ 2 = 4/)).toBeInTheDocument();
  });

  it('a passed tier says which level is open', () => {
    renderResult({ outcome: 'advanced', verdict: VERDICT.PASSED, isPassed: true, ladderLevel: 3, lockUntil: null });
    expect(screen.getByRole('heading', { level: 1, name: 'Tier passed' })).toBeInTheDocument();
    expect(screen.getByText('Level 3 is open.')).toBeInTheDocument();
  });
});
