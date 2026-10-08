// useDeepAnalytics: one deep-analytics endpoint per Progress section. A
// failure must read as a failure (not "no data"), retry only on request, and
// a section shown again must not wait for the network.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

let uid = 'u1';
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid } }) }));
vi.mock('../../services/dbQueries', () => ({ fetchAnalyticsDeep: vi.fn() }));

const { fetchAnalyticsDeep } = await import('../../services/dbQueries');
const { useDeepAnalytics, __resetDeepAnalyticsCache } = await import('./useDeepAnalytics');

beforeEach(() => {
  vi.clearAllMocks();
  uid = 'u1';
  __resetDeepAnalyticsCache();
});

describe('useDeepAnalytics', () => {
  it('loads, then reports the data', async () => {
    fetchAnalyticsDeep.mockResolvedValue({ items: [{ subject: 'EE', accuracy: 61 }] });
    const { result } = renderHook(() => useDeepAnalytics('subject-radar'));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('loaded'));
    expect(result.current.data.items[0].accuracy).toBe(61);
    expect(fetchAnalyticsDeep).toHaveBeenCalledWith('subject-radar');
  });

  it('offline (null) is an error, not an empty result, and only Retry asks again', async () => {
    fetchAnalyticsDeep.mockResolvedValue(null);
    const { result, rerender } = renderHook(() => useDeepAnalytics('study-time'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    rerender();
    expect(fetchAnalyticsDeep).toHaveBeenCalledTimes(1);

    fetchAnalyticsDeep.mockResolvedValue({ daily: [] });
    act(() => result.current.retry());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('loaded'));
    expect(fetchAnalyticsDeep).toHaveBeenCalledTimes(2);
  });

  it('a section shown again uses the recent result at once, with no second request', async () => {
    fetchAnalyticsDeep.mockResolvedValue({ items: [] });
    const first = renderHook(() => useDeepAnalytics('time-analysis'));
    await waitFor(() => expect(first.result.current.status).toBe('loaded'));
    first.unmount();

    const again = renderHook(() => useDeepAnalytics('time-analysis'));
    expect(again.result.current.status).toBe('loaded');
    expect(fetchAnalyticsDeep).toHaveBeenCalledTimes(1);
  });

  it('results are per account', async () => {
    fetchAnalyticsDeep.mockResolvedValue({ items: [{ subject: 'EE' }] });
    const first = renderHook(() => useDeepAnalytics('subject-radar'));
    await waitFor(() => expect(first.result.current.status).toBe('loaded'));
    first.unmount();

    uid = 'u2';
    fetchAnalyticsDeep.mockReturnValue(new Promise(() => {}));
    const other = renderHook(() => useDeepAnalytics('subject-radar'));
    expect(other.result.current.status).toBe('loading');
    expect(other.result.current.data).toBeNull();
  });
});
