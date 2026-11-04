import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const fetchRematchInvites = vi.fn();
vi.mock('../../services/dbQueries', () => ({ fetchRematchInvites: (...a) => fetchRematchInvites(...a) }));
let online = true;
vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => online }));

const { default: RematchInvites } = await import('./RematchInvites');

const INVITE = { battleId: 'ABC123', by: 'Ana', config: { mode: 'subject', subject: 'EE' } };
const show = () => render(<MemoryRouter><RematchInvites /></MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
  online = true;
  fetchRematchInvites.mockReset();
  fetchRematchInvites.mockResolvedValue({ items: [INVITE] });
});

describe('RematchInvites', () => {
  it('says who started it and goes straight to the lobby', async () => {
    show();
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'A rematch is waiting' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Join' })).toHaveAttribute('href', '/battle/ABC123');
  });

  it('Not now hides it on this device, and it stays hidden', async () => {
    const { unmount } = show();
    fireEvent.click(await screen.findByRole('button', { name: /Not now/ }));
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    unmount();
    show();
    await Promise.resolve();
    expect(fetchRematchInvites).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });

  it('shows nothing with no invites, offline, or if the request fails', async () => {
    fetchRematchInvites.mockResolvedValue({ items: [] });
    const a = show();
    await Promise.resolve();
    expect(a.container).toBeEmptyDOMElement();
    a.unmount();

    fetchRematchInvites.mockRejectedValue(new Error('[OFFLINE]'));
    const b = show();
    await Promise.resolve();
    expect(b.container).toBeEmptyDOMElement();
    b.unmount();

    fetchRematchInvites.mockClear();
    online = false;
    const c = show();
    expect(fetchRematchInvites).not.toHaveBeenCalled();
    expect(c.container).toBeEmptyDOMElement();
  });
});
