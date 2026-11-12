import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const apiRequest = vi.fn();
vi.mock('../../services/dbQueries', () => ({ apiRequest: (...a) => apiRequest(...a) }));

const { default: YourReports } = await import('./YourReports');

const report = (n, over = {}) => ({
  questionId: `q${n}`, reason: 'The answer key looks wrong', createdAt: '2026-11-01T00:00:00Z',
  resolvedAt: null, resolution: null, resolutionNote: null, subject: 'EE', topic: 'Circuits', stem: `Find $I_${n}$ in \\Omega terms`, ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('Your reports', () => {
  it('each report says what was done, with the reviewer’s note', async () => {
    apiRequest.mockResolvedValue({ items: [
      report(1, { resolvedAt: '2026-11-12T00:00:00Z', resolution: 'fixed', resolutionNote: 'The key is B now.' }),
      report(2),
      report(3, { resolvedAt: '2026-11-12T00:00:00Z', resolution: 'dismissed' }),
    ] });
    render(<YourReports />);
    expect(await screen.findByText('3 reported · 1 waiting for review')).toBeInTheDocument();
    const first = within(screen.getByText(/Find I_1/).closest('li'));
    expect(first.getByText('Fixed')).toBeInTheDocument();
    expect(first.getByText(/The key is B now\./)).toBeInTheDocument();
    expect(first.getByText(/You said: The answer key looks wrong/)).toBeInTheDocument();
    expect(within(screen.getByText(/Find I_2/).closest('li')).getByText('Waiting for review')).toBeInTheDocument();
    expect(within(screen.getByText(/Find I_3/).closest('li')).getByText('Checked: no change needed')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/api/user/reports');
  });

  it('shows ten, then more', async () => {
    apiRequest.mockResolvedValue({ items: Array.from({ length: 12 }, (_, i) => report(i + 1)) });
    render(<YourReports />);
    await screen.findByText(/12 reported/);
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
  });

  it('none yet, and offline', async () => {
    apiRequest.mockResolvedValueOnce({ items: [] });
    const { unmount } = render(<YourReports />);
    expect(await screen.findByText(/You haven’t reported a question/)).toBeInTheDocument();
    unmount();
    apiRequest.mockRejectedValueOnce(new Error('[OFFLINE]'));
    render(<YourReports />);
    expect(await screen.findByText(/load over a connection/)).toBeInTheDocument();
  });
});
