// Admin › Explanation review: the queue loads as skeleton cards (it was a
// spinner), and an empty queue is an empty state with Refresh.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const fetchPendingExplanations = vi.fn();
vi.mock('../../services/dbQueries', () => ({
  fetchPendingExplanations: (...a) => fetchPendingExplanations(...a),
  updateExplanationStatus: vi.fn(),
  bulkApproveExplanations: vi.fn(),
}));
vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));

const { default: ExplanationReview } = await import('./ExplanationReview');

describe('ExplanationReview', () => {
  it('shows skeleton cards while the queue loads, then an empty state with Refresh', async () => {
    let resolve;
    fetchPendingExplanations.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    render(<ExplanationReview />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading review queue…');

    resolve([]);
    expect(await screen.findByText('No pending explanations to review')).toBeInTheDocument();
    fetchPendingExplanations.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(fetchPendingExplanations).toHaveBeenCalledTimes(2);
  });
});
