// Bookmarks › Explain with AI. The tab used to show the official solution
// under a "Deep AI Analysis" label whenever no AI one existed, and pushed AI
// text to the admin-only route that overwrites the official solution.
// Also: a failed load is an error (not "No bookmarks yet"), offline says so,
// and removing one offers Undo.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../../components/SmartText', () => ({ default: ({ text }) => <span>{text}</span> }));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../../services/dbQueries', () => ({
  fetchBookmarks: vi.fn(),
  removeBookmark: vi.fn(),
  saveBookmark: vi.fn(),
  updateQuestionCache: vi.fn(),
}));
vi.mock('../../services/geminiApi', () => ({ generateMasterExplanation: vi.fn() }));

const { fetchBookmarks, removeBookmark, saveBookmark, updateQuestionCache } = await import('../../services/dbQueries');
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

describe('Bookmarks states', () => {
  const renderTab = (isOnline = true) => render(<MemoryRouter><BookmarkVaultTab currentUser={{ uid: 'u1' }} isOnline={isOnline} /></MemoryRouter>);

  it('a failed load is an error with Try again', async () => {
    fetchBookmarks.mockRejectedValueOnce(Object.assign(new Error('Server'), { status: 500 }));
    renderTab();
    expect(await screen.findByText("Couldn't load your bookmarks")).toBeInTheDocument();
    expect(screen.queryByText('No bookmarks yet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Find the current.')).toBeInTheDocument();
  });

  it('offline with nothing loaded says it needs a connection', async () => {
    fetchBookmarks.mockResolvedValueOnce([]);
    renderTab(false);
    expect(await screen.findByText('Bookmarks need a connection')).toBeInTheDocument();
  });

  it('removing one offers Undo, which saves it again', async () => {
    removeBookmark.mockResolvedValue({});
    saveBookmark.mockResolvedValue({});
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove bookmark' }));
    await waitFor(() => expect(screen.queryByText('Find the current.')).not.toBeInTheDocument());
    const toastContent = toast.mock.calls.at(-1)[0]({ id: 't1' });
    const { getByRole } = render(toastContent);
    await act(async () => { fireEvent.click(getByRole('button', { name: 'Undo' })); });
    expect(toast.dismiss).toHaveBeenCalledWith('t1');
    expect(saveBookmark).toHaveBeenCalledWith('u1', { questionId: 'q1' });
    expect(await screen.findByText('Find the current.')).toBeInTheDocument();
  });
});
