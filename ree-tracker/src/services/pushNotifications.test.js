// Unit tests for the push-init gate. On the web this module must be a
// guaranteed no-op — the pure guard is what enforces that, so it gets locked
// in here. The heavy imports (Capacitor, dbQueries→firebase) are mocked so the
// test stays hermetic in jsdom.
import { describe, it, expect, vi } from 'vitest';

const { isNativePlatform } = vi.hoisted(() => ({ isNativePlatform: vi.fn(() => false) }));
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
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

describe('Capacitor stays out of the first download', () => {
  it('without the flag or a user, Capacitor is never asked (it loads on demand)', async () => {
    isNativePlatform.mockClear();
    await expect(initPushNotifications('u1', { flagEnabled: false })).resolves.toBe(false);
    await expect(initPushNotifications(null, { flagEnabled: true })).resolves.toBe(false);
    expect(isNativePlatform).not.toHaveBeenCalled();
  });

  it('the module imports @capacitor/core only dynamically', async () => {
    const { default: src } = await import('./pushNotifications.js?raw');
    expect(src).not.toMatch(/^import [^;]*from '@capacitor\/core'/m);
    expect(src).toContain("import('@capacitor/core')");
  });
});
