// /focus: the timer alone (no app navigation), carrying the ONE owner clock
// itself, since neither FloatingPomodoro (MainLayout) nor PomodoroOwner (exam
// screens) is mounted there. A link can set up a paper exam, but never over a
// block in progress. Close goes back where the timer was opened from.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const { freshPomodoro, startTimer, modeDurationSecs } = await import('../utils/pomodoroLogic');

const state = { pomodoro: freshPomodoro(), theme: 'dark', plainBackground: false };
vi.mock('../store/useStore', () => ({
  useStore: Object.assign((sel) => sel(state), { getState: () => state }),
}));
const usePomodoroClock = vi.fn(() => ({
  pomodoro: state.pomodoro, remaining: modeDurationSecs(state.pomodoro), duration: modeDurationSecs(state.pomodoro), progress: 0,
}));
vi.mock('../hooks/usePomodoroClock', () => ({ usePomodoroClock: (o) => usePomodoroClock(o) }));
const controls = {
  toggle: vi.fn(), play: vi.fn(), pause: vi.fn(), reset: vi.fn(), skip: vi.fn(), setMode: vi.fn(),
  setExamSection: vi.fn(), setExamFullBoard: vi.fn(), update: vi.fn(), setSubject: vi.fn(),
};
vi.mock('../hooks/usePomodoroControls', () => ({ usePomodoroControls: () => controls }));
const toast = vi.fn();
vi.mock('react-hot-toast', () => ({ default: (...a) => toast(...a) }));

const { default: Focus } = await import('./Focus');

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
}
const at = (entries, index) => render(
  <MemoryRouter initialEntries={entries} initialIndex={index}>
    <Routes>
      <Route path="/focus" element={<><Focus /><Where /></>} />
      <Route path="*" element={<Where />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  window.history.replaceState(null, '');
  state.pomodoro = freshPomodoro();
  usePomodoroClock.mockClear();
  Object.values(controls).forEach((f) => f.mockReset());
  toast.mockReset();
});

describe('Focus page', () => {
  it('owns the clock, with no app navigation', () => {
    at(['/focus']);
    expect(usePomodoroClock).toHaveBeenCalled();
    expect(usePomodoroClock.mock.calls.every(([o]) => o?.owner === true)).toBe(true);
    expect(screen.queryByRole('navigation', { name: 'Primary' })).toBeNull();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('timer')).toHaveTextContent('25:00');
  });

  it('sets up a paper exam from a link when nothing is in progress, then drops the query', () => {
    at(['/focus?mode=exam&section=EE']);
    expect(controls.setMode).toHaveBeenCalledWith('exam');
    expect(controls.setExamSection).toHaveBeenCalledWith('EE');
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/focus$/);
  });

  it('ignores an unknown section but still sets up the exam', () => {
    at(['/focus?mode=exam&section=Chemistry']);
    expect(controls.setMode).toHaveBeenCalledWith('exam');
    expect(controls.setExamSection).not.toHaveBeenCalled();
  });

  it('never replaces a block in progress', () => {
    state.pomodoro = startTimer(freshPomodoro(), Date.now() - 60_000);
    at(['/focus?mode=exam&section=EE']);
    expect(controls.setMode).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('A block is in progress. Reset it to time the paper.');
  });

  it('Close (or Escape) goes back to the page it came from', () => {
    at(['/account', '/focus'], 1);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByTestId('where')).toHaveTextContent('/account');
  });

  it('with no page to go back to, Close goes to where it was opened from, or Today', () => {
    window.history.replaceState({ idx: 0 }, '');
    at([{ pathname: '/focus', state: { from: '/progress?tab=habits' } }]);
    fireEvent.click(screen.getByRole('button', { name: 'Close the focus timer' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/progress?tab=habits');
  });
});
