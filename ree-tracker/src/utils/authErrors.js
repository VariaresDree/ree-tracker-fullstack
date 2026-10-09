// src/utils/authErrors.js
//
// Plain messages for Firebase Auth errors. The login screen used to show the
// raw message with "Firebase: " stripped — "Error (auth/invalid-credential)."
// Account → Security had its own mapping; both read this one now.

export const MIN_PASSWORD = 6; // Firebase's own minimum

const COMMON = {
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'You’re offline. Reconnect and try again.',
  'auth/invalid-email': 'That email doesn’t look right.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/weak-password': `Use at least ${MIN_PASSWORD} characters.`,
};

const BY_ACTION = {
  'sign-in': {
    'auth/invalid-credential': 'That email and password don’t match an account.',
    'auth/wrong-password': 'That email and password don’t match an account.',
    'auth/user-not-found': 'That email and password don’t match an account.',
    'auth/missing-password': 'Enter your password.',
    fallback: 'Couldn’t sign you in — try again.',
  },
  register: {
    'auth/email-already-in-use': 'An account already uses that email. Sign in instead.',
    'auth/missing-password': 'Choose a password.',
    fallback: 'Couldn’t create your account — try again.',
  },
  // Re-authentication before a password change or an account deletion: the
  // only password involved is the current one.
  'current-password': {
    'auth/invalid-credential': 'That current password isn’t right.',
    'auth/wrong-password': 'That current password isn’t right.',
    'auth/missing-password': 'Enter your current password.',
    fallback: 'Couldn’t confirm your password — try again.',
  },
  'change-password': {
    'auth/invalid-credential': 'That current password isn’t right.',
    'auth/wrong-password': 'That current password isn’t right.',
    fallback: 'Couldn’t change your password — try again.',
  },
  reset: {
    fallback: 'Couldn’t send the reset email — try again.',
  },
};

/** A plain message for a Firebase Auth error raised during `action`. */
export function authErrorMessage(err, action = 'sign-in') {
  const code = err?.code || '';
  const table = BY_ACTION[action] || BY_ACTION['sign-in'];
  return table[code] || COMMON[code] || table.fallback;
}
