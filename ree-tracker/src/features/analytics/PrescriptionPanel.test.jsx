// Recommended fixes: offline says so, and a failed forecast offers Try again.
// Offline it used to read "Connecting..." for as long as the page was open.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

let online = true;
vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => online }));
const fetchForecast = vi.fn();
vi.mock('../../services/dbQueries', () => ({ fetchForecast: (...a) => fetchForecast(...a), recomputeForecast: vi.fn() }));

const { PrescriptionPanel } = await import('./PrescriptionPanel');
const { __resetForecastInFlight } = await import('../../hooks/useForecast');

beforeEach(() => { fetchForecast.mockReset(); __resetForecastInFlight(); online = true; });

describe('PrescriptionPanel', () => {
  it('offline, says the fixes need a connection', async () => {
    online = false;
    fetchForecast.mockResolvedValue(null);
    render(<PrescriptionPanel />);
    expect(await screen.findByText('Unavailable offline')).toBeInTheDocument();
    expect(screen.queryByText(/Connecting/)).not.toBeInTheDocument();
  });

  it('a failed forecast offers Try again', async () => {
    fetchForecast.mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce({
      snapshot: { recommendedActions: [{ type: 'DRILL', payload: { topic: 'Transformers' }, reason: 'Costliest gap' }], weakTopics: [] },
    });
    render(<PrescriptionPanel />);
    expect(await screen.findByText("Couldn't load your recommended fixes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Transformers')).toBeInTheDocument();
  });
});
