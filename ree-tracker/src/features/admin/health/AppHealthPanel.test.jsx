import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const apiRequest = vi.fn();
vi.mock('../../../services/dbQueries', () => ({ apiRequest }));
vi.mock('../../../services/appUpdate', () => ({ APP_VERSION: 'new1234' }));
const toast = Object.assign(vi.fn(), { error: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: AppHealthPanel } = await import('./AppHealthPanel');

const SUMMARY = {
  versions: [
    { version: 'new1234', people: 3, lastSeenAt: '2026-11-03T04:00:00Z' },
    { version: 'old5678', people: 1, lastSeenAt: '2026-11-01T04:00:00Z' },
  ],
  errors: [
    { id: 'e1', source: 'client', message: 'Cannot read x', stack: 'at Foo', route: '/practice', version: 'old5678', count: 4, lastSeenAt: '2026-11-03T04:00:00Z' },
    { id: 'e2', source: 'server', message: 'Unhandled error: boom', stack: null, route: null, version: null, count: 1, lastSeenAt: '2026-11-03T03:00:00Z' },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe('App health', () => {
  it('shows versions, marking this device’s, and errors with where they happened', async () => {
    apiRequest.mockResolvedValue(SUMMARY);
    render(<AppHealthPanel />);
    expect(await screen.findByText('old5678', { selector: 'li > span' })).toBeInTheDocument();
    expect(screen.getAllByText('On this device')).toHaveLength(1);
    expect(screen.getByText('3 people')).toBeInTheDocument();
    expect(screen.getByText('1 person')).toBeInTheDocument();
    expect(screen.getByText('Cannot read x')).toBeInTheDocument();
    expect(screen.getByText('4 times')).toBeInTheDocument();
    expect(screen.getByText('/practice')).toBeInTheDocument();
    expect(screen.getByText('Once')).toBeInTheDocument();
    expect(screen.getByText('Server')).toBeInTheDocument();
  });

  it('dismisses an error', async () => {
    apiRequest.mockResolvedValue(SUMMARY);
    render(<AppHealthPanel />);
    await screen.findByText('Cannot read x');
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]);
    await waitFor(() => expect(screen.queryByText('Cannot read x')).not.toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith('/api/admin/app-health/errors/e1', 'DELETE');
  });

  it('keeps the row and says so when a dismiss fails', async () => {
    apiRequest.mockResolvedValueOnce(SUMMARY).mockRejectedValueOnce(new Error('Nope'));
    render(<AppHealthPanel />);
    await screen.findByText('Cannot read x');
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Nope'));
    expect(screen.getByText('Cannot read x')).toBeInTheDocument();
  });

  it('says so when nothing has been reported', async () => {
    apiRequest.mockResolvedValue({ versions: [], errors: [] });
    render(<AppHealthPanel />);
    expect(await screen.findByText('No errors')).toBeInTheDocument();
    expect(screen.getByText(/No app has reported/)).toBeInTheDocument();
  });

  it('says what went wrong when it can’t load, and Refresh tries again', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Server trouble')).mockResolvedValueOnce(SUMMARY);
    render(<AppHealthPanel />);
    expect(await screen.findByText('Server trouble')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    expect(await screen.findByText('Cannot read x')).toBeInTheDocument();
  });
});
