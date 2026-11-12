import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const apiRequest = vi.fn();
const fetchQuestionById = vi.fn();
const updateQuestionInBank = vi.fn();
vi.mock('../../services/dbQueries', () => ({
  apiRequest: (...a) => apiRequest(...a),
  fetchQuestionById: (...a) => fetchQuestionById(...a),
  updateQuestionInBank: (...a) => updateQuestionInBank(...a),
}));
vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../quiz/ExplanationBody', () => ({ default: ({ text }) => <span>{text}</span> }));
// The editor: a Save that sends the question as it is.
vi.mock('../library/QuestionEditModal', () => ({
  default: ({ question, onSave }) => (question ? <button type="button" onClick={() => onSave(question)}>editor-save</button> : null),
}));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: QuestionReports } = await import('./QuestionReports');

const item = (id, reports, reasons, over = {}) => ({
  question: { id, subject: 'EE', subtopic: 'Circuits', text: `Stem ${id}`, options: ['1 A', '2 A'], answer: '2 A', fixedExplanation: 'Because.', isFlagged: false, ...over },
  reports, reasons, firstAt: '2026-11-01T00:00:00Z', lastAt: '2026-11-10T00:00:00Z',
});

beforeEach(() => {
  vi.clearAllMocks();
  apiRequest.mockImplementation(async (url) => {
    if (url.startsWith('/api/questions/reports?')) {
      return { total: 2, items: [item('q1', 2, { 'The answer key looks wrong': 2 }), item('q2', 1, { 'No reason given': 1 })] };
    }
    if (url.endsWith('/reports/resolve')) return { success: true, resolved: 1 };
    throw new Error(url);
  });
});

const card = (stem) => screen.getByText(stem).closest('li');

describe('Learners’ reports', () => {
  it('lists each reported question with how many and why, and tells the count', async () => {
    const onCount = vi.fn();
    render(<QuestionReports onCount={onCount} />);
    expect(await screen.findByText('2 questions reported')).toBeInTheDocument();
    const first = within(card('Stem q1'));
    expect(first.getByText('2 reports')).toBeInTheDocument();
    expect(first.getByText('The answer key looks wrong · 2')).toBeInTheDocument();
    expect(within(card('Stem q2')).getByText('No reason given')).toBeInTheDocument();
    expect(onCount).toHaveBeenCalledWith(2);
  });

  it('No problem closes the reports and leaves the list', async () => {
    const onClosed = vi.fn();
    render(<QuestionReports onClosed={onClosed} />);
    await screen.findByText('Stem q1');
    fireEvent.click(within(card('Stem q1')).getByRole('button', { name: 'No problem' }));
    await waitFor(() => expect(screen.queryByText('Stem q1')).not.toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith('/api/questions/q1/reports/resolve', 'POST', { resolution: 'dismissed' }, expect.anything());
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(screen.getByText('1 question reported')).toBeInTheDocument();
  });

  it('Remove asks once more before taking it out of the bank', async () => {
    render(<QuestionReports />);
    await screen.findByText('Stem q2');
    const two = within(card('Stem q2'));
    fireEvent.click(two.getByRole('button', { name: 'Remove' }));
    expect(apiRequest).not.toHaveBeenCalledWith(expect.stringContaining('resolve'), expect.anything(), expect.anything(), expect.anything());
    fireEvent.click(two.getByRole('button', { name: 'Take it out of the bank' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/questions/q2/reports/resolve', 'POST', { resolution: 'removed' }, expect.anything()));
  });

  it('Edit saves the question back into the bank, then closes the reports as fixed', async () => {
    fetchQuestionById.mockResolvedValue({ id: 'q1', text: 'Stem q1', isFlagged: true });
    updateQuestionInBank.mockResolvedValue({});
    render(<QuestionReports />);
    await screen.findByText('Stem q1');
    fireEvent.click(within(card('Stem q1')).getByRole('button', { name: /Edit/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'editor-save' }));
    await waitFor(() => expect(screen.queryByText('Stem q1')).not.toBeInTheDocument());
    expect(updateQuestionInBank).toHaveBeenCalledWith('q1', expect.objectContaining({ isFlagged: false }));
    expect(apiRequest).toHaveBeenCalledWith('/api/questions/q1/reports/resolve', 'POST', { resolution: 'fixed' }, expect.anything());
  });

  it('says so when there are none', async () => {
    apiRequest.mockResolvedValueOnce({ total: 0, items: [] });
    render(<QuestionReports />);
    expect(await screen.findByText('No open reports')).toBeInTheDocument();
  });
});
