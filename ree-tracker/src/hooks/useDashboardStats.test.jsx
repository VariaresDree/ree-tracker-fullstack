// useDashboardStats: the reconciled stats Today and Progress share. Pins what
// moving the sync out of the old Dashboard must keep (one fetch per mount,
// answers merged on top) and what it adds (no skeleton when the payload is
// already here, no other account's numbers, refreshes from any caller).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { todayManila, dayBefore } from '@ree/shared';

const TODAY = todayManila();

let uid = 'u1';
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: uid ? { uid } : null }) }));
vi.mock('../services/dbQueries', () => ({
  apiRequest: vi.fn(),
  fetchReadinessScore: vi.fn(),
}));
// The real store persists to IndexedDB; these tests need only its stats.
vi.mock('../store/useStore', async () => {
  const { create } = await import('zustand');
  const store = create((set) => ({
    stats: {}, dynamicTOS: {}, syncStatus: 'synced',
    setStats: (stats) => set({ stats }),
  }));
  return { useStore: store };
});

const { apiRequest, fetchReadinessScore } = await import('../services/dbQueries');
const { useStore } = await import('../store/useStore');
const { syncDashboardStats, __resetDashboardCache } = await import('../services/analyticsSync');
const { useDashboardStats, deriveKpi } = await import('./useDashboardStats');

const payload = (totalAnswered, theta = 0.4) => ({
  data: {
    profile: { totalAnswered, thetaRating: theta, globalStreak: 3 },
    microTopics: { Algebra: { subject: 'Mathematics', subtopic: 'Algebra', totalAttempts: 10, correctHits: 7, totalTimeSecs: 300 } },
    activityCalendar: { '2026-10-08': totalAnswered },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  uid = 'u1';
  __resetDashboardCache();
  useStore.setState({ stats: { dailyTarget: 50 }, dynamicTOS: {}, syncStatus: 'synced' });
  apiRequest.mockResolvedValue(payload(10));
  fetchReadinessScore.mockResolvedValue({ score: 61 });
});

describe('useDashboardStats', () => {
  it('loads the server aggregate once, then reports reconciled stats and KPIs', async () => {
    const { result } = renderHook(() => useDashboardStats());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith('/api/analytics/dashboard/u1');
    expect(result.current.activeStats.totalAnswered).toBe(10);
    expect(result.current.kpi).toMatchObject({ answered: 10, accuracy: 70, streak: 3 });
    expect(fetchReadinessScore).not.toHaveBeenCalled();
    expect(result.current.readiness).toBeNull();
  });

  it('with readiness, fetches the composite index too', async () => {
    const { result } = renderHook(() => useDashboardStats({ withReadiness: true }));
    await waitFor(() => expect(result.current.readiness).toEqual({ score: 61 }));
    expect(fetchReadinessScore).toHaveBeenCalledTimes(1);
  });

  it('a second page starts from the payload already fetched, with no skeleton', async () => {
    await syncDashboardStats('u1');
    const { result } = renderHook(() => useDashboardStats());
    expect(result.current.loading).toBe(false);
    expect(result.current.activeStats.totalAnswered).toBe(10);
  });

  it('never shows another account’s payload', async () => {
    await syncDashboardStats('u1');
    uid = 'u2';
    apiRequest.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useDashboardStats());
    expect(result.current.loading).toBe(true);
  });

  it('re-renders when anyone refreshes the aggregate, without fetching again itself', async () => {
    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    apiRequest.mockResolvedValue(payload(25, 0.9));
    // What the app-wide sync lifecycle does after an offline batch lands.
    await act(() => syncDashboardStats('u1'));
    expect(result.current.activeStats.totalAnswered).toBe(25);
    expect(result.current.activeStats.irt.theta).toBe(0.9);
    expect(apiRequest).toHaveBeenCalledTimes(2); // the mount and that refresh
  });

  it('offline, the fetch settles and the page shows this device’s stats', async () => {
    apiRequest.mockRejectedValue(new Error('[OFFLINE]'));
    useStore.setState({ stats: { dailyTarget: 50, totalAnswered: 4, globalStreak: 1, lastActiveDate: TODAY, activityCalendar: { [TODAY]: 4 } } });
    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.kpi).toMatchObject({ answered: 4, streak: 1 });
  });

  // No fetch to correct it: the stats saved on this device still say 3 from the
  // last day anything was answered. The KPI judges it as of today.
  it('offline, a streak saved days ago reads 0 instead of the stored value', async () => {
    apiRequest.mockRejectedValue(new Error('[OFFLINE]'));
    const lastDay = dayBefore(dayBefore(dayBefore(TODAY)));
    useStore.setState({ stats: { dailyTarget: 50, totalAnswered: 4, globalStreak: 3, lastActiveDate: lastDay, activityCalendar: { [lastDay]: 4 } } });
    const { result } = renderHook(() => useDashboardStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.kpi.streak).toBe(0);
  });
});

describe('deriveKpi', () => {
  it('accuracy and average time from the topic aggregate; zeros when empty', () => {
    expect(deriveKpi({ microTopics: { a: { attempts: 4, correct: 3, totalTime: 8000 } }, totalAnswered: 9, globalStreak: 2, activityCalendar: { [TODAY]: 9 } }))
      .toEqual({ answered: 9, accuracy: 75, avgSec: 2, streak: 2 });
    expect(deriveKpi(null)).toEqual({ answered: 0, accuracy: 0, avgSec: 0, streak: 0 });
  });

  it('streak: kept through yesterday, 0 once a whole day passes unanswered', () => {
    const yesterday = dayBefore(TODAY);
    expect(deriveKpi({ globalStreak: 5, activityCalendar: { [yesterday]: 3 } }).streak).toBe(5);
    expect(deriveKpi({ globalStreak: 5, activityCalendar: { [dayBefore(yesterday)]: 3 } }).streak).toBe(0);
  });
});
