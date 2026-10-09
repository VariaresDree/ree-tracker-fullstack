// The placement page: intro → adaptive questions (no feedback) → result.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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
  });

  it('offers to resume an unfinished sitting', async () => {
    api.fetchDiagnosticStatus.mockResolvedValue({ status: 'in_progress', progress: { answered: 4, total: 19 } });
    renderPage();
    expect(await screen.findByRole('button', { name: 'Resume (4 of 19 done)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument();
  });
});
