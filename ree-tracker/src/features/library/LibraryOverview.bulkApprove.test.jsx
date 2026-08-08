// Regression coverage for "Accept All" chunking (see BULK_CHUNK_SIZE in
// LibraryOverview.jsx): apiRequest hard-aborts at 12s and the server approves
// serially, so a queue of any real size sent in ONE request used to report
// "failed" while the server kept going and finished anyway. This test drives
// a queue larger than one chunk through the real handler and asserts the
// client actually splits the request, reconciles per chunk against the
// server's response, and never optimistically removes an item its own chunk
// hasn't confirmed.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LibraryOverview from './LibraryOverview';

vi.mock('../../store/useStore', () => ({
  useStore: () => ({
    isAdmin: true,
    dynamicTOS: { Mathematics: [], ESAS: [], EE: [] },
    setDynamicTOS: vi.fn(),
  }),
}));

const bulkApproveReviewItems = vi.fn();
vi.mock('../../services/dbQueries', () => ({
  updateDynamicTOS: vi.fn(),
  fetchReviewQueue: vi.fn(),
  updateReviewItem: vi.fn(),
  approveReviewItem: vi.fn(),
  rejectReviewItem: vi.fn(),
  bulkApproveReviewItems: (...args) => bulkApproveReviewItems(...args),
  approveQuarantinedQuestion: vi.fn(),
  deleteQuestionFromBank: vi.fn(),
}));

const { fetchReviewQueue } = await import('../../services/dbQueries');

// A queue bigger than one BULK_CHUNK_SIZE (25) batch, all bulk-eligible.
const makeQueue = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `rev-${i}`,
    legacy: false,
    subject: 'EE',
    subtopic: 'AC Electric Circuits',
    text: `Question ${i}`,
    options: ['A', 'B', 'C', 'D'],
    answer: 'A',
  }));

describe('LibraryOverview — Accept All chunking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('splits a 30-item queue into chunks, reconciling per chunk against the server', async () => {
    const queue = makeQueue(30);
    fetchReviewQueue.mockResolvedValue(queue);

    // First chunk (25 ids) approves cleanly; second chunk (5 ids) has one
    // real failure and one published-but-bookkeeping-pending item, so both
    // paths are exercised in a single run.
    bulkApproveReviewItems.mockImplementationOnce(async (ids) => ({
      approved: ids,
      failed: [],
    }));
    bulkApproveReviewItems.mockImplementationOnce(async (ids) => ({
      approved: ids.slice(0, 3),
      failed: [
        { id: ids[3], reason: 'invalid' },
        { id: ids[4], reason: 'published-pending-recordkeeping', questionId: 'q-x' },
      ],
    }));

    const user = userEvent.setup();
    const resyncVaultMetadata = vi.fn().mockResolvedValue();

    render(
      <LibraryOverview
        serverStats={{}}
        vaultMetadata={{}}
        resyncVaultMetadata={resyncVaultMetadata}
        manualMode={false}
        setManualMode={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /review queue/i }));
    await waitFor(() => expect(fetchReviewQueue).toHaveBeenCalled());

    const acceptAllButton = await screen.findByRole('button', { name: /accept all 30 valid/i });
    await user.click(acceptAllButton);

    const dialog = await screen.findByRole('dialog', { name: /approve all 30 valid items\?/i });
    await user.click(within(dialog).getByRole('button', { name: /^approve 30$/i }));

    // The critical assertion: TWO requests, not one covering all 30 ids —
    // this is what keeps each request inside apiRequest's 12s abort budget.
    await waitFor(() => expect(bulkApproveReviewItems).toHaveBeenCalledTimes(2));
    expect(bulkApproveReviewItems.mock.calls[0][0]).toHaveLength(25);
    expect(bulkApproveReviewItems.mock.calls[1][0]).toHaveLength(5);

    // 25 (chunk 1) + 3 (chunk 2) = 28 approved and removed from the queue;
    // the 2 that came back in `failed` (one genuine, one recordkeeping-
    // pending) stay visible for the admin to see.
    await waitFor(() => expect(screen.queryByText(/^Question 0$/)).not.toBeInTheDocument());
    expect(screen.getAllByText(/^Pending review$/).length).toBe(2);

    // resyncVaultMetadata still ran (something did get published) and never
    // threw into the handler even though it's fire-and-forget elsewhere.
    await waitFor(() => expect(resyncVaultMetadata).toHaveBeenCalled());
  });

  it('stops after a chunk that never gets a server verdict, leaving that chunk and later ones queued', async () => {
    const queue = makeQueue(30);
    fetchReviewQueue.mockResolvedValue(queue);

    bulkApproveReviewItems.mockImplementationOnce(async (ids) => ({ approved: ids, failed: [] }));
    bulkApproveReviewItems.mockImplementationOnce(async () => { throw new Error('[OFFLINE]'); });

    const user = userEvent.setup();
    render(
      <LibraryOverview
        serverStats={{}}
        vaultMetadata={{}}
        resyncVaultMetadata={vi.fn().mockResolvedValue()}
        manualMode={false}
        setManualMode={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /review queue/i }));
    const acceptAllButton = await screen.findByRole('button', { name: /accept all 30 valid/i });
    await user.click(acceptAllButton);
    const dialog = await screen.findByRole('dialog', { name: /approve all 30 valid items\?/i });
    await user.click(within(dialog).getByRole('button', { name: /^approve 30$/i }));

    // Only 2 chunks attempted (the 2nd threw); a 3rd chunk (there isn't one at
    // n=30/25 anyway) would never fire after a stop, so pin the call count.
    await waitFor(() => expect(bulkApproveReviewItems).toHaveBeenCalledTimes(2));

    // First chunk's 25 items are gone from the queue; the failed chunk's
    // items are still there (never optimistically removed).
    await waitFor(() => expect(screen.queryByText(/^Question 0$/)).not.toBeInTheDocument());
    expect(screen.getByText(/^Question 25$/)).toBeInTheDocument();
  });
});
