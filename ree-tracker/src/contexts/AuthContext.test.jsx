// Regression coverage for the weak-connection login-eject bug: a hardcoded
// 5s setTimeout raced Firebase's onAuthStateChanged, and App.jsx renders
// <Login/> on !currentUser — so a slow connection flipped `loading` false
// while `currentUser` was still null, ejecting an authenticated user to the
// login form. This suite asserts, from the provider alone:
//   1. children (what App.jsx uses to decide Login vs. the app) never render
//      while genuinely unresolved, even past the stall window — the provider
//      shows a reconnecting state instead of ever handing control back with
//      an ambiguous currentUser.
//   2. loading clears the INSTANT onAuthStateChanged fires (user or null),
//      without waiting on the profile/TOS/flags/push chain — so a slow
//      backend (not a slow auth SDK) can no longer hold the whole app on the
//      "Securing Session…" screen either.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider } from './AuthContext';

let authStateCallback = null;

vi.mock('../config/firebaseDb', () => ({ auth: {} }));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, cb) => {
    authStateCallback = cb;
    return () => { authStateCallback = null; };
  },
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

// Never-resolving promises — simulates a slow/stuck backend so the tests can
// prove `loading` doesn't wait on this chain.
vi.mock('../services/dbQueries', () => ({
  getAnalyticsProfile: vi.fn(() => new Promise(() => {})),
  fetchDynamicTOS: vi.fn(() => new Promise(() => {})),
  fetchFeatureFlags: vi.fn(() => new Promise(() => {})),
  updateUserProfile: vi.fn(() => Promise.resolve()),
}));

vi.mock('../services/pushNotifications', () => ({
  initPushNotifications: vi.fn(() => new Promise(() => {})),
  teardownPushNotifications: vi.fn(() => Promise.resolve()),
}));

vi.mock('../store/useStore', () => ({
  useStore: {
    getState: () => ({
      setIsAdmin: vi.fn(),
      setDynamicTOS: vi.fn(),
      setFeatureFlags: vi.fn(),
      featureFlags: {},
    }),
  },
}));

describe('AuthProvider — weak-connection reload never ejects to login', () => {
  beforeEach(() => {
    authStateCallback = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('never renders children while unresolved, and shows a reconnecting (not login) state once stalled', () => {
    render(
      <AuthProvider>
        <div>APP CONTENT</div>
      </AuthProvider>,
    );

    // Initial state: securing session, definitely not stalled yet.
    expect(screen.getByText(/securing session/i)).toBeInTheDocument();
    expect(screen.queryByText('APP CONTENT')).not.toBeInTheDocument();

    // Advance past the stall window with onAuthStateChanged never firing.
    act(() => {
      vi.advanceTimersByTime(25000);
    });

    // A reconnecting/retry state, NOT children (App.jsx would render <Login/>
    // for children with a null currentUser) and not the plain "Securing
    // Session" spinner either.
    expect(screen.getByText(/still trying to reach your session/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText('APP CONTENT')).not.toBeInTheDocument();
    expect(screen.queryByText(/^securing session/i)).not.toBeInTheDocument();
  });

  it('clears loading the instant onAuthStateChanged resolves with a user, without waiting on profile/TOS/flags/push', async () => {
    render(
      <AuthProvider>
        <div>APP CONTENT</div>
      </AuthProvider>,
    );

    expect(authStateCallback).toBeTypeOf('function');
    await act(async () => {
      authStateCallback({ uid: 'u1', email: 'user@example.com', displayName: null });
    });

    // getAnalyticsProfile/fetchDynamicTOS/fetchFeatureFlags/initPushNotifications
    // are all still-pending (mocked to never resolve) — children render anyway.
    expect(screen.getByText('APP CONTENT')).toBeInTheDocument();
  });

  it('also clears loading promptly when onAuthStateChanged resolves to null (a genuine logout, not a stall)', async () => {
    render(
      <AuthProvider>
        <div>APP CONTENT</div>
      </AuthProvider>,
    );

    await act(async () => {
      authStateCallback(null);
    });

    expect(screen.getByText('APP CONTENT')).toBeInTheDocument();
  });

  it('a late-arriving callback after the stall fires cancels the stalled state', async () => {
    render(
      <AuthProvider>
        <div>APP CONTENT</div>
      </AuthProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(25000);
    });
    expect(screen.getByText(/still trying to reach your session/i)).toBeInTheDocument();

    await act(async () => {
      authStateCallback({ uid: 'u1', email: 'user@example.com', displayName: null });
    });

    expect(screen.getByText('APP CONTENT')).toBeInTheDocument();
    expect(screen.queryByText(/still trying to reach your session/i)).not.toBeInTheDocument();
  });
});
