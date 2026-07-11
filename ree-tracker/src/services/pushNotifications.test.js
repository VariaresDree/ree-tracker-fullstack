// Unit tests for the push-init gate. On the web this module must be a
// guaranteed no-op — the pure guard is what enforces that, so it gets locked
// in here. The heavy imports (Capacitor, dbQueries→firebase) are mocked so the
// test stays hermetic in jsdom.
import { describe, it, expect, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    isPluginAvailable: () => false,
    getPlatform: () => 'web',
  },
}));
vi.mock('./dbQueries', () => ({
  registerDeviceToken: vi.fn(),
  unregisterDeviceToken: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: vi.fn() }));

import { shouldInitPush, initPushNotifications } from './pushNotifications';

describe('shouldInitPush — the native/flag/auth gate', () => {
  it('requires ALL of: native platform, enabled flag, authed uid', () => {
    expect(shouldInitPush({ isNative: true, flagEnabled: true, uid: 'u1' })).toBe(true);
    expect(shouldInitPush({ isNative: false, flagEnabled: true, uid: 'u1' })).toBe(false);
    expect(shouldInitPush({ isNative: true, flagEnabled: false, uid: 'u1' })).toBe(false);
    expect(shouldInitPush({ isNative: true, flagEnabled: true, uid: null })).toBe(false);
  });

  it('treats a missing flag map entry as disabled (flags fail closed)', () => {
    expect(shouldInitPush({ isNative: true, flagEnabled: undefined, uid: 'u1' })).toBe(false);
  });
});

describe('initPushNotifications on the web', () => {
  it('is a no-op (returns false) even with the flag on and a user', async () => {
    await expect(initPushNotifications('u1', { flagEnabled: true })).resolves.toBe(false);
  });
});
