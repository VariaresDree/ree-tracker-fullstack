import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// Admin › Formula cards › Review: rewrites of live cards wait here (2026-11-16).

const db = { fetchCardRevisions: vi.fn(), approveCardRevision: vi.fn(), rejectCardRevision: vi.fn(), bulkApproveCardRevisions: vi.fn() };
vi.mock('../../services/dbQueries', () => db);
vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: RevisionQueue } = await import('./RevisionQueue');

const card = { id: 'c1', name: 'One Base Law', symbol: '$1^n$', formulaLatex: '$1^n = 1$', description: 'One to any power.', subject: 'Mathematics', topic: { name: 'Algebra' }, subtopic: null, subtopicTag: 'Law of Exponents', variables: [] };
const ITEMS = [
  { id: 'r1', retire: false, note: 'Clearer name.', content: { name: 'Power of One', description: 'One to any power.', subtopic: 'Algebraic Expressions' }, card },
  { id: 'r2', retire: true, note: 'Same as Sum of Cubes Formula.', content: {}, card: { ...card, id: 'c2', name: 'Sum of Cubes Factorization' } },
];

beforeEach(() => {
  vi.clearAllMocks();
  db.fetchCardRevisions.mockResolvedValue(ITEMS);
  db.approveCardRevision.mockResolvedValue({ success: true });
  db.rejectCardRevision.mockResolvedValue({ success: true });
  db.bulkApproveCardRevisions.mockResolvedValue({ approved: ['r1'], failed: [{ id: 'r2', reason: 'card-gone' }] });
});

describe('Rewrites in the review queue', () => {
  it('shows only what changes, before and after, and a retiring one as such', async () => {
    render(<RevisionQueue />);
    expect(await screen.findByText('Rewrite of One Base Law')).toBeInTheDocument();
    const rewrite = screen.getByText('Rewrite of One Base Law').closest('li');
    expect(within(rewrite).getByText('Power of One')).toBeInTheDocument();
    expect(within(rewrite).getByText('Algebraic Expressions')).toBeInTheDocument();
    // The description is the same as now: not listed.
    expect(within(rewrite).queryByText('Description')).toBeNull();
    const retire = screen.getByText('Sum of Cubes Factorization').closest('li');
    expect(within(retire).getByText('Same as Sum of Cubes Formula.')).toBeInTheDocument();
    expect(within(retire).getByRole('button', { name: 'Retire it' })).toBeInTheDocument();
  });

  it('approves or rejects one, and Approve all keeps what failed', async () => {
    render(<RevisionQueue />);
    const rewrite = (await screen.findByText('Rewrite of One Base Law')).closest('li');
    fireEvent.click(within(rewrite).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(db.rejectCardRevision).toHaveBeenCalledWith('r1'));
    await waitFor(() => expect(screen.queryByText('Rewrite of One Base Law')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Approve all 1' }));
    await waitFor(() => expect(db.bulkApproveCardRevisions).toHaveBeenCalledWith(['r2']));
    expect(await screen.findByText('Sum of Cubes Factorization')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('1 rewrite not applied; they stay here.');
  });

  it('shows nothing when there are none', async () => {
    db.fetchCardRevisions.mockResolvedValue([]);
    const { container } = render(<RevisionQueue />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
