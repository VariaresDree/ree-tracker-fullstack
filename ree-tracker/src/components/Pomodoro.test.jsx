// Timer settings: minutes are kept to 1–120, Cancel leaves the timer alone,
// and Save restarts it only when a duration changed.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const actions = { updatePomodoro: vi.fn(), startPomodoro: vi.fn(), pausePomodoro: vi.fn(), resetPomodoro: vi.fn() };
vi.mock('../store/slices', () => ({ useSessionSlice: () => actions }));
vi.mock('../hooks/usePomodoroClock', () => ({
  usePomodoroClock: () => ({ pomodoro: { workDuration: 25, breakDuration: 5, isWork: true, isRunning: true }, remaining: 600 }),
  formatClock: () => '10:00',
}));

const { default: Pomodoro } = await import('./Pomodoro');
const { clampMinutes } = await import('../utils/pomodoroLogic');

beforeEach(() => Object.values(actions).forEach((f) => f.mockReset()));

describe('Pomodoro settings', () => {
  it('clamps minutes and ignores a cleared field', () => {
    expect(clampMinutes('0', 25)).toBe(25);
    expect(clampMinutes('', 25)).toBe(25);
    expect(clampMinutes('500', 25)).toBe(120);
    expect(clampMinutes('45', 25)).toBe(45);
  });

  it('Cancel changes nothing; Save with the same minutes does not restart a running timer', () => {
    render(<Pomodoro />);
    fireEvent.click(screen.getByRole('button', { name: 'Timer settings' }));
    fireEvent.change(screen.getByLabelText('Focus'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(actions.updatePomodoro).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Timer settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(actions.resetPomodoro).not.toHaveBeenCalled();
  });

  it('Save applies new minutes, clamped, and restarts', () => {
    render(<Pomodoro />);
    fireEvent.click(screen.getByRole('button', { name: 'Timer settings' }));
    fireEvent.change(screen.getByLabelText('Focus'), { target: { value: '999' } });
    fireEvent.change(screen.getByLabelText('Break'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(actions.updatePomodoro).toHaveBeenCalledWith({ workDuration: 120, breakDuration: 5 });
    expect(actions.resetPomodoro).toHaveBeenCalledTimes(1);
  });
});
