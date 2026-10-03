// The live taxonomy must reach the store even when the profile request fails.
// On a Render cold start the boot profile call can time out; the TOS used to be
// applied only AFTER `await profilePromise`, so a rejected profile jumped to the
// catch and the store kept its persisted/fallback topic list — the stale
// 28-topic EE list the Library's AI ingestion then offered and labelled with.
import { describe, it, expect, vi } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
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

const LIVE = { EE: ['Electrical Transient Analysis'], ESAS: ['Fluid Mechanics'], Mathematics: ['Algebra'] };

vi.mock('../services/dbQueries', () => ({
  getAnalyticsProfile: vi.fn(() => Promise.reject(new Error('[TIMEOUT] cold start'))),
  fetchDynamicTOS: vi.fn(() => Promise.resolve(LIVE)),
  fetchFeatureFlags: vi.fn(() => Promise.resolve({})),
  updateUserProfile: vi.fn(() => Promise.resolve()),
  BOOT_TIMEOUT_MS: 30000,
}));

vi.mock('../services/pushNotifications', () => ({
  initPushNotifications: vi.fn(() => Promise.resolve()),
  teardownPushNotifications: vi.fn(() => Promise.resolve()),
}));

vi.mock('../services/apiCache', () => ({
  claimApiCacheFor: vi.fn(() => Promise.resolve()),
  purgeApiCache: vi.fn(() => Promise.resolve()),
}));

vi.mock('../services/dashboardSeed', () => ({ seedDashboardRequest: vi.fn() }));

const store = { setIsAdmin: vi.fn(), setDynamicTOS: vi.fn(), setFeatureFlags: vi.fn(), featureFlags: {} };
vi.mock('../store/useStore', () => ({ useStore: { getState: () => store } }));

describe('AuthProvider — live TOS at boot', () => {
  it('applies the fetched taxonomy even when the profile request fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<AuthProvider><div>APP</div></AuthProvider>);

    await act(async () => {
      authStateCallback({ uid: 'u1', email: 'user@example.com', displayName: null });
    });

    await waitFor(() => expect(store.setDynamicTOS).toHaveBeenCalledWith(LIVE));
    expect(store.setIsAdmin).toHaveBeenCalledWith(false); // still fails closed
  });
});
