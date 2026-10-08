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
//      boot screen either.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { getAnalyticsProfile, updateUserProfile } from '../services/dbQueries';

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
  sendPasswordResetEmail: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() },
  reauthenticateWithCredential: vi.fn(),
  updatePassword: vi.fn(),
}));

// Never-resolving promises — simulates a slow/stuck backend so the tests can
// prove `loading` doesn't wait on this chain.
vi.mock('../services/dbQueries', () => ({
  BOOT_TIMEOUT_MS: 8000,
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

    // Initial state: the branded boot screen, definitely not stalled yet.
    expect(screen.getByText(/preparing your session/i)).toBeInTheDocument();
    expect(screen.queryByText('APP CONTENT')).not.toBeInTheDocument();

    // Advance past the stall window with onAuthStateChanged never firing.
    act(() => {
      vi.advanceTimersByTime(25000);
    });

    // A reconnecting/retry state, NOT children (App.jsx would render <Login/>
    // for children with a null currentUser) and not the boot screen either —
    // the stall path must fully replace it, not sit alongside it.
    expect(screen.getByText(/still trying to reach your session/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText('APP CONTENT')).not.toBeInTheDocument();
    expect(screen.queryByText(/preparing your session/i)).not.toBeInTheDocument();
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

// The Admin route waits on roleResolved instead of bouncing an admin whose
// role hasn't arrived yet (routes/AdminRoute.jsx).
describe('AuthProvider — roleResolved', () => {
  function Role() {
    const { isAdmin, roleResolved } = useAuth();
    return <span data-testid="role">{`${roleResolved ? 'resolved' : 'pending'}:${isAdmin ? 'admin' : 'learner'}`}</span>;
  }
  const signIn = async () => {
    render(<AuthProvider><Role /></AuthProvider>);
    await act(async () => { authStateCallback({ uid: 'u1', email: 'u@example.com', displayName: null }); });
  };

  beforeEach(() => { authStateCallback = null; });

  it('is pending while the profile request is in flight', async () => {
    await signIn();
    expect(screen.getByTestId('role').textContent).toBe('pending:learner');
  });

  it('resolves with the server role', async () => {
    vi.mocked(getAnalyticsProfile).mockImplementationOnce(() => Promise.resolve({ data: { profile: { role: 'ADMIN' } } }));
    await signIn();
    expect(screen.getByTestId('role').textContent).toBe('resolved:admin');
  });

  it('resolves (as a learner) when the lookup fails', async () => {
    vi.mocked(getAnalyticsProfile).mockImplementationOnce(() => Promise.reject(new Error('503')));
    await signIn();
    expect(screen.getByTestId('role').textContent).toBe('resolved:learner');
  });
});

// The once-per-session display-name write is a mutation: it drops the boot
// dashboard seed, so Today fetched the aggregate twice on every first load.
// It now goes out only when the stored name differs.
describe('AuthProvider — display-name mirror', () => {
  const signInAs = async (displayName) => {
    render(<AuthProvider><div>APP</div></AuthProvider>);
    await act(async () => { authStateCallback({ uid: 'u1', email: 'u@example.com', displayName }); });
  };

  beforeEach(() => {
    authStateCallback = null;
    sessionStorage.clear();
    vi.mocked(updateUserProfile).mockClear();
  });

  it('skips the write when the server already has the name', async () => {
    vi.mocked(getAnalyticsProfile).mockImplementationOnce(() => Promise.resolve({ data: { profile: { displayName: 'Engr. Cruz' } } }));
    await signInAs('Engr. Cruz');
    expect(updateUserProfile).not.toHaveBeenCalled();
  });

  it('writes a name that differs, once per session', async () => {
    const stale = () => Promise.resolve({ data: { profile: { displayName: 'Old name' } } });
    vi.mocked(getAnalyticsProfile).mockImplementationOnce(stale).mockImplementationOnce(stale);
    await signInAs('Engr. Cruz');
    expect(updateUserProfile).toHaveBeenCalledWith({ displayName: 'Engr. Cruz' });
    await signInAs('Engr. Cruz');
    expect(updateUserProfile).toHaveBeenCalledTimes(1);
  });

  it('still writes when the profile request fails, so drift heals regardless', async () => {
    vi.mocked(getAnalyticsProfile).mockImplementationOnce(() => Promise.reject(new Error('503')));
    await signInAs('Engr. Cruz');
    expect(updateUserProfile).toHaveBeenCalledWith({ displayName: 'Engr. Cruz' });
  });

  it('cuts a long name the way the server stores it, so a cut after a space still matches', async () => {
    vi.mocked(getAnalyticsProfile).mockImplementationOnce(() => Promise.resolve({ data: { profile: { displayName: 'Engr. Juan Miguel dela Cruz San' } } }));
    await signInAs('Engr. Juan Miguel dela Cruz San Jose Reyes');
    expect(updateUserProfile).not.toHaveBeenCalled();
  });

  it('trims a signup name to the server limit, so it can be stored and then matches', async () => {
    const long = 'Engr. Maria Clara de los Santos-Reyes'; // 37 characters
    vi.mocked(getAnalyticsProfile).mockImplementationOnce(() => Promise.resolve({ data: { profile: { displayName: long.slice(0, 32) } } }));
    await signInAs(long);
    expect(updateUserProfile).not.toHaveBeenCalled();
  });
});
