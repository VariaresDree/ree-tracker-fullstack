// While the floating timer shows, the page and the floating offers keep
// clear of it (--fab-space on <html>); when it goes, so does the space.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';

const clock = { pomodoro: { isRunning: true, isWork: true }, remaining: 1500 };
vi.mock('../hooks/usePomodoroClock', () => ({ usePomodoroClock: () => clock, formatClock: () => '25:00' }));
const widget = { pinned: false, dismissed: false, x: null, y: null };
vi.mock('../store/slices', () => ({
  useSessionSlice: () => ({ startPomodoro: vi.fn(), pausePomodoro: vi.fn(), pomodoroWidget: widget, setPomodoroWidget: vi.fn() }),
}));

const { default: FloatingPomodoro } = await import('./FloatingPomodoro');
const { useOverlays } = await import('../store/overlays');
const fabSpace = () => document.documentElement.style.getPropertyValue('--fab-space');

beforeEach(() => { act(() => useOverlays.getState().setScratchpadOpen(false)); });

describe('FloatingPomodoro', () => {
  it('makes room for itself while it shows, and gives it back', () => {
    const { unmount } = render(<FloatingPomodoro />);
    expect(fabSpace()).toBe('4.5rem');
    act(() => useOverlays.getState().setScratchpadOpen(true));
    expect(fabSpace()).toBe('');
    act(() => useOverlays.getState().setScratchpadOpen(false));
    expect(fabSpace()).toBe('4.5rem');
    unmount();
    expect(fabSpace()).toBe('');
  });
});
