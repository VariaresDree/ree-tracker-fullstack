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

// react-hot-toast's default export is itself callable (`toast('msg', opts)`,
// the plain form used for the "reconciled"/"recordkeeping-pending" notices)
// AND carries .success/.error/.loading/.dismiss — a mock factory can return
// a function with properties attached, same shape as the real module.
vi.mock('react-hot-toast', () => {
  const toastFn = vi.fn();
  toastFn.success = vi.fn();
  toastFn.error = vi.fn();
  toastFn.loading = vi.fn();
  toastFn.dismiss = vi.fn();
  return { default: toastFn };
});
const toast = (await import('react-hot-toast')).default;

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

  it('a fully clean run shows ONE "successfully added" toast, not the generic per-chunk messages', async () => {
    const queue = makeQueue(10); // one chunk, well under BULK_CHUNK_SIZE
    fetchReviewQueue.mockResolvedValue(queue);
    bulkApproveReviewItems.mockImplementationOnce(async (ids) => ({ approved: ids, failed: [] }));

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
    const acceptAllButton = await screen.findByRole('button', { name: /accept all 10 valid/i });
    await user.click(acceptAllButton);
    const dialog = await screen.findByRole('dialog', { name: /approve all 10 valid items\?/i });
    await user.click(within(dialog).getByRole('button', { name: /^approve 10$/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(
      'All 10 items successfully added to the question bank!',
    ));
    // The per-chunk granular message ("N questions approved and published")
    // is for when there's something to be aware of — a clean run shows the
    // one clear signal instead, not both stacked.
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('retries a thrown-error chunk ONCE before stopping, reconciling against the server first', async () => {
    const queue = makeQueue(30);
    // Every fetchReviewQueue call (the initial load AND the post-failure
    // reconciliation) returns the same static 30-item list — i.e. nothing
    // in chunk 2 actually got through server-side, so reconciliation should
    // find all 5 of its ids still pending and leave them in the queue.
    fetchReviewQueue.mockResolvedValue(queue);

    bulkApproveReviewItems.mockImplementationOnce(async (ids) => ({ approved: ids, failed: [] })); // chunk 1
    bulkApproveReviewItems.mockImplementationOnce(async () => { throw new Error('[OFFLINE]'); }); // chunk 2, first attempt
    bulkApproveReviewItems.mockImplementationOnce(async () => { throw new Error('[OFFLINE]'); }); // chunk 2, retry

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

    // 3 total: chunk 1 (success), chunk 2 (fails), chunk 2 retry (fails too)
    // — a genuine retry-once, not a second full manual Accept-All click.
    await waitFor(() => expect(bulkApproveReviewItems).toHaveBeenCalledTimes(3));

    // First chunk's 25 items are gone from the queue; the failed chunk's
    // items are still there (reconciliation found them still pending
    // server-side too, so no change — never optimistically removed either
    // way).
    await waitFor(() => expect(screen.queryByText(/^Question 0$/)).not.toBeInTheDocument());
    expect(screen.getByText(/^Question 25$/)).toBeInTheDocument();
  });

  it('a 409 (idempotency key still in flight) waits, reconciles, and continues WITHOUT retrying that request', async () => {
    const queue = makeQueue(30);
    const conflictErr = new Error('Duplicate request already in progress.');
    conflictErr.status = 409;

    bulkApproveReviewItems.mockImplementationOnce(async (ids) => ({ approved: ids, failed: [] })); // chunk 1
    bulkApproveReviewItems.mockImplementationOnce(async () => { throw conflictErr; }); // chunk 2 -> 409

    // Initial load: full 30-item queue. Reconciliation (triggered by the
    // 409) then reflects that the ORIGINAL in-flight request for chunk 2
    // actually finished server-side in the meantime — all 5 of its ids are
    // no longer pending.
    fetchReviewQueue.mockResolvedValueOnce(queue);
    fetchReviewQueue.mockResolvedValueOnce(queue.filter((q) => Number(q.id.split('-')[1]) < 25));

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

    // Exactly 2 calls — a 409 does NOT get the one-retry treatment (that
    // would just get another 409 from the same still-in-flight original).
    // The wait-then-reconcile step takes a few real seconds, hence the
    // longer timeout here rather than fake timers (which don't compose
    // cleanly with userEvent's own internal timer usage).
    await waitFor(() => expect(bulkApproveReviewItems).toHaveBeenCalledTimes(2), { timeout: 6000 });

    // Reconciliation found chunk 2's items already resolved server-side —
    // removed from view, no "connection dropped" error for them. Both
    // checks need the long timeout: chunk 1's effect (Question 0 gone) is
    // near-instant, but chunk 2 only STARTS its 3s wait+reconcile AFTER
    // chunk 1 finishes, so reaching this point doesn't mean chunk 2 is done
    // yet — waiting for Question 0 first is not a proxy for chunk 2's state.
    await waitFor(() => expect(screen.queryByText(/^Question 0$/)).not.toBeInTheDocument(), { timeout: 6000 });
    await waitFor(() => expect(screen.queryByText(/^Question 25$/)).not.toBeInTheDocument(), { timeout: 6000 });
    expect(screen.queryByText(/connection dropped/i)).not.toBeInTheDocument();
  }, 10000);
});
