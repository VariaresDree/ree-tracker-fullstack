// The review queue mirrors the server's publish gate: a pending question whose
// subtopic is not a topic in its subject's live taxonomy cannot be approved
// (server answers 400 / bulk reason 'unknown-topic'), so the queue flags it,
// leaves it out of Accept All, and the inline editor shows the stale label
// honestly instead of silently displaying the first option.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LibraryOverview from './LibraryOverview';

vi.mock('../../store/useStore', () => ({
  useStore: () => ({
    isAdmin: true,
    dynamicTOS: { Mathematics: ['Algebra'], ESAS: [], EE: ['Electric Circuits 2', 'Electrical Transient Analysis'] },
    setDynamicTOS: vi.fn(),
  }),
}));

const approveReviewItem = vi.fn();
vi.mock('../../services/dbQueries', () => ({
  updateDynamicTOS: vi.fn(),
  fetchReviewQueue: vi.fn(),
  updateReviewItem: vi.fn(),
  approveReviewItem: (...a) => approveReviewItem(...a),
  rejectReviewItem: vi.fn(),
  bulkApproveReviewItems: vi.fn(),
  approveQuarantinedQuestion: vi.fn(),
  deleteQuestionFromBank: vi.fn(),
}));
const { fetchReviewQueue } = await import('../../services/dbQueries');

vi.mock('react-hot-toast', () => {
  const toastFn = vi.fn();
  toastFn.success = vi.fn();
  toastFn.error = vi.fn();
  toastFn.loading = vi.fn();
  toastFn.dismiss = vi.fn();
  return { default: toastFn };
});
const toast = (await import('react-hot-toast')).default;

const item = (id, subject, subtopic) => ({
  id, legacy: false, subject, subtopic, text: `Question ${id}`, options: ['A', 'B', 'C', 'D'], answer: 'A',
});

async function openQueue(queue) {
  fetchReviewQueue.mockResolvedValue(queue);
  const user = userEvent.setup();
  render(<LibraryOverview serverStats={{}} vaultMetadata={{}} resyncVaultMetadata={vi.fn().mockResolvedValue()} manualMode={false} setManualMode={() => {}} />);
  await user.click(screen.getByRole('button', { name: /review queue/i }));
  await screen.findByText('Question ok');
  return user;
}

const cardOf = (text) => screen.getByText(text).closest('div.bg-surface2\\/40');

describe('LibraryOverview — review queue topic gate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('leaves off-syllabus items out of Accept All and flags them', async () => {
    await openQueue([
      item('ok', 'EE', 'Electric Circuits 2'),
      item('math', 'Math', 'Algebra'), // stored spelling 'Math' still checks against Mathematics
      item('stale', 'EE', 'Transient Response'),
    ]);

    expect(screen.getByRole('button', { name: /accept all 2 valid/i })).toBeInTheDocument();
    expect(within(cardOf('Question stale')).getByText(/not in syllabus/i)).toBeInTheDocument();
    expect(within(cardOf('Question ok')).queryByText(/not in syllabus/i)).not.toBeInTheDocument();
  });

  it('the inline editor shows a stale label as its own option rather than masking it', async () => {
    const user = await openQueue([item('ok', 'EE', 'Electric Circuits 2'), item('stale', 'EE', 'Transient Response')]);

    await user.click(within(cardOf('Question stale')).getByRole('button', { name: 'Edit' }));
    const select = screen.getByLabelText('Subtopic');
    expect(select).toHaveValue('Transient Response');
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Transient Response (not in syllabus)', 'Electric Circuits 2', 'Electrical Transient Analysis',
    ]);
  });

  it("a refused single approve shows the server's reason", async () => {
    const user = await openQueue([item('ok', 'EE', 'Electric Circuits 2'), item('stale', 'EE', 'Transient Response')]);
    approveReviewItem.mockRejectedValue(Object.assign(
      new Error('"Transient Response" is not a topic in the EE syllabus. Pick a topic from the list.'), { status: 400 },
    ));

    await user.click(within(cardOf('Question stale')).getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('"Transient Response" is not a topic in the EE syllabus. Pick a topic from the list.'));
  });
});
