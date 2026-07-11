// Regression tests for the offline "Firebase: Error (auth/network-request-failed)"
// toast: an expired cached ID token + offline device made getIdToken() throw a
// raw Firebase error instead of the '[OFFLINE]' sentinel, so the offline-pack
// fallback and outbox deferral never engaged.
import { describe, it, expect } from 'vitest';
import { isNetworkAuthError, getAuthToken } from './dbQueries';

describe('isNetworkAuthError', () => {
  it('matches the Firebase error code', () => {
    expect(isNetworkAuthError({ code: 'auth/network-request-failed' })).toBe(true);
  });

  it('matches the message form Firebase actually throws', () => {
    expect(isNetworkAuthError(new Error('Firebase: Error (auth/network-request-failed).'))).toBe(true);
  });

  it('leaves other auth errors alone', () => {
    expect(isNetworkAuthError({ code: 'auth/invalid-credential' })).toBe(false);
    expect(isNetworkAuthError(new Error('quota exceeded'))).toBe(false);
    expect(isNetworkAuthError(null)).toBe(false);
  });
});

describe('getAuthToken', () => {
  it('returns the token on success', async () => {
    await expect(getAuthToken({ getIdToken: async () => 'tok-123' })).resolves.toBe('tok-123');
  });

  it('normalizes an offline token-refresh failure to the [OFFLINE] sentinel', async () => {
    const user = { getIdToken: async () => { throw new Error('Firebase: Error (auth/network-request-failed).'); } };
    await expect(getAuthToken(user)).rejects.toThrow('[OFFLINE]');
  });

  it('rethrows non-network auth errors untouched', async () => {
    const user = { getIdToken: async () => { throw new Error('auth/user-token-expired'); } };
    await expect(getAuthToken(user)).rejects.toThrow('auth/user-token-expired');
  });
});
