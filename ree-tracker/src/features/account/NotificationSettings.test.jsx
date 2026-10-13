// Account › Notifications › Daily practice reminder: its hour is saved on the
// server; with this phone registered for pushes the server sends it (saying
// what's due) and the on-device reminder is cancelled, so it never comes
// twice; otherwise the on-device reminder stands in.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
const scheduleDailyReminder = vi.fn(async () => true);
const cancelDailyReminder = vi.fn(async () => {});
vi.mock('../../services/localReminders', () => ({ scheduleDailyReminder: (...a) => scheduleDailyReminder(...a), cancelDailyReminder: (...a) => cancelDailyReminder(...a) }));
let pushToken = false;
vi.mock('../../services/pushNotifications', () => ({ hasPushToken: () => pushToken }));
const saveReminderHour = vi.fn(async () => true);
vi.mock('../../services/reminderPrefs', () => ({ saveReminderHour: (...a) => saveReminderHour(...a) }));
let prefs;
const setNotificationPrefs = vi.fn((patch) => { prefs = { ...prefs, ...patch }; });
vi.mock('../../store/slices', () => ({ useNotificationSlice: () => ({ notifications: prefs, setNotificationPrefs }) }));

const { default: NotificationSettings } = await import('./NotificationSettings');

beforeEach(() => {
  vi.clearAllMocks();
  prefs = { enabled: false, dailyReminderEnabled: false, reminderHour: 19, reminderMinute: 0 };
});

const turnOn = () => fireEvent.click(screen.getAllByRole('radio', { name: 'On' })[1]);

describe('NotificationSettings — daily reminder', () => {
  it('with pushes on this phone, the server sends it and the local one is cancelled', async () => {
    pushToken = true;
    render(<NotificationSettings />);
    turnOn();
    await waitFor(() => expect(saveReminderHour).toHaveBeenCalledWith(19));
    expect(cancelDailyReminder).toHaveBeenCalled();
    expect(scheduleDailyReminder).not.toHaveBeenCalled();
    expect(setNotificationPrefs).toHaveBeenCalledWith({ dailyReminderEnabled: true, enabled: true });
  });

  it('without pushes, the on-device reminder stands in, and the hour is still saved', async () => {
    pushToken = false;
    render(<NotificationSettings />);
    turnOn();
    await waitFor(() => expect(scheduleDailyReminder).toHaveBeenCalledWith({ hour: 19, minute: 0 }));
    expect(saveReminderHour).toHaveBeenCalledWith(19);
  });

  it('turning it off clears both, and a new time is saved', async () => {
    pushToken = true;
    prefs = { ...prefs, dailyReminderEnabled: true };
    const { rerender } = render(<NotificationSettings />);
    fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: '7' } });
    await waitFor(() => expect(saveReminderHour).toHaveBeenCalledWith(7));
    expect(scheduleDailyReminder).not.toHaveBeenCalled();

    rerender(<NotificationSettings />);
    fireEvent.click(screen.getAllByRole('radio', { name: 'Off' })[1]);
    await waitFor(() => expect(saveReminderHour).toHaveBeenCalledWith(null));
    expect(cancelDailyReminder).toHaveBeenCalled();
  });
});
