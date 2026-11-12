// The browser's push registration (services/webPush.js).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getToken = vi.fn(async () => 'web-token-123');
const deleteToken = vi.fn(async () => true);
vi.mock('firebase/messaging', () => ({ getMessaging: () => ({}), getToken: (...a) => getToken(...a), deleteToken: (...a) => deleteToken(...a), isSupported: async () => true }));
vi.mock('../config/firebaseDb', () => ({ app: {} }));
const registerDeviceToken = vi.fn(async () => ({}));
const unregisterDeviceToken = vi.fn(async () => ({}));
vi.mock('./dbQueries', () => ({ registerDeviceToken: (...a) => registerDeviceToken(...a), unregisterDeviceToken: (...a) => unregisterDeviceToken(...a) }));

const load = async (key = 'vapid-key') => {
  vi.resetModules();
  vi.stubEnv('VITE_FIREBASE_VAPID_KEY', key);
  return import('./webPush');
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  globalThis.PushManager = function PushManager() {};
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ scope: '/' }) } });
  globalThis.Notification = { permission: 'default', requestPermission: vi.fn(async () => 'granted') };
});
afterEach(() => vi.unstubAllEnvs());

describe('web push', () => {
  it('without a key in the build: unconfigured', async () => {
    const m = await load('');
    expect(m.webPushSupport()).toBe('unconfigured');
  });

  it('turning it on asks, registers this browser as a web device, and remembers it', async () => {
    const m = await load();
    expect(m.webPushSupport()).toBe('ready');
    expect(await m.enableWebPush()).toEqual({ ok: true });
    expect(getToken.mock.calls[0][1]).toMatchObject({ vapidKey: 'vapid-key', serviceWorkerRegistration: { scope: '/' } });
    expect(registerDeviceToken).toHaveBeenCalledWith('web-token-123', 'web');
    expect(m.webPushOn()).toBe(true);
  });

  it('a refused permission registers nothing', async () => {
    globalThis.Notification.requestPermission = vi.fn(async () => 'denied');
    const m = await load();
    expect(await m.enableWebPush()).toEqual({ ok: false, reason: 'blocked' });
    expect(registerDeviceToken).not.toHaveBeenCalled();
  });

  it('blocked already: says so without asking', async () => {
    globalThis.Notification.permission = 'denied';
    const m = await load();
    expect(m.webPushSupport()).toBe('blocked');
  });

  it('turning it off tells the server and Firebase, and forgets it here', async () => {
    const m = await load();
    await m.enableWebPush();
    await m.disableWebPush();
    expect(unregisterDeviceToken).toHaveBeenCalledWith('web-token-123');
    expect(deleteToken).toHaveBeenCalled();
    expect(m.webPushOn()).toBe(false);
  });

  it('nothing registered: turning it off does nothing', async () => {
    const m = await load();
    await m.disableWebPush();
    expect(unregisterDeviceToken).not.toHaveBeenCalled();
  });
});
