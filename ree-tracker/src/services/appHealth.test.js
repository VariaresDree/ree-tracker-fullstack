import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./appUpdate', () => ({ APP_VERSION: 'abc1234' }));

let reportError;
let request;
let signedIn;

// The module keeps a session's state, so each test gets a fresh copy.
beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  localStorage.clear();
  request = vi.fn(async () => undefined);
  const health = await import('./appHealth');
  reportError = health.reportError;
  health.startAppHealth({ request, whenSignedIn: (fn) => { signedIn = fn; } });
});

afterEach(() => vi.useRealTimers());

const errorCalls = () => request.mock.calls.filter(([url]) => url === '/api/user/client-errors');

describe('reporting errors', () => {
  it('sends one with its version and page, not the query string', async () => {
    window.history.pushState({}, '', '/practice?secret=1');
    reportError(new Error('Cannot read x'));
    await vi.advanceTimersByTimeAsync(3000);
    const [item] = errorCalls()[0][2].errors;
    expect(item).toMatchObject({ message: 'Cannot read x', route: '/practice', version: 'abc1234' });
    expect(item.stack).toContain('Cannot read x');
  });

  it.each(['[OFFLINE]', 'Failed to fetch dynamically imported module: x', 'ResizeObserver loop limit exceeded', "You're signed out. Sign in again to continue."])('ignores %s', async (message) => {
    reportError(new Error(message));
    await vi.advanceTimersByTimeAsync(3000);
    expect(errorCalls()).toHaveLength(0);
  });

  it('ignores what says nothing: a cross-origin script error, a bare rejection', async () => {
    reportError(undefined);
    reportError({ some: 'object' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(errorCalls()).toHaveLength(0);
  });

  it('sends the same error once a session, and at most 20 errors', async () => {
    reportError(new Error('same'));
    reportError(new Error('same'));
    for (let i = 0; i < 30; i += 1) reportError(new Error(`e${i}`));
    await vi.runAllTimersAsync();
    const sent = errorCalls().flatMap(([, , body]) => body.errors.map((e) => e.message));
    expect(sent).toHaveLength(20);
    expect(sent.filter((m) => m === 'same')).toHaveLength(1);
    expect(errorCalls().every(([, , body]) => body.errors.length <= 10)).toBe(true);
  });

  it('keeps errors when the send fails, and tries again', async () => {
    request.mockRejectedValueOnce(new Error('[OFFLINE]'));
    reportError(new Error('kept'));
    await vi.advanceTimersByTimeAsync(3000);
    signedIn();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(errorCalls()).toHaveLength(2);
    expect(errorCalls()[1][2].errors[0].message).toBe('kept');
  });

  it('drops errors the server refuses, or a loop would resend them forever', async () => {
    request.mockRejectedValueOnce(Object.assign(new Error('Not found'), { status: 404 }));
    reportError(new Error('refused'));
    await vi.advanceTimersByTimeAsync(3000);
    signedIn();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(errorCalls()).toHaveLength(1);
  });

  it('uses a long timeout, so it can’t trip the circuit breaker on a slow reply', async () => {
    reportError(new Error('x'));
    await vi.advanceTimersByTimeAsync(3000);
    expect(errorCalls()[0][3].timeoutMs).toBeGreaterThan(12_000);
  });

  it('reports what window listeners catch', async () => {
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('thrown') }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(errorCalls()[0][2].errors[0].message).toBe('thrown');
  });
});

describe('the version ping', () => {
  const pings = () => request.mock.calls.filter(([url]) => url === '/api/user/app-version');

  it('waits until boot is over, then sends once a day', async () => {
    signedIn();
    expect(pings()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(pings()).toHaveLength(1);
    expect(pings()[0][2]).toEqual({ version: 'abc1234' });
    signedIn();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(pings()).toHaveLength(1);
    vi.setSystemTime(Date.now() + 86_400_000);
    signedIn();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(pings()).toHaveLength(2);
  });

  it('tries again next time when it failed', async () => {
    request.mockRejectedValueOnce(new Error('[OFFLINE]'));
    signedIn();
    await vi.advanceTimersByTimeAsync(10_000);
    signedIn();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(pings()).toHaveLength(2);
  });
});
