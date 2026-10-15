// The placement page: intro → adaptive questions (no feedback) → result.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../components/PomodoroOwner', () => ({ default: () => null }));
vi.mock('../layouts/MainLayout', () => ({ default: ({ children }) => <div data-testid="main">{children}</div> }));
vi.mock('../layouts/ExamLayout', () => ({ default: ({ children }) => <div data-testid="exam">{children}</div> }));
vi.mock('../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));

const api = {
  fetchDiagnosticStatus: vi.fn(),
  startDiagnostic: vi.fn(),
  answerDiagnostic: vi.fn(),
  finishDiagnostic: vi.fn(),
};
vi.mock('../services/dbQueries', () => ({
  fetchDiagnosticStatus: (...a) => api.fetchDiagnosticStatus(...a),
  startDiagnostic: (...a) => api.startDiagnostic(...a),
  answerDiagnostic: (...a) => api.answerDiagnostic(...a),
  finishDiagnostic: (...a) => api.finishDiagnostic(...a),
}));

const { default: Diagnostic } = await import('./Diagnostic');

const item = (id, subject = 'EE') => ({ id, subject, subtopic: 'Machines', text: `Question ${id}`, options: ['Henry', 'Farad', 'Ohm', 'Tesla'] });
const RESULT = {
  projectedGWA: 63.4, seeded: true,
  subjects: {
    Mathematics: { expected: 48, band: 'foundation', answered: 5, correct: 2 },
    ESAS: { expected: 66, band: 'developing', answered: 6, correct: 4 },
    EE: { expected: 71, band: 'board-ready', answered: 8, correct: 6 },
  },
};

beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

const renderPage = () => render(<MemoryRouter><Diagnostic /></MemoryRouter>);

describe('Diagnostic page', () => {
  it('Try again asks the server again instead of reloading the app', async () => {
    api.fetchDiagnosticStatus.mockRejectedValueOnce(new Error('[OFFLINE]')).mockResolvedValueOnce({ status: 'none' });
    renderPage();
    expect(await screen.findByText('Placement test unavailable')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Start placement test' })).toBeInTheDocument();
    expect(api.fetchDiagnosticStatus).toHaveBeenCalledTimes(2);
  });

  it("shows each item's choices in this sitting's order (keyed by its session), and sends the chosen text", async () => {
    const { optionKey, orderOptions } = await import('@ree/shared');
    api.fetchDiagnosticStatus.mockResolvedValue({ status: 'none' });
    api.startDiagnostic.mockResolvedValue({ sessionId: 's9', item: item('q7'), progress: { answered: 0, total: 19 } });
    api.answerDiagnostic.mockResolvedValue({ done: false, item: item('q8'), progress: { answered: 1, total: 19 } });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Start placement test' }));
    await screen.findByText('Question q7');
    // The answer choices (not the confidence radios), less their "A." labels.
    const choices = screen.getAllByRole('radio').filter((r) => /^[A-D]\./.test(r.textContent));
    const shown = choices.map((r) => r.textContent.replace(/^[A-D]\./, '').trim());
    expect(shown).toEqual(orderOptions(['Henry', 'Farad', 'Ohm', 'Tesla'], optionKey('s9', 'q7')));
    fireEvent.click(choices[0]);
    fireEvent.click(screen.getByRole('button', { name: /Submit answer/ }));
    await screen.findByText('Question q8');
    expect(api.answerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ questionId: 'q7', userAnswer: shown[0] }));
  });

  it('runs from the intro to the placement result', async () => {
    api.fetchDiagnosticStatus.mockResolvedValue({ status: 'none' });
    api.startDiagnostic.mockResolvedValue({ sessionId: 's1', item: item('q1'), progress: { answered: 0, total: 19 } });
    api.answerDiagnostic
      .mockResolvedValueOnce({ done: false, item: item('q2', 'ESAS'), progress: { answered: 1, total: 19 } })
      .mockResolvedValueOnce({ done: true, result: RESULT });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Start placement test' }));
    expect(await screen.findByText('Question q1')).toBeInTheDocument();
    expect(screen.getByText('Question 1 of about 19')).toBeInTheDocument();

    // Submit is disabled until an option is chosen.
    const submit = screen.getByRole('button', { name: /Submit answer/ });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /Henry/ }));
    fireEvent.click(submit);
    expect(await screen.findByText('Question q2')).toBeInTheDocument();
    expect(api.answerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 's1', questionId: 'q1', userAnswer: 'Henry' }));

    fireEvent.click(screen.getByRole('radio', { name: /Farad/ }));
    fireEvent.click(screen.getByRole('button', { name: /Submit answer/ }));
    expect(await screen.findByText('63.4%')).toBeInTheDocument();
    expect(screen.getByText('Foundation')).toBeInTheDocument();
    expect(screen.getByText('Board-ready')).toBeInTheDocument();
    // The intro promises the answers at the end: the result links to them.
    expect(screen.getByRole('link', { name: 'Review your answers' })).toHaveAttribute('href', '/exams/sittings/s1');
    // Math is under the 50% floor: the main button starts Practice on it,
    // whatever the average says, and the guide says why.
    expect(screen.getByRole('link', { name: /^Practise Math/ })).toHaveAttribute('href', '/practice');
    expect(screen.getByText(/under the 50% subject floor/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Today' })).toBeInTheDocument();
    // The exam plan is asked for here, with the study plan on offer.
    expect(screen.getByRole('heading', { name: 'Your exam plan' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Plan my weeks to the exam/ })).toBeInTheDocument();
  });

  it('offers to resume an unfinished sitting', async () => {
    api.fetchDiagnosticStatus.mockResolvedValue({ status: 'in_progress', progress: { answered: 4, total: 19 } });
    renderPage();
    expect(await screen.findByRole('button', { name: 'Resume (4 of 19 done)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument();
  });
});
