// The collapsed sidebar's connection badge used to say its state only in a
// hover title; a screen reader got nothing.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => false }));
vi.mock('../hooks/useOfflinePack', () => ({ useOfflinePack: () => ({ meta: { total: 300, fetchedAt: Date.now() }, isRefreshing: false, refresh: vi.fn() }) }));
vi.mock('../store/useStore', () => ({ useStore: (sel) => sel({ syncQueue: [1, 2], pendingWrites: [3], deadLetters: [] }) }));
vi.mock('./SyncIssues', () => ({ default: () => null }));

const { default: OfflineStatusBadge } = await import('./OfflineStatusBadge');

describe('OfflineStatusBadge', () => {
  it('collapsed, a screen reader hears the connection and the counts', () => {
    render(<OfflineStatusBadge collapsed />);
    expect(screen.getByRole('status')).toHaveTextContent('Offline');
    expect(screen.getByText(/300 questions saved for offline · 3 waiting to sync/)).toBeInTheDocument();
  });

  it('expanded, says what is waiting in plain words', () => {
    render(<OfflineStatusBadge />);
    expect(screen.getByRole('status')).toHaveTextContent('Offline');
    expect(screen.getByText('3 waiting to sync')).toBeInTheDocument();
  });
});
