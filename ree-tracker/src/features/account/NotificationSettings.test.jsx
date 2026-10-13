// Account › Notifications › Daily practice reminder. It never comes twice and
// never goes missing: with this phone registered for pushes, at an hour the
// server sends at (04:00–23:00), the server sends it (saying what's due) and
// the phone's own reminder is cancelled; otherwise the phone's own reminder
// is scheduled and the server's hour is cleared.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
const scheduleDailyReminder = vi.fn(async () => true);
const cancelDailyReminder = vi.fn(async () => {});
vi.mock('../../services/localReminders', () => ({ scheduleDailyReminder: (...a) => scheduleDailyReminder(...a), cancelDailyReminder: (...a) => cancelDailyReminder(...a) }));
let pushToken = false;
vi.mock('../../services/pushNotifications', () => ({ hasPushToken: () => pushToken }));
const writeOrQueue = vi.fn(async () => ({ status: 'sent' }));
vi.mock('../../services/writeOrQueue', () => ({ writeOrQueue: (...a) => writeOrQueue(...a) }));
let prefs;
const setNotificationPrefs = vi.fn((patch) => { prefs = { ...prefs, ...patch }; });
vi.mock('../../store/slices', () => ({ useNotificationSlice: () => ({ notifications: prefs, setNotificationPrefs }) }));

const { default: NotificationSettings } = await import('./NotificationSettings');

const serverHour = () => writeOrQueue.mock.calls.at(-1)?.[2]?.hour;

beforeEach(() => {
  vi.clearAllMocks();
  prefs = { enabled: false, dailyReminderEnabled: false, reminderHour: 19, reminderMinute: 0 };
});

const turnOn = () => fireEvent.click(screen.getAllByRole('radio', { name: 'On' })[1]);

describe('NotificationSettings — daily reminder', () => {
  it('with pushes on this phone, the server sends it and the phone’s own is cancelled', async () => {
    pushToken = true;
    render(<NotificationSettings />);
    turnOn();
    await waitFor(() => expect(writeOrQueue).toHaveBeenCalled());
    expect(writeOrQueue).toHaveBeenCalledWith('/api/user/reminders', 'PUT', { hour: 19 }, { queueKey: '/api/user/reminders', supersede: true });
    expect(cancelDailyReminder).toHaveBeenCalled();
    expect(scheduleDailyReminder).not.toHaveBeenCalled();
    expect(setNotificationPrefs).toHaveBeenCalledWith({ dailyReminderEnabled: true, enabled: true });
  });

  it('without pushes, the phone’s own reminder is scheduled and the server’s hour cleared', async () => {
    pushToken = false;
    render(<NotificationSettings />);
    turnOn();
    await waitFor(() => expect(scheduleDailyReminder).toHaveBeenCalledWith({ hour: 19, minute: 0 }));
    await waitFor(() => expect(serverHour()).toBeNull());
  });

  it('an hour the server never sends at stays on the phone', async () => {
    pushToken = true;
    prefs = { ...prefs, reminderHour: 1 };
    render(<NotificationSettings />);
    turnOn();
    await waitFor(() => expect(scheduleDailyReminder).toHaveBeenCalledWith({ hour: 1, minute: 0 }));
    expect(serverHour()).toBeNull();
  });

  it('a new time moves it without leaving the old one behind, and off clears both', async () => {
    pushToken = true;
    prefs = { ...prefs, dailyReminderEnabled: true };
    const { rerender } = render(<NotificationSettings />);
    fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: '21' } });
    await waitFor(() => expect(serverHour()).toBe(21));
    expect(cancelDailyReminder).toHaveBeenCalled();
    expect(scheduleDailyReminder).not.toHaveBeenCalled();

    rerender(<NotificationSettings />);
    fireEvent.click(screen.getAllByRole('radio', { name: 'Off' })[1]);
    await waitFor(() => expect(serverHour()).toBeNull());
    expect(cancelDailyReminder).toHaveBeenCalledTimes(2);
  });
});
