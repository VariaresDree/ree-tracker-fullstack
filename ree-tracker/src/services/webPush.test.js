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
    expect(registerDeviceToken).toHaveBeenCalledWith('web-token-123', 'web', { timeoutMs: 60_000 });
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

  // 2026-11-12: the default 12 s timeout read a waking server as "offline".
  it('wakes the server, and registers with a long timeout, trying once more', async () => {
    const m = await load();
    const wake = vi.fn();
    registerDeviceToken.mockRejectedValueOnce(new Error('[TIMEOUT]'));
    expect(await m.enableWebPush({ wake })).toEqual({ ok: true });
    expect(wake).toHaveBeenCalled();
    expect(registerDeviceToken).toHaveBeenCalledTimes(2);
    expect(registerDeviceToken.mock.calls[0][2]).toEqual({ timeoutMs: m.REGISTER_TIMEOUT_MS });
  }, 10_000);

  it('a push sign-up that fails twice throws a browser-step error worded for App health', async () => {
    const m = await load();
    getToken.mockRejectedValue(Object.assign(new Error('AbortError: Registration failed - push service error'), { code: 'messaging/token-subscribe-failed' }));
    const err = await m.enableWebPush({ wake: () => {} }).catch((e) => e);
    expect(err.step).toBe('browser');
    expect(err.message).toMatch(/^Web push browser: messaging\/token-subscribe-failed Abort error: Registration failed - push service error \(subscription no, tab/);
    expect(getToken).toHaveBeenCalledTimes(2);
    expect(registerDeviceToken).not.toHaveBeenCalled();
    getToken.mockReset().mockResolvedValue('web-token-123');
  }, 10_000);

  it('says which step failed', async () => {
    const m = await load();
    expect(m.webFailureText({ step: 'browser' }, true)).toMatch(/This browser couldn’t sign up/);
    expect(m.webFailureText({ step: 'server', cause: new Error('[OFFLINE]') }, true)).toMatch(/didn’t answer in time/);
    expect(m.webFailureText({ step: 'server', cause: new Error('Request failed (500).') }, true)).toMatch(/couldn’t save it/);
    expect(m.webFailureText({ step: 'server' }, false)).toMatch(/You’re offline/);
  });

  it('drops a subscription Chrome kept before asking again, and says what the phone was', async () => {
    const unsubscribe = vi.fn(async () => true);
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ scope: '/', pushManager: { getSubscription: async () => ({ unsubscribe }) } }) } });
    const m = await load();
    getToken.mockRejectedValue(new Error('Registration failed - push service error'));
    const err = await m.enableWebPush({ wake: () => {} }).catch((e) => e);
    expect(unsubscribe).toHaveBeenCalled();
    expect(err.message).toMatch(/push service error \(subscription yes, tab/);
    expect(m.isPushServiceError(err)).toBe(true);
    expect(m.webFailureText(err, true)).toMatch(/Google’s push service/);
    getToken.mockReset().mockResolvedValue('web-token-123');
  }, 10_000);
});
