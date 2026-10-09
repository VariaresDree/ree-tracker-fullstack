import { describe, it, expect } from 'vitest';
import { authErrorMessage } from './authErrors';

describe('authErrorMessage', () => {
  it('never shows the raw Firebase text on sign-in', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential', message: 'Firebase: Error (auth/invalid-credential).' }))
      .toBe('That email and password don’t match an account.');
  });

  it('reads the same code differently when only the current password is involved', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' }, 'change-password')).toBe('That current password isn’t right.');
  });

  it('explains common failures and falls back per action', () => {
    expect(authErrorMessage({ code: 'auth/email-already-in-use' }, 'register')).toMatch(/already uses that email/);
    expect(authErrorMessage({ code: 'auth/network-request-failed' })).toMatch(/offline/);
    expect(authErrorMessage({ code: 'auth/unknown' }, 'reset')).toBe('Couldn’t send the reset email — try again.');
    expect(authErrorMessage(null)).toBe('Couldn’t sign you in — try again.');
  });
});
