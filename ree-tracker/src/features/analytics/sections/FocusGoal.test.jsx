// Progress › Habits › Focus time › This week: minutes since Monday against a
// weekly goal, each subject's part of it by its weight on the board.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const writeOrQueue = vi.fn();
vi.mock('../../../services/writeOrQueue', () => ({ writeOrQueue: (...a) => writeOrQueue(...a) }));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: FocusGoal } = await import('./FocusGoal');
const { goalRows, minutesFromHours, weightsFrom, hoursLabel } = await import('./focusGoal');

const WEEK = { startsOn: '2026-10-12', minutes: 200, bySubject: { General: 20, Mathematics: 30, ESAS: 60, EE: 90 } };
const SHARES = [
  { subject: 'Mathematics', weight: 0.25 }, { subject: 'ESAS', weight: 0.3 }, { subject: 'EE', weight: 0.45 },
];

beforeEach(() => {
  writeOrQueue.mockReset();
  toast.success.mockClear();
  toast.error.mockClear();
});

describe('focusGoal', () => {
  it("splits the goal by the board's weights and pairs it with this week's minutes", () => {
    expect(goalRows(600, WEEK, weightsFrom(SHARES))).toEqual([
      { subject: 'Mathematics', target: 150, minutes: 30 },
      { subject: 'ESAS', target: 180, minutes: 60 },
      { subject: 'EE', target: 270, minutes: 90 },
    ]);
  });

  it('reads hours as minutes within half an hour to 50 hours', () => {
    expect(minutesFromHours('10')).toBe(600);
    expect(minutesFromHours('7,5')).toBe(450);
    expect(minutesFromHours('0.25')).toBeNull();
    expect(minutesFromHours('60')).toBeNull();
    expect(minutesFromHours('lots')).toBeNull();
    expect(hoursLabel(450)).toBe('7.5 h');
  });
});

describe('FocusGoal', () => {
  it('with a goal: the week against it, and each subject against its part', () => {
    render(<FocusGoal week={WEEK} goal={{ weeklyMinutes: 600 }} shares={SHARES} />);
    expect(screen.getByRole('heading', { name: 'This week (from Mon Oct 12)' })).toBeInTheDocument();
    expect(screen.getByText(/of your 10 h goal, 6h 40m to go\./)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: "33% of this week's focus goal" })).toBeInTheDocument();
    expect(screen.getByText('1h 30m of 4h 30m')).toBeInTheDocument(); // EE
    expect(screen.getByText(/marked General counts toward the goal/)).toBeInTheDocument();
  });

  it('sets a goal, and says so when it waits on the device offline', async () => {
    writeOrQueue.mockResolvedValueOnce({ status: 'queued' });
    const onSaved = vi.fn();
    render(<FocusGoal week={WEEK} goal={{ weeklyMinutes: null }} shares={SHARES} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set a weekly goal' }));
    fireEvent.click(screen.getByRole('button', { name: '15 h' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save goal' }));
    await waitFor(() => expect(writeOrQueue).toHaveBeenCalledWith(
      '/api/user/focus-goal', 'PUT', { weeklyMinutes: 900 }, { queueKey: '/api/user/focus-goal', supersede: true },
    ));
    expect(toast.success).toHaveBeenCalledWith('Saved on this device. It syncs when you reconnect.');
    expect(await screen.findByText(/of your 15 h goal/)).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('refuses a goal out of range, and can remove one', async () => {
    writeOrQueue.mockResolvedValue({ status: 'sent' });
    const onSaved = vi.fn();
    render(<FocusGoal week={WEEK} goal={{ weeklyMinutes: 600 }} shares={SHARES} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change goal' }));
    fireEvent.change(screen.getByLabelText('Hours a week'), { target: { value: '80' } });
    expect(screen.getByText('Pick between half an hour and 50 hours a week.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save goal' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove goal' }));
    await waitFor(() => expect(writeOrQueue).toHaveBeenCalledWith('/api/user/focus-goal', 'PUT', { weeklyMinutes: null }, expect.any(Object)));
    expect(toast.success).toHaveBeenCalledWith('Weekly focus goal removed.');
    expect(onSaved).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Set a weekly goal' })).toBeInTheDocument();
  });
});
