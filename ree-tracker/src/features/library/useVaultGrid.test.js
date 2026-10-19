// useVaultGrid: the Question bank's rows for the current filters. Its first
// render once read the sort order above the line that declares it, which
// throws; and a failed load for new filters left the previous filters' rows
// on screen as if they were the answer.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
const fetchPaginatedQuestions = vi.fn();
vi.mock('../../services/dbQueries', () => ({
  fetchPaginatedQuestions: (...a) => fetchPaginatedQuestions(...a),
  fetchServerStats: vi.fn(async () => ({ total: 2, math: 1, esas: 0, ee: 1 })),
  fetchVaultMetadata: vi.fn(async () => ({})),
  deleteQuestionFromBank: vi.fn(),
  updateQuestionInBank: vi.fn(),
  resyncVaultMetadata: vi.fn(),
}));

const { useVaultGrid } = await import('./useVaultGrid');

beforeEach(() => {
  fetchPaginatedQuestions.mockReset();
});

describe('useVaultGrid', () => {
  it('renders, then loads the first page for its filters, newest first', async () => {
    fetchPaginatedQuestions.mockResolvedValue({ items: [{ id: 'q1' }, { id: 'q2' }], nextOffset: 2 });
    const { result } = renderHook(() => useVaultGrid('EE', 'All'));
    expect(result.current.isFetchingVault).toBe(true);
    await waitFor(() => expect(result.current.isFetchingVault).toBe(false));
    expect(result.current.questions.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(fetchPaginatedQuestions).toHaveBeenCalledWith(null, 'EE', 'All', 30, 'recent', '');
  });

  it('searches by newest first, never in random order', async () => {
    fetchPaginatedQuestions.mockResolvedValue({ items: [{ id: 'q1' }], nextOffset: 1 });
    const { result, rerender } = renderHook(({ search }) => useVaultGrid('EE', 'All', search), { initialProps: { search: '' } });
    await waitFor(() => expect(result.current.isFetchingVault).toBe(false));
    act(() => result.current.setSortOrder('random'));
    rerender({ search: '201494a1' });
    await waitFor(() => expect(fetchPaginatedQuestions).toHaveBeenLastCalledWith(null, 'EE', 'All', 30, 'recent', '201494a1'));
  });

  it('keeps the editor open with the reason when a save fails', async () => {
    const { updateQuestionInBank } = await import('../../services/dbQueries');
    fetchPaginatedQuestions.mockResolvedValue({ items: [{ id: 'q1' }], nextOffset: 1 });
    updateQuestionInBank.mockRejectedValueOnce(new Error('The answer must be one of the options.'));
    const { result } = renderHook(() => useVaultGrid('EE', 'All'));
    await waitFor(() => expect(result.current.isFetchingVault).toBe(false));
    act(() => result.current.setEditingQ({ id: 'q1' }));
    let ok;
    await act(async () => { ok = await result.current.handleUpdateSubmit({ id: 'q1' }); });
    expect(ok).toBe(false);
    expect(result.current.editingQ).toEqual({ id: 'q1' });
    expect(result.current.saveState.error).toBe("Couldn't save: The answer must be one of the options.");
  });

  it('a failed load for new filters clears the old rows instead of passing them off as the answer', async () => {
    fetchPaginatedQuestions.mockResolvedValueOnce({ items: [{ id: 'ee1' }], nextOffset: 1 });
    const { result, rerender } = renderHook(({ subject }) => useVaultGrid(subject, 'All'), { initialProps: { subject: 'EE' } });
    await waitFor(() => expect(result.current.questions).toHaveLength(1));
    fetchPaginatedQuestions.mockRejectedValueOnce(new Error('500'));
    rerender({ subject: 'ESAS' });
    await waitFor(() => expect(result.current.isFetchingVault).toBe(false));
    expect(result.current.questions).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });
});
