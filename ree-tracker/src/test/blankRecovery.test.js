// A deploy left a device with the app page cached under a chunk's address: the
// module failed on its MIME type, the page stayed blank, and nothing in the app
// could run to fix it. These run the script index.html really ships.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const script = html.match(/<script id="blank-recovery">([\s\S]*?)<\/script>/)[1];

const settle = () => new Promise((r) => { setTimeout(r, 0); });
const unregister = vi.fn(() => Promise.resolve(true));
const del = vi.fn(() => Promise.resolve(true));
const reload = vi.fn();
let listeners;

function fireScriptError(attrs = { type: 'module', src: 'http://x/assets/entry.js' }) {
  const el = document.createElement('script');
  Object.assign(el, attrs);
  listeners.forEach((fn) => fn({ target: el }));
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  listeners = [];
  vi.spyOn(window, 'addEventListener').mockImplementation((type, fn) => { if (type === 'error') listeners.push(fn); });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
  vi.stubGlobal('caches', { keys: async () => ['ree-2-precache-v2-x', 'workbox-precache-v2-x', 'api-user-data'], delete: del });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistrations: async () => [{ unregister }] } });
  vi.stubGlobal('location', { reload });
  // eslint-disable-next-line no-new-func
  new Function(script)();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('blank-page recovery', () => {
  it('clears the worker and its shell, keeps saved API data, and reloads', async () => {
    fireScriptError();
    await settle();
    await settle();
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(del.mock.calls.map((c) => c[0]).sort()).toEqual(['ree-2-precache-v2-x', 'workbox-precache-v2-x']);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('fetches the page’s scripts past the browser’s own cache, which can hold a wrong answer', async () => {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = 'http://x/assets/useStore.js';
    document.head.append(link);
    fireScriptError();
    await settle();
    await settle();
    link.remove();
    const reloaded = fetch.mock.calls.filter(([, opts]) => opts?.cache === 'reload').map(([url]) => url);
    expect(reloaded).toEqual(['http://x/assets/entry.js', 'http://x/assets/useStore.js']);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('tries once a session, so it can never loop', async () => {
    fireScriptError();
    await settle();
    await settle();
    fireScriptError();
    await settle();
    await settle();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('offline it touches nothing: the cache may be all there is', async () => {
    fetch.mockRejectedValue(new Error('offline'));
    fireScriptError();
    await settle();
    await settle();
    expect(unregister).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('a server in trouble is no reason to clear anything either', async () => {
    fetch.mockResolvedValue({ ok: false });
    fireScriptError();
    await settle();
    await settle();
    expect(del).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('ignores anything that isn’t the app’s own module', async () => {
    fireScriptError({ type: 'text/javascript' });
    listeners.forEach((fn) => fn({ target: document.createElement('img') }));
    listeners.forEach((fn) => fn({ target: window }));
    await settle();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('the server’s headers', () => {
  it('holds assets for a day: the header reaches a 404 and any wrong answer too', () => {
    const vercel = JSON.parse(readFileSync(resolve(root, '..', 'vercel.json'), 'utf8'));
    const assets = vercel.headers.find((h) => h.source === '/assets/(.*)').headers.find((h) => h.key === 'Cache-Control');
    expect(assets.value).not.toMatch(/immutable/);
    expect(Number(assets.value.match(/max-age=(\d+)/)[1])).toBeLessThanOrEqual(86400);
  });
});

describe('the server’s rewrite', () => {
  it('a missing asset is a 404, never the app page with a 200', () => {
    const vercel = JSON.parse(readFileSync(resolve(root, '..', 'vercel.json'), 'utf8'));
    const pattern = new RegExp(`^${vercel.rewrites[0].source}$`);
    expect(pattern.test('/assets/useStore-BfpPgbBH.js')).toBe(false);
    expect(pattern.test('/progress')).toBe(true);
    expect(pattern.test('/print/formulas')).toBe(true);
    expect(pattern.test('/')).toBe(true);
  });
});
