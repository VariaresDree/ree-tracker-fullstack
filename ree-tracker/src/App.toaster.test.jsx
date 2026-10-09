// The toast host is mounted for the login screen too. It used to live only
// inside the signed-in app, so "a reset link is on its way" never showed.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import toast from 'react-hot-toast';

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ currentUser: null }),
}));
vi.mock('./hooks/useSyncLifecycle', () => ({ useSyncLifecycle: () => {} }));
vi.mock('./pages/Login', () => ({ default: () => <h1>Sign in</h1> }));

const { default: App } = await import('./App');

describe('App toast host', () => {
  it('shows toasts on the login screen', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    act(() => { toast.success('If an account exists for that email, a reset link is on its way.'); });
    expect(await screen.findByText(/reset link is on its way/)).toBeInTheDocument();
  });
});
