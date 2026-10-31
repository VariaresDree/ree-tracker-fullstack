// PRs #188 and #189 were live for hours while devices kept running #187: the
// new version waited for every app window to close. These pin how a new
// version now reaches the device, and that it never reloads mid-exam.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  __resetAppUpdate, isSafeToReload, onNewVersionReady, applyUpdateIfSafe, checkForUpdate, startUpdateWatch,
  FRESH_LOAD_MS, STUCK_AFTER_CHECKS, APP_VERSION,
} from './appUpdate';

let reload;
let notify;
beforeEach(() => {
  reload = vi.fn();
  notify = vi.fn();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('isSafeToReload', () => {
  it('never on an exam, practice, focus, scan or battle screen', () => {
    for (const p of ['/practice', '/simulator', '/focus', '/scan/abc', '/gauntlet/3', '/diagnostic', '/battle/X1', '/library/quiz']) {
      expect(isSafeToReload(p)).toBe(false);
    }
    for (const p of ['/', '/library', '/progress', '/exams', '/account']) expect(isSafeToReload(p)).toBe(true);
  });
});

describe('a new version taking over', () => {
  it('reloads straight away when the app has only just opened on a calm screen', () => {
    __resetAppUpdate({ reload, notify, bootAt: 0, now: () => FRESH_LOAD_MS - 1 });
    onNewVersionReady();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
  });

  it('mid-exam it waits, offers the reload, and applies it on the next calm screen', () => {
    __resetAppUpdate({ reload, notify, bootAt: 0, now: () => FRESH_LOAD_MS * 10 });
    window.history.replaceState(null, '', '/simulator');
    onNewVersionReady();
    expect(reload).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(applyUpdateIfSafe({ pathname: '/simulator' })).toBe(false);
    expect(applyUpdateIfSafe({ pathname: '/' })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    // Once only.
    expect(applyUpdateIfSafe({ pathname: '/' })).toBe(false);
  });

  it('applies while the app is in the background', () => {
    __resetAppUpdate({ reload, notify, bootAt: 0, now: () => FRESH_LOAD_MS * 10, hidden: () => true });
    onNewVersionReady();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does nothing on a calm screen when no new version has arrived', () => {
    __resetAppUpdate({ reload, notify });
    expect(applyUpdateIfSafe({ pathname: '/' })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('checkForUpdate', () => {
  it('asks the service worker to look for a new version', async () => {
    const update = vi.fn(() => Promise.resolve());
    __resetAppUpdate({ reload, notify });
    startUpdateWatch({ registration: { update } });
    await checkForUpdate();
    expect(update).toHaveBeenCalled();
  });

  it('repairs a stuck service worker: the server has a newer build and nothing brings it', async () => {
    const unregister = vi.fn(() => Promise.resolve(true));
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { getRegistrations: () => Promise.resolve([{ unregister }]) } });
    const del = vi.fn(() => Promise.resolve(true));
    vi.stubGlobal('caches', { keys: () => Promise.resolve(['workbox-precache-v2-x', 'api-cache']), delete: del });
    const fetchImpl = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'newer1' }) }));
    __resetAppUpdate({ reload, notify, fetchImpl });
    startUpdateWatch({ registration: { update: () => Promise.resolve() } });
    for (let i = 0; i < STUCK_AFTER_CHECKS - 1; i += 1) await checkForUpdate();
    expect(reload).not.toHaveBeenCalled();
    await checkForUpdate();
    expect(unregister).toHaveBeenCalled();
    expect(del).toHaveBeenCalledWith('workbox-precache-v2-x');
    expect(del).not.toHaveBeenCalledWith('api-cache');
    expect(reload).toHaveBeenCalledTimes(1);
    // Once per version, never a loop.
    for (let i = 0; i < STUCK_AFTER_CHECKS; i += 1) await checkForUpdate();
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('leaves a worker that is already bringing the new build alone, and does nothing when up to date', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'newer2' }) }));
    __resetAppUpdate({ reload, notify, fetchImpl });
    startUpdateWatch({ registration: { update: () => Promise.resolve(), installing: {} } });
    for (let i = 0; i < STUCK_AFTER_CHECKS + 1; i += 1) await checkForUpdate();
    expect(reload).not.toHaveBeenCalled();

    __resetAppUpdate({ reload, notify, fetchImpl: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: APP_VERSION }) }) });
    for (let i = 0; i < STUCK_AFTER_CHECKS + 1; i += 1) await checkForUpdate();
    expect(reload).not.toHaveBeenCalled();
  });
});
