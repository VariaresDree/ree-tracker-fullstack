import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Admin › App health › Push reminders: the server's push switch, which had
// never been turned on, so no reminder was ever sent.

const apiRequest = vi.fn();
vi.mock('../../../services/dbQueries', () => ({ apiRequest: (...a) => apiRequest(...a) }));
const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: PushSwitch } = await import('./PushSwitch');

beforeEach(() => { apiRequest.mockReset(); toast.success.mockClear(); });

describe('Push reminders switch', () => {
  it('shows the switch as the server has it, and turns it on', async () => {
    apiRequest.mockImplementation(async (url, method) => (method === 'PUT' ? { success: true } : { flags: {} }));
    render(<PushSwitch />);
    const off = await screen.findByRole('radio', { name: 'Off' });
    expect(off).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'On' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/config/flags/push-notifications', 'PUT', expect.objectContaining({ enabled: true })));
    expect(await screen.findByRole('radio', { name: 'On' })).toBeChecked();
    expect(toast.success).toHaveBeenCalledWith('Push reminders are on.');
  });

  it('says when this build has no web push key', async () => {
    apiRequest.mockResolvedValue({ flags: { 'push-notifications': { enabled: true } } });
    render(<PushSwitch />);
    expect(await screen.findByRole('radio', { name: 'On' })).toBeChecked();
    expect(screen.getByText(/add VITE_FIREBASE_VAPID_KEY in Vercel/)).toBeInTheDocument();
  });
});
