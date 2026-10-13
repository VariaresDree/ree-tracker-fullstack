// Exams › Battles › Your battles in progress: the way back into a battle you
// left part-way, from the server (so it works on any device), on the
// server's clock.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
vi.mock('../../services/dbQueries', () => ({ fetchActiveBattles: vi.fn() }));

const { fetchActiveBattles } = await import('../../services/dbQueries');
const { default: ActiveBattles } = await import('./ActiveBattles');

const renderIt = () => render(<MemoryRouter><ActiveBattles /></MemoryRouter>);

beforeEach(() => vi.clearAllMocks());

describe('ActiveBattles', () => {
  it('offers Return to battle with the minutes left, counted on the server clock', async () => {
    // This device's clock runs 10 minutes behind the server's.
    const serverNow = Date.now() + 10 * 60000;
    fetchActiveBattles.mockResolvedValue({
      serverNow,
      items: [{ battleId: 'ABC123', config: { subject: 'EE' }, endsAt: serverNow + 23 * 60000, closesAt: serverNow + 23.5 * 60000, remainingMs: 23 * 60000, finished: false }],
    });
    renderIt();
    const link = await screen.findByRole('link', { name: /Return to battle/ });
    expect(link).toHaveAttribute('href', '/simulator?battleId=ABC123');
    expect(screen.getByText('23 min left')).toBeInTheDocument();
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });

  it('once you have submitted, says when the results are due instead', async () => {
    const serverNow = Date.now();
    fetchActiveBattles.mockResolvedValue({
      serverNow,
      items: [{ battleId: 'XYZ789', config: { mode: 'blended' }, endsAt: serverNow + 60000, closesAt: serverNow + 90000, remainingMs: 60000, finished: true }],
    });
    renderIt();
    expect(await screen.findByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText(/Results by/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Battle room' })).toHaveAttribute('href', '/battle/XYZ789');
    expect(screen.queryByRole('link', { name: /Return to battle/ })).not.toBeInTheDocument();
  });

  it('shows nothing when you are in no running battle, or the list fails', async () => {
    fetchActiveBattles.mockResolvedValue({ serverNow: Date.now(), items: [] });
    const { container } = renderIt();
    await vi.waitFor(() => expect(fetchActiveBattles).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();

    fetchActiveBattles.mockRejectedValue(new Error('500'));
    const again = renderIt();
    await vi.waitFor(() => expect(fetchActiveBattles).toHaveBeenCalledTimes(2));
    expect(again.container).toBeEmptyDOMElement();
  });
});
