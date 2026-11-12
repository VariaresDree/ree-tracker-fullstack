// Account › Notifications in a browser (2026-11-12): the daily reminder is a
// Web Push from the server (services/webPush), at an hour the server sends at.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => 'waiting'), dismiss: vi.fn() });
const reportError = vi.fn();
vi.mock('../../services/appHealth', () => ({ reportError: (...a) => reportError(...a) }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../../services/localReminders', () => ({ scheduleDailyReminder: vi.fn(), cancelDailyReminder: vi.fn() }));
vi.mock('../../services/pushNotifications', () => ({ hasPushToken: () => false }));
const writeOrQueue = vi.fn(async () => ({ status: 'sent' }));
vi.mock('../../services/writeOrQueue', () => ({ writeOrQueue: (...a) => writeOrQueue(...a) }));
let support = 'ready';
let registered = false;
const enableWebPush = vi.fn(async () => { registered = true; return { ok: true }; });
const disableWebPush = vi.fn(async () => { registered = false; });
vi.mock('../../services/webPush', () => ({
  webPushSupport: () => support,
  webPushOn: () => registered,
  enableWebPush: (...a) => enableWebPush(...a),
  disableWebPush: (...a) => disableWebPush(...a),
  webFailureText: (err) => `failed at ${err.step}`,
  isPushServiceError: (err) => /push service/.test(err.message),
}));
let prefs;
const setNotificationPrefs = vi.fn((patch) => { prefs = { ...prefs, ...patch }; });
vi.mock('../../store/slices', () => ({ useNotificationSlice: () => ({ notifications: prefs, setNotificationPrefs }) }));

const { default: NotificationSettings } = await import('./NotificationSettings');
const reminderOn = () => screen.getAllByRole('radio', { name: 'On' })[1];

beforeEach(() => {
  vi.clearAllMocks();
  support = 'ready';
  registered = false;
  prefs = { enabled: false, dailyReminderEnabled: false, reminderHour: 2, reminderMinute: 0 };
});

describe('the daily reminder in a browser', () => {
  it('turning it on registers this browser and sets an hour the server sends at', async () => {
    render(<NotificationSettings />);
    expect(screen.getByText(/even with this tab closed/)).toBeInTheDocument();
    fireEvent.click(reminderOn());
    await waitFor(() => expect(writeOrQueue).toHaveBeenCalled());
    expect(enableWebPush).toHaveBeenCalled();
    // 2 AM isn't an hour the server sends at: 7 PM instead.
    expect(writeOrQueue).toHaveBeenCalledWith('/api/user/reminders', 'PUT', { hour: 19 }, expect.anything());
    expect(prefs).toMatchObject({ dailyReminderEnabled: true, reminderHour: 19 });
    expect(toast.success).toHaveBeenCalledWith('Daily reminder set for 7:00 PM. It says what’s due that day.');
  });

  it('offers only the hours the server sends at', () => {
    registered = true;
    prefs = { ...prefs, dailyReminderEnabled: true, reminderHour: 19 };
    render(<NotificationSettings />);
    const hours = [...screen.getByLabelText('Reminder time').querySelectorAll('option')].map((o) => Number(o.value));
    expect(hours[0]).toBe(4);
    expect(hours.at(-1)).toBe(23);
  });

  it('turning it off forgets this browser and clears the server’s hour', async () => {
    registered = true;
    prefs = { ...prefs, dailyReminderEnabled: true, reminderHour: 19 };
    render(<NotificationSettings />);
    fireEvent.click(screen.getAllByRole('radio', { name: 'Off' })[1]);
    await waitFor(() => expect(disableWebPush).toHaveBeenCalled());
    expect(writeOrQueue).toHaveBeenCalledWith('/api/user/reminders', 'PUT', { hour: null }, expect.anything());
  });

  it('blocked notifications: says how to allow them, and nothing is saved', async () => {
    enableWebPush.mockResolvedValueOnce({ ok: false, reason: 'blocked' });
    render(<NotificationSettings />);
    fireEvent.click(reminderOn());
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringMatching(/blocked for this site/)));
    expect(writeOrQueue).not.toHaveBeenCalled();
  });

  it.each([
    ['ios-home-screen', /add REE\.ai to your Home Screen first/],
    ['unconfigured', /Only in the REE\.ai phone app/],
    ['unsupported', /This browser can’t show reminders/],
  ])('%s: says why, and On stays off', (state, note) => {
    support = state;
    render(<NotificationSettings />);
    expect(screen.getByText(note)).toBeInTheDocument();
    expect(reminderOn()).toBeDisabled();
  });

  // 2026-11-12: a phone said "Check your connection" with a working connection.
  it('a failed step says which, logs the real error for App health, and leaves the reminder off', async () => {
    const err = Object.assign(new Error('Web push server: no answer'), { step: 'server' });
    enableWebPush.mockRejectedValueOnce(err);
    render(<NotificationSettings />);
    fireEvent.click(reminderOn());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('failed at server'));
    expect(toast.loading).toHaveBeenCalledWith('Turning the reminder on…');
    expect(toast.dismiss).toHaveBeenCalledWith('waiting');
    expect(reportError).toHaveBeenCalledWith(err);
    expect(writeOrQueue).not.toHaveBeenCalled();
    expect(prefs.dailyReminderEnabled).toBe(false);
  });

  it('a second tap while turning on does nothing (one browser was registered twice)', async () => {
    let finish;
    enableWebPush.mockImplementationOnce(() => new Promise((ok) => { finish = ok; }));
    render(<NotificationSettings />);
    fireEvent.click(reminderOn());
    fireEvent.click(reminderOn());
    finish({ ok: true });
    await waitFor(() => expect(writeOrQueue).toHaveBeenCalled());
    expect(enableWebPush).toHaveBeenCalledTimes(1);
  });

  // 2026-11-12: the owner's Chrome on Android: "Registration failed - push service error".
  it('when the phone can’t reach the push service, the steps stay under the switch', async () => {
    enableWebPush.mockRejectedValueOnce(Object.assign(new Error('Web push browser: 20 Registration failed - push service error'), { step: 'browser' }));
    render(<NotificationSettings />);
    fireEvent.click(reminderOn());
    expect(await screen.findByText('Your phone couldn’t reach Google’s push service')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Private DNS');
  });

  it('other failures show no steps', async () => {
    enableWebPush.mockRejectedValueOnce(Object.assign(new Error('Web push server: no answer'), { step: 'server' }));
    render(<NotificationSettings />);
    fireEvent.click(reminderOn());
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByRole('note')).toBeNull();
  });
});
