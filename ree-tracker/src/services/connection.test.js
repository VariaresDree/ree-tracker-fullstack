// The app used to need a reload after a network blip: one failure blocked
// every request for 30 s, nothing but a successful response unblocked it, and
// screens that fetch once never asked again. These pin the way back.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getIdToken = vi.fn(async (force) => (force ? 'fresh' : 'old'));
vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: { getIdToken: (...a) => getIdToken(...a) } } }));

import {
  __resetConnection, getConnection, subscribeConnection, noteNetworkFailure, shouldShortCircuit,
  checkBackend, requestRefetch, PROBE_MS, HEALTH_BACKOFF_MS,
} from './connection';
import { apiRequest } from './dbQueries';

const ok = (body = {}, status = 200) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  __resetConnection();
  getIdToken.mockClear();
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('connection', () => {
  it('after a failure, fails fast but lets one request through every few seconds', () => {
    noteNetworkFailure(1_000);
    expect(getConnection().backendUp).toBe(false);
    expect(shouldShortCircuit(1_000 + PROBE_MS - 1)).toBe(true);
    expect(shouldShortCircuit(1_000 + PROBE_MS)).toBe(false);
  });

  it('a /health answer brings it back up and asks screens to fetch again', async () => {
    const seen = vi.fn();
    subscribeConnection(seen);
    noteNetworkFailure();
    const before = getConnection().epoch;
    await expect(checkBackend({ fetchImpl: async () => ({}) })).resolves.toBe(true);
    expect(getConnection()).toEqual({ backendUp: true, epoch: before + 1 });
    expect(seen).toHaveBeenCalled();
  });

  it('checks on the server by itself while it is down', async () => {
    vi.useFakeTimers();
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue({});
    noteNetworkFailure();
    await vi.advanceTimersByTimeAsync(HEALTH_BACKOFF_MS[0]);
    expect(getConnection().backendUp).toBe(false);
    await vi.advanceTimersByTimeAsync(HEALTH_BACKOFF_MS[1]);
    expect(getConnection().backendUp).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('requestRefetch lets the next request through at once', () => {
    noteNetworkFailure();
    expect(shouldShortCircuit()).toBe(true);
    requestRefetch();
    expect(shouldShortCircuit()).toBe(false);
  });
});

describe('apiRequest and the breaker', () => {
  it('a network failure trips it; the next answer clears it and bumps the reconnect key', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(apiRequest('/api/x')).rejects.toThrow('[OFFLINE]');
    expect(getConnection().backendUp).toBe(false);

    // Inside the probe window: no request goes out.
    await expect(apiRequest('/api/x')).rejects.toThrow('[OFFLINE]');
    expect(fetch).toHaveBeenCalledTimes(1);

    requestRefetch(); // e.g. the browser's `online` event
    const epoch = getConnection().epoch;
    fetch.mockResolvedValueOnce(ok({ fine: true }));
    await expect(apiRequest('/api/x')).resolves.toEqual({ fine: true });
    expect(getConnection()).toEqual({ backendUp: true, epoch: epoch + 1 });
  });

  it('retries a refused token once with a fresh one', async () => {
    fetch.mockResolvedValueOnce(ok({ error: 'expired' }, 401)).mockResolvedValueOnce(ok({ yes: 1 }));
    await expect(apiRequest('/api/me')).resolves.toEqual({ yes: 1 });
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer old');
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh');
  });

  it('a second 401 stands', async () => {
    fetch.mockResolvedValue(ok({ error: 'no' }, 401));
    await expect(apiRequest('/api/me')).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
