import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: { uid: 'user-A' } } }));

const retryDeadLetter = vi.fn().mockResolvedValue();
const discardDeadLetter = vi.fn();
let state;
vi.mock('../store/useStore', () => ({
  useStore: (selector) => selector(state),
}));

const { default: SyncIssues } = await import('./SyncIssues');

beforeEach(() => {
  retryDeadLetter.mockClear();
  discardDeadLetter.mockClear();
  state = { deadLetters: [], retryDeadLetter, discardDeadLetter };
});

describe('SyncIssues', () => {
  it('renders nothing when there is nothing quarantined', () => {
    const { container } = render(<SyncIssues />);
    expect(container).toBeEmptyDOMElement();
  });

  it('counts quarantined batches and lets each be retried or discarded', () => {
    const legacy = { type: 'telemetry', ids: ['x'], at: 1 };
    state.deadLetters = [
      { id: 'd1', type: 'telemetry', ids: ['a', 'b'], attempts: [{ id: 'a' }, { id: 'b' }], error: 'Validation failed.', at: 2 },
      legacy,
    ];
    render(<SyncIssues />);

    fireEvent.click(screen.getByRole('button', { name: /2 sync issues/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('2 answers')).toBeInTheDocument();

    // Only the letter with a payload is retryable; the legacy one (ids only)
    // can still be discarded.
    const retries = screen.getAllByRole('button', { name: 'Retry' });
    expect(retries).toHaveLength(1);
    fireEvent.click(retries[0]);
    expect(retryDeadLetter).toHaveBeenCalledWith('d1');

    // Discard asks once more before deleting unsynced answers for good.
    const discards = screen.getAllByRole('button', { name: 'Discard' });
    fireEvent.click(discards[1]);
    expect(discardDeadLetter).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, discard' }));
    expect(discardDeadLetter).toHaveBeenCalledWith(legacy);
  });

  it('keeps the batch when the discard is cancelled', () => {
    state.deadLetters = [{ id: 'd1', type: 'telemetry', ids: ['a'], attempts: [{ id: 'a' }], error: 'x', at: 1 }];
    render(<SyncIssues />);
    fireEvent.click(screen.getByRole('button', { name: /1 sync issue/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(discardDeadLetter).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
  });

  it('never offers Retry for another account’s answers', () => {
    state.deadLetters = [{ id: 'o1', type: 'telemetry-orphaned', ownerUid: 'user-Z', ids: ['a'], attempts: [{ id: 'a' }], at: 1 }];
    render(<SyncIssues />);
    fireEvent.click(screen.getByRole('button', { name: /1 sync issue/i }));
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
  });
});
