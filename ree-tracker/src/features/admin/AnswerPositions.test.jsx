// Admin › Question bank › Answer positions: checked on demand, the balance
// per letter and the rows to fix.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const fetchOptionAudit = vi.fn();
const fixOptionKeys = vi.fn();
const fetchQuestionById = vi.fn();
const updateQuestionInBank = vi.fn();
vi.mock('../../services/dbQueries', () => ({
  fetchOptionAudit: (...a) => fetchOptionAudit(...a),
  fixOptionKeys: (...a) => fixOptionKeys(...a),
  fetchQuestionById: (...a) => fetchQuestionById(...a),
  updateQuestionInBank: (...a) => updateQuestionInBank(...a),
}));
vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
const { default: AnswerPositions } = await import('./AnswerPositions');

const AUDIT = {
  total: 10,
  positions: { A: 5, B: 2, C: 1, D: 1, other: 0, missing: 1, fixedOrder: 2 },
  shares: { A: 55.6, B: 22.2, C: 11.1, D: 11.1, other: 0 },
  letterInExplanation: 3,
  samples: { missing: ['q-m'], fixedOrder: ['q-f1', 'q-f2'], letterInExplanation: ['q-l1', 'q-l2', 'q-l3'] },
  checkedAt: '2026-10-14T00:00:00Z',
};

// A block body: a function returned from beforeEach runs as its teardown.
beforeEach(() => { fetchOptionAudit.mockReset(); fixOptionKeys.mockReset(); fetchQuestionById.mockReset(); updateQuestionInBank.mockReset(); });

describe('AnswerPositions', () => {
  it('reads the bank only when asked, then shows the balance and what to fix', async () => {
    fetchOptionAudit.mockResolvedValue(AUDIT);
    render(<AnswerPositions />);
    expect(fetchOptionAudit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Check the bank' }));
    expect(await screen.findByRole('progressbar', { name: 'Answer at A: 55.6% of questions' })).toBeInTheDocument();
    expect(screen.getByText(/10 live questions/)).toBeInTheDocument();
    expect(screen.getByText(/answer isn’t one of the options/)).toBeInTheDocument();
    expect(screen.getByText('q-m')).toBeInTheDocument();
    expect(screen.getByText(/explanations name an option by letter/)).toBeInTheDocument();
    expect(screen.getByText(/questions keep the stored order/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
  });

  it('says when the check fails', async () => {
    fetchOptionAudit.mockRejectedValue(new Error('x'));
    render(<AnswerPositions />);
    fireEvent.click(screen.getByRole('button', { name: 'Check the bank' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t check the bank');
  });

  it('fixes keys that match an option up to form, then checks again', async () => {
    const withFix = { ...AUDIT, keyFixes: [{ id: 'q-m', from: '1 - k^3', to: '$1 - k^3$' }] };
    fetchOptionAudit.mockResolvedValueOnce(withFix).mockResolvedValueOnce({ ...AUDIT, positions: { ...AUDIT.positions, missing: 0 }, samples: { ...AUDIT.samples, missing: [] }, keyFixes: [], checkedAt: '2026-10-14T00:01:00Z' });
    fixOptionKeys.mockResolvedValue({ fixed: ['q-m'], skipped: [] });
    render(<AnswerPositions />);
    fireEvent.click(screen.getByRole('button', { name: 'Check the bank' }));
    expect(await screen.findByText('$1 - k^3$')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use the option’s text' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Fixed 1 answer.');
    expect(fixOptionKeys).toHaveBeenCalledWith(['q-m']);
    expect(fetchOptionAudit).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/answers aren’t one of the options/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Use the option/ })).not.toBeInTheDocument();
  });

  it('counts keys already fixed (a second press) as fixed, and sends one request per press', async () => {
    const withFix = { ...AUDIT, keyFixes: [{ id: 'q-m', from: 'x', to: '$x$' }, { id: 'q-n', from: 'y', to: '$y$' }] };
    fetchOptionAudit.mockResolvedValueOnce(withFix).mockResolvedValueOnce({ ...AUDIT, keyFixes: [], checkedAt: '2026-10-14T00:02:00Z' });
    let resolve;
    fixOptionKeys.mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<AnswerPositions />);
    fireEvent.click(screen.getByRole('button', { name: 'Check the bank' }));
    const press = await screen.findByRole('button', { name: 'Use the options’ text (2)' });
    fireEvent.click(press);
    fireEvent.click(press);
    expect(fixOptionKeys).toHaveBeenCalledTimes(1);
    resolve({ fixed: [], skipped: [{ id: 'q-m', reason: 'already-an-option' }, { id: 'q-n', reason: 'no-single-match' }] });
    expect(await screen.findByRole('status')).toHaveTextContent('Fixed 1 answer; 1 had changed since the check and was left alone.');
  });

  it('opens a listed question in the editor, saves it, then checks again', async () => {
    const q = { id: 'q-m', subject: 'EE', subtopic: '', type: 'conceptual', difficulty: 2, text: 'Which gate inverts its input?', options: ['NOT', 'AND', 'OR', 'XOR'], answer: 'NOT', fixedExplanation: '' };
    fetchOptionAudit.mockResolvedValue({ ...AUDIT, brokenMath: 1, duplicateOptions: 0, samples: { ...AUDIT.samples, brokenMath: ['q-m'], duplicateOptions: [] } });
    fetchQuestionById.mockResolvedValue(q);
    updateQuestionInBank.mockResolvedValue({});
    render(<AnswerPositions />);
    fireEvent.click(screen.getByRole('button', { name: 'Check the bank' }));
    expect(await screen.findByText(/math that may not render/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Open question q-m' })[0]);
    expect(fetchQuestionById).toHaveBeenCalledWith('q-m');
    fireEvent.click(await screen.findByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updateQuestionInBank).toHaveBeenCalledWith('q-m', expect.objectContaining({ id: 'q-m', difficulty: 2, isFlagged: false })));
    expect(await screen.findByText('Question saved.')).toBeInTheDocument();
    expect(fetchOptionAudit).toHaveBeenCalledTimes(2);
  });
});
