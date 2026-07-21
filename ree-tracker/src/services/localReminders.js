// src/services/localReminders.js
// On-device daily-review reminder for the Capacitor native app.
//
// This is the honest "serverless" reminder: @capacitor/local-notifications
// schedules a repeating notification ENTIRELY on the device — no server, no
// FCM, no google-services.json — and it fires even while the app is closed.
//
// On the web this module is a guaranteed no-op: the Notification Triggers API
// never shipped, so a while-closed reminder is impossible in a browser tab.
// Every entry point bails unless Capacitor reports a native platform with the
// LocalNotifications plugin available. The plugin is loaded via dynamic import
// so the web bundle never pulls native-only code eagerly.
import { Capacitor } from '@capacitor/core';

// Stable id so re-scheduling REPLACES (never stacks) the reminder, and cancel
// can target it precisely.
export const DAILY_REMINDER_ID = 1001;

// Pure gate — exported for tests. Scheduling runs only on a native platform
// when the user has enabled the reminder.
export function shouldScheduleReminder({ isNative, enabled }) {
    return Boolean(isNative && enabled);
}

let listenerBound = false;

function nativeLocalNotifsAvailable() {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications');
}

async function bindTapListener(LocalNotifications) {
    if (listenerBound) return;
    listenerBound = true;
    // Tap on the reminder → route into the daily review surface.
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const route = action?.notification?.extra?.route;
        if (typeof route === 'string' && route.startsWith('/')) {
            window.location.assign(route);
        }
    });
}

/**
 * Schedule (or reschedule) the repeating daily review reminder at hour:minute
 * (device local time). Asks permission if still in the prompt state. Returns
 * true when the reminder was scheduled.
 */
export async function scheduleDailyReminder({ hour = 19, minute = 0 } = {}) {
    if (!nativeLocalNotifsAvailable()) return false;

    const { LocalNotifications } = await import('@capacitor/local-notifications');

    let perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
        perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display !== 'granted') return false;

    await bindTapListener(LocalNotifications);

    // Replace any existing instance first so re-scheduling never stacks.
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] }).catch(() => {});

    await LocalNotifications.schedule({
        notifications: [
            {
                id: DAILY_REMINDER_ID,
                title: 'REE.ai',
                body: 'Time for your daily Active Recall session.',
                // `on: { hour, minute }` fires every day at that wall-clock time;
                // allowWhileIdle survives Android Doze so it isn't silently dropped.
                schedule: { on: { hour, minute }, allowWhileIdle: true },
                extra: { route: '/review' },
            },
        ],
    });
    return true;
}

/** Cancel the daily reminder (called when the user turns it off). */
export async function cancelDailyReminder() {
    if (!nativeLocalNotifsAvailable()) return false;
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] }).catch(() => {});
    return true;
}
