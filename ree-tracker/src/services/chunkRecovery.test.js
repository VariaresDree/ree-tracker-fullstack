import { describe, it, expect, vi, beforeEach } from 'vitest';

const healStuckWorker = vi.fn(async () => true);
vi.mock('./appUpdate', () => ({ APP_VERSION: 'build-1', healStuckWorker: (...a) => healStuckWorker(...a) }));

const { failedChunkUrl, isChunkLoadError, recoverFromChunkFailure, recoveryWasTried, refreshChunk, __resetChunkRecovery } = await import('./chunkRecovery');

const ORIGIN = window.location.origin;
const LIBRARY = `${ORIGIN}/assets/v2-Library-abc.js`;
const failure = new TypeError(`Failed to fetch dynamically imported module: ${LIBRARY}`);

// A small site: Library imports two files, one of which imports a third.
const FILES = {
  '/assets/v2-Library-abc.js': 'import{a}from"./v2-a.js";import"./v2-b.js";const l=()=>import("./v2-lazy.js");',
  '/assets/v2-a.js': 'export const a=1;',
  '/assets/v2-b.js': 'import{c}from"./v2-c.js";',
  '/assets/v2-c.js': 'export const c=1;',
};
const makeFetch = (overrides = {}) => vi.fn(async (url) => {
  const path = new URL(url, ORIGIN).pathname;
  if (path === '/version.json') return overrides.version ?? new Response('{}', { status: 200 });
  return FILES[path] ? new Response(FILES[path], { status: 200 }) : new Response('nope', { status: 404 });
});

let reload;
beforeEach(() => {
  sessionStorage.clear();
  reload = vi.fn();
  healStuckWorker.mockClear();
  healStuckWorker.mockResolvedValue(true);
  __resetChunkRecovery();
});

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x/assets/a.js',
    'Importing a module script failed.',
    'error loading dynamically imported module: https://x/assets/a.js',
    'Unable to preload CSS for /assets/a.css',
  ])('knows %s', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('leaves other errors alone', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('failedChunkUrl', () => {
  it('finds the file, with or without the host', () => {
    expect(failedChunkUrl(failure)).toBe(LIBRARY);
    expect(failedChunkUrl(new Error('Unable to preload CSS for /assets/a-1.css'))).toBe(`${ORIGIN}/assets/a-1.css`);
    expect(failedChunkUrl(new Error('Importing a module script failed.'))).toBeNull();
  });
});

describe('refreshChunk', () => {
  it('asks the server for the file and all it imports statically, past the browser’s cache', async () => {
    const fetchImpl = makeFetch();
    await refreshChunk(LIBRARY, fetchImpl);
    const asked = fetchImpl.mock.calls.map(([u]) => new URL(u).pathname).sort();
    expect(asked).toEqual(['/assets/v2-Library-abc.js', '/assets/v2-a.js', '/assets/v2-b.js', '/assets/v2-c.js']);
    for (const [, options] of fetchImpl.mock.calls) expect(options).toEqual({ cache: 'reload' });
  });

  it('survives a failure anywhere in the tree, and never fetches another site', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('down'); });
    await expect(refreshChunk(LIBRARY, fetchImpl)).resolves.toBeUndefined();
    const other = vi.fn();
    await refreshChunk('https://elsewhere.example/assets/a.js', other);
    expect(other).not.toHaveBeenCalled();
  });
});

describe('recoverFromChunkFailure', () => {
  it('the first failure refreshes the file, then reloads', async () => {
    const fetchImpl = makeFetch();
    await recoverFromChunkFailure(failure, { reload, fetchImpl, now: () => 1_000_000 });
    expect(fetchImpl).toHaveBeenCalledWith(LIBRARY, { cache: 'reload' });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(healStuckWorker).not.toHaveBeenCalled();
    expect(recoveryWasTried()).toBe(true);
  });

  it('acts once per page, though each retried import reports it', async () => {
    const fetchImpl = makeFetch();
    await Promise.all([
      recoverFromChunkFailure(failure, { reload, fetchImpl, now: () => 1_000_000 }),
      recoverFromChunkFailure(failure, { reload, fetchImpl, now: () => 1_000_000 }),
    ]);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('failing again right after that reload clears the service worker, once', async () => {
    const fetchImpl = makeFetch();
    await recoverFromChunkFailure(failure, { reload, fetchImpl, now: () => 1_000_000 });
    __resetChunkRecovery();
    await recoverFromChunkFailure(failure, { reload, fetchImpl, now: () => 1_010_000 });
    expect(healStuckWorker).toHaveBeenCalledWith('chunk:build-1');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('never clears the worker when the server can’t be reached: it’s what works offline', async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    await recoverFromChunkFailure(failure, { reload, fetchImpl, now: () => 1_000_000 });
    __resetChunkRecovery();
    await recoverFromChunkFailure(failure, { reload, fetchImpl, now: () => 1_010_000 });
    expect(healStuckWorker).not.toHaveBeenCalled();
  });

  it('a failure a while later starts over with a plain reload', async () => {
    const fetchImpl = makeFetch();
    await recoverFromChunkFailure(failure, { reload, fetchImpl, now: () => 1_000_000 });
    __resetChunkRecovery();
    await recoverFromChunkFailure(failure, { reload, fetchImpl, now: () => 1_000_000 + 61_000 });
    expect(reload).toHaveBeenCalledTimes(2);
    expect(healStuckWorker).not.toHaveBeenCalled();
  });

  it('a slow server can’t hold the reload up for long', async () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    await recoverFromChunkFailure(failure, { reload, fetchImpl, now: () => 1_000_000, refreshLimitMs: 5 });
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
