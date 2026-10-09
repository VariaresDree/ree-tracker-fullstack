import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const refreshOfflinePack = vi.fn();
vi.mock('../services/dbQueries', () => ({ refreshOfflinePack: (...a) => refreshOfflinePack(...a) }));
vi.mock('../services/offlinePack', () => ({ getOfflinePackMeta: vi.fn(() => Promise.resolve({ exists: false, stale: true, total: 0 })) }));

const { useOfflinePack, __resetOfflinePack } = await import('./useOfflinePack');

function Badge({ label }) {
  const { isRefreshing, meta } = useOfflinePack();
  return <p>{label}:{isRefreshing ? 'syncing' : 'idle'}:{meta?.total ?? '-'}</p>;
}

beforeEach(() => {
  __resetOfflinePack();
  refreshOfflinePack.mockReset();
  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
});

describe('useOfflinePack', () => {
  it('two badges share one state and start one download', async () => {
    let finish;
    refreshOfflinePack.mockImplementation(() => new Promise((r) => { finish = r; }));
    render(<><Badge label="shell" /><Badge label="account" /></>);
    await act(async () => {});
    expect(refreshOfflinePack).toHaveBeenCalledTimes(1);
    expect(screen.getByText('shell:syncing:0')).toBeInTheDocument();
    expect(screen.getByText('account:syncing:0')).toBeInTheDocument();
    await act(async () => { finish({ exists: true, stale: false, total: 300 }); });
    expect(screen.getByText('shell:idle:300')).toBeInTheDocument();
    expect(screen.getByText('account:idle:300')).toBeInTheDocument();
  });
});
