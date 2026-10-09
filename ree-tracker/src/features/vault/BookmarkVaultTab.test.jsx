// Bookmarks › Explain with AI. The tab used to show the official solution
// under a "Deep AI Analysis" label whenever no AI one existed, and pushed AI
// text to the admin-only route that overwrites the official solution.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../../components/SmartText', () => ({ default: ({ text }) => <span>{text}</span> }));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../../services/dbQueries', () => ({
  fetchBookmarks: vi.fn(),
  removeBookmark: vi.fn(),
  updateQuestionCache: vi.fn(),
}));
vi.mock('../../services/geminiApi', () => ({ generateMasterExplanation: vi.fn() }));

const { fetchBookmarks, updateQuestionCache } = await import('../../services/dbQueries');
const { generateMasterExplanation } = await import('../../services/geminiApi');
const { default: BookmarkVaultTab } = await import('./BookmarkVaultTab');

const item = {
  id: 'q1', question: 'Find the current.', options: ['1 A', '2 A'], answer: '2 A',
  subject: 'EE', fixedExplanation: 'Official: Ohm’s law.', bookmarkedAt: '2026-10-01',
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchBookmarks.mockResolvedValue([item]);
  generateMasterExplanation.mockResolvedValue('AI: step by step.');
});

describe('Bookmarks explanations', () => {
  it('generates a real AI explanation and keeps the official solution separate', async () => {
    render(<MemoryRouter><BookmarkVaultTab currentUser={{ uid: 'u1' }} isOnline /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Show question' }));
    fireEvent.click(screen.getByRole('button', { name: 'Explain with AI' }));
    expect(await screen.findByText('AI: step by step.')).toBeInTheDocument();
    expect(generateMasterExplanation).toHaveBeenCalledWith(expect.objectContaining({ id: 'q1' }));
    expect(screen.queryByText('Official: Ohm’s law.')).not.toBeInTheDocument();
    expect(updateQuestionCache).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Show solution' }));
    await waitFor(() => expect(screen.getByText('Official: Ohm’s law.')).toBeInTheDocument());
  });
});
