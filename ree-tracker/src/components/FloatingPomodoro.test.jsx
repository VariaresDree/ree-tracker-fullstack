// The floating timer pill. While it shows, the page and the floating offers
// keep clear of it (--fab-space on <html>); when it goes, so does the space.
// A tap on its mode and time opens the full-screen timer; a drag from there
// moves the pill and opens nothing.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const clock = { pomodoro: { isRunning: true, mode: 'focus' }, remaining: 1500 };
vi.mock('../hooks/usePomodoroClock', () => ({ usePomodoroClock: () => clock }));
vi.mock('../utils/time', () => ({ formatClock: () => '25:00' }));
const widget = { pinned: false, dismissed: false, x: null, y: null };
const setPomodoroWidget = vi.fn();
vi.mock('../store/slices', () => ({
  useSessionSlice: () => ({ startPomodoro: vi.fn(), pausePomodoro: vi.fn(), pomodoroWidget: widget, setPomodoroWidget }),
}));

const { default: FloatingPomodoro } = await import('./FloatingPomodoro');
const { useOverlays } = await import('../store/overlays');
const fabSpace = () => document.documentElement.style.getPropertyValue('--fab-space');

let seen = null;
function Spy() {
  seen = useLocation();
  return <p>focus page</p>;
}
const ui = () => (
  <MemoryRouter initialEntries={['/practice']}>
    <Routes>
      <Route path="/practice" element={<FloatingPomodoro />} />
      <Route path="/focus" element={<Spy />} />
    </Routes>
  </MemoryRouter>
);
const openButton = () => screen.getByRole('button', { name: /Open the focus timer/ });

beforeEach(() => {
  act(() => useOverlays.getState().setScratchpadOpen(false));
  seen = null;
  setPomodoroWidget.mockReset();
  clock.pomodoro = { isRunning: true, mode: 'focus' };
});

describe('FloatingPomodoro', () => {
  it('makes room for itself while it shows, and gives it back', () => {
    const { unmount } = render(ui());
    expect(fabSpace()).toBe('4.5rem');
    act(() => useOverlays.getState().setScratchpadOpen(true));
    expect(fabSpace()).toBe('');
    act(() => useOverlays.getState().setScratchpadOpen(false));
    expect(fabSpace()).toBe('4.5rem');
    unmount();
    expect(fabSpace()).toBe('');
  });

  it('names the mode and time; a tap opens the full-screen timer', () => {
    clock.pomodoro = { isRunning: true, mode: 'exam' };
    render(ui());
    expect(screen.getByRole('timer')).toHaveAccessibleName('Paper exam timer, 25:00 remaining');
    expect(openButton()).toHaveTextContent('Paper exam');
    fireEvent.pointerDown(openButton(), { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(openButton(), { clientX: 101, clientY: 100, pointerId: 1 });
    fireEvent.click(openButton());
    expect(seen?.pathname).toBe('/focus');
    expect(seen.state).toEqual({ from: '/practice' });
  });

  it('a drag from the mode and time moves the pill and opens nothing', () => {
    render(ui());
    const button = openButton();
    fireEvent.pointerDown(button, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(button, { clientX: 140, clientY: 90, pointerId: 1 });
    fireEvent.pointerUp(button, { clientX: 140, clientY: 90, pointerId: 1 });
    fireEvent.click(button);
    expect(seen).toBeNull();
    expect(setPomodoroWidget).toHaveBeenCalledWith(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
  });

  it('a wobble under 6px is still a tap', () => {
    render(ui());
    const button = openButton();
    fireEvent.pointerDown(button, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(button, { clientX: 103, clientY: 102, pointerId: 1 });
    fireEvent.pointerUp(button, { clientX: 103, clientY: 102, pointerId: 1 });
    fireEvent.click(button);
    expect(seen?.pathname).toBe('/focus');
    expect(setPomodoroWidget).not.toHaveBeenCalled();
  });
});
