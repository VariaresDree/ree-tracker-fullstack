// src/components/LogoutConfirm.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LogoutConfirm from './LogoutConfirm';

const deleteDeviceData = vi.fn(async () => {});
const logout = vi.fn(async () => {});
const resetStore = vi.fn(async () => {});
vi.mock('../services/deviceStore', () => ({ deleteDeviceData: (...a) => deleteDeviceData(...a) }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ logout, currentUser: { uid: 'u1' } }) }));
vi.mock('../store/useStore', () => ({ useStore: (sel) => sel({ syncQueue: [], pendingWrites: [], resetStore }) }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));

const logOut = () => fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

beforeEach(() => {
  deleteDeviceData.mockClear();
  logout.mockReset();
  logout.mockResolvedValue();
  resetStore.mockClear();
});

describe('Logging out', () => {
  it('keeps your files unless you tick the box', async () => {
    render(<LogoutConfirm open onClose={() => {}} />);
    logOut();
    await waitFor(() => expect(resetStore).toHaveBeenCalled());
    expect(deleteDeviceData).not.toHaveBeenCalled();
  });

  it('removes them when you do, after the sign-out, for that account', async () => {
    render(<LogoutConfirm open onClose={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Also remove my files and imported quizzes/ }));
    logOut();
    await waitFor(() => expect(deleteDeviceData).toHaveBeenCalledWith('u1'));
    expect(logout.mock.invocationCallOrder[0]).toBeLessThan(deleteDeviceData.mock.invocationCallOrder[0]);
  });

  it('a sign-out that fails leaves them alone', async () => {
    logout.mockRejectedValue(new Error('nope'));
    render(<LogoutConfirm open onClose={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Also remove/ }));
    logOut();
    await waitFor(() => expect(logout).toHaveBeenCalled());
    await new Promise((r) => { setTimeout(r, 0); });
    expect(deleteDeviceData).not.toHaveBeenCalled();
  });

  it('says what stays', () => {
    render(<LogoutConfirm open onClose={() => {}} />);
    expect(screen.getByText(/they stay here for when you sign back in/)).toBeInTheDocument();
  });
});
