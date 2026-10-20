// The way into the full-screen timer, in the sidebar (a row, or an icon when
// collapsed) and the phone header (an icon). Every form is a link to /focus
// that remembers where it was opened from; only the row shows the time, and
// a dot marks a running block.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const { freshPomodoro, startTimer } = await import('../../utils/pomodoroLogic');
const state = { pomodoro: freshPomodoro() };
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel(state) }));

const { default: FocusLauncher } = await import('./FocusLauncher');

let seen = null;
function Spy() {
  seen = useLocation();
  return null;
}
const at = (variant) => render(
  <MemoryRouter initialEntries={['/progress?tab=habits']}>
    <Routes>
      <Route path="/progress" element={<FocusLauncher variant={variant} />} />
      <Route path="/focus" element={<Spy />} />
    </Routes>
  </MemoryRouter>,
);
const link = () => screen.getByRole('link', { name: 'Focus timer' });

beforeEach(() => { state.pomodoro = freshPomodoro(); seen = null; });

describe('FocusLauncher', () => {
  it.each(['row', 'icon', 'header'])('the %s form links to /focus and remembers the page', (variant) => {
    at(variant);
    expect(link()).toHaveAttribute('href', '/focus');
    fireEvent.click(link());
    expect(seen.pathname).toBe('/focus');
    expect(seen.state).toEqual({ from: '/progress?tab=habits' });
  });

  it('the row reads "Focus timer" and the full length when idle', () => {
    at('row');
    expect(link()).toHaveTextContent('Focus timer');
    expect(link()).toHaveTextContent('25:00');
    expect(screen.queryByTestId('focus-running-dot')).toBeNull();
  });

  it('the row shows the mode and the time left while a block runs', () => {
    state.pomodoro = startTimer(freshPomodoro({ mode: 'exam', examSection: 'EE' }), Date.now());
    at('row');
    expect(link()).toHaveTextContent('Paper exam');
    expect(link()).toHaveTextContent(/[56]:\d\d:\d\d/);
    expect(screen.getByTestId('focus-running-dot')).toBeInTheDocument();
  });

  it('the icon forms carry no time; their name is the link label, with a dot while running', () => {
    state.pomodoro = startTimer(freshPomodoro(), Date.now());
    const { unmount } = at('icon');
    expect(link()).not.toHaveTextContent(/\d/);
    expect(link()).toHaveAttribute('title', 'Focus timer');
    expect(screen.getByTestId('focus-running-dot')).toBeInTheDocument();
    unmount();
    at('header');
    expect(link()).not.toHaveTextContent(/\d/);
    expect(screen.getByTestId('focus-running-dot').className).toMatch(/motion-safe:animate-pulse/);
  });
});
