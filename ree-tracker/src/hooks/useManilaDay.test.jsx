// useManilaDay: the date a screen judges "today" on must move at Manila
// midnight even when nothing else re-renders it.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useManilaDay } from './useManilaDay';

afterEach(() => { vi.useRealTimers(); });

describe('useManilaDay', () => {
  it('re-renders with the new date just after Manila midnight, every midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T23:59:30+08:00'));
    const { result } = renderHook(() => useManilaDay());
    expect(result.current).toBe('2026-10-08');

    act(() => { vi.advanceTimersByTime(29_000); });
    expect(result.current).toBe('2026-10-08');
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(result.current).toBe('2026-10-09');
    act(() => { vi.advanceTimersByTime(86_400_000); });
    expect(result.current).toBe('2026-10-10');
  });

  it('re-reads the date when the page is focused or shown again after the timer slept through midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T22:00:00+08:00'));
    const { result } = renderHook(() => useManilaDay());

    // The laptop slept: the clock moved on, the timer never fired.
    vi.setSystemTime(new Date('2026-10-09T07:00:00+08:00'));
    expect(result.current).toBe('2026-10-08');
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(result.current).toBe('2026-10-09');

    vi.setSystemTime(new Date('2026-10-10T07:00:00+08:00'));
    act(() => { window.dispatchEvent(new Event('pageshow')); });
    expect(result.current).toBe('2026-10-10');
  });

  it('leaves no timer behind on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useManilaDay());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
