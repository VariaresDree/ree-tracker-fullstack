// src/features/assigned-exams/admin/ExamResults.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { apiRequest, fetchQuestionById, updateQuestionInBank } from '../../../services/dbQueries';
import ExamResults from './ExamResults';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../../../services/dbQueries', () => ({ apiRequest: vi.fn(), fetchQuestionById: vi.fn(), updateQuestionInBank: vi.fn() }));
vi.mock('../../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../../library/QuestionEditModal', () => ({
  default: ({ question, onSave }) => (question ? <div role="dialog" aria-label="Edit question"><p>{question.text}</p><button type="button" onClick={() => onSave(question)}>Save</button></div> : null),
}));

const results = {
  exam: { id: 'x1', title: 'EE prelim', itemCount: 5, status: 'published' },
  takers: 3, average: 63, passed: 1,
  learners: [
    { userId: 'b', displayName: 'Ben', first: 90, best: 90, attempts: 1, last: '2026-11-21T00:00:00Z', firstMode: 'BATTLE' },
    { userId: 'a', displayName: 'Ana', first: 40, best: 100, attempts: 3, last: '2026-11-22T00:00:00Z', firstMode: 'BOARD_SIM' },
  ],
  items: [
    { questionId: 'q5', answered: 3, correct: 0, pct: 0, question: { id: 'q5', subject: 'EE', subtopic: 'Machinery 1', text: 'Slip of an induction motor' } },
    { questionId: 'q1', answered: 3, correct: 3, pct: 100, question: { id: 'q1', subject: 'Math', subtopic: 'Calculus 1', text: 'Derivative of x²' } },
    { questionId: 'q9', answered: 1, correct: 1, pct: 100, question: null },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  apiRequest.mockResolvedValue(results);
  fetchQuestionById.mockResolvedValue({ id: 'q5', text: 'Slip of an induction motor' });
  updateQuestionInBank.mockResolvedValue({});
});

describe('ExamResults', () => {
  it('leads with how many took it, their average first try and how many passed', async () => {
    render(<ExamResults examId="x1" onBack={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'EE prelim' })).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/api/admin/assigned-exams/x1/results', 'GET', null, expect.anything());
    expect(screen.getByText('Took it').closest('div').parentElement).toHaveTextContent('3');
    expect(screen.getByText('Passed (70%+)').closest('div').parentElement).toHaveTextContent('of 3');
  });

  it('lists every learner by first try, with best, tries and how they first took it', async () => {
    render(<ExamResults examId="x1" onBack={vi.fn()} />);
    const learners = (await screen.findByRole('heading', { name: 'Learners' })).closest('section');
    expect(learners).toHaveTextContent('Ben');
    expect(learners).toHaveTextContent('In a battle');
    expect(learners).toHaveTextContent('Alone');
    expect(learners).toHaveTextContent('100%');
  });

  it('lists the questions hardest first, says which to check, and opens one to edit', async () => {
    render(<ExamResults examId="x1" onBack={vi.fn()} />);
    const list = (await screen.findByRole('heading', { name: 'Questions, hardest first' })).closest('section');
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('0% right');
    expect(rows[0]).toHaveTextContent('0 of 3');
    expect(rows[0]).toHaveTextContent('Hard, or a wrong key? Check it.');
    expect(rows[1]).not.toHaveTextContent('Hard, or a wrong key?');
    expect(rows[2]).toHaveTextContent('This question was deleted from the bank.');

    fireEvent.click(within(rows[0]).getByRole('button', { name: /Edit question/ }));
    const editor = await screen.findByRole('dialog', { name: 'Edit question' });
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateQuestionInBank).toHaveBeenCalledWith('q5', expect.objectContaining({ id: 'q5' })));
    expect(toast.success).toHaveBeenCalledWith('Question saved. New sittings get the change.');
  });

  it('says when no one has taken it yet', async () => {
    apiRequest.mockResolvedValue({ ...results, takers: 0, average: null, passed: 0, learners: [], items: [] });
    render(<ExamResults examId="x1" onBack={vi.fn()} />);
    expect(await screen.findByText('No one has taken it yet')).toBeInTheDocument();
  });
});
