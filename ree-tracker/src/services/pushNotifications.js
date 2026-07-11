// src/services/pushNotifications.js
// FCM push registration for the Capacitor native app (Phase 4.2).
//
// On the web this module is a guaranteed no-op: every entry point bails unless
// Capacitor reports a native platform AND the PushNotifications plugin is
// available AND the `push-notifications` feature flag (Phase 4.1) is enabled.
// The plugin itself is loaded via dynamic import so the web bundle never pulls
// native-only code paths eagerly.
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import { registerDeviceToken, unregisterDeviceToken } from './dbQueries';

// Pure gate — exported for tests. Push initializes only for an authed user,
// on a native platform, with the rollout flag on.
export function shouldInitPush({ isNative, flagEnabled, uid }) {
    return Boolean(isNative && flagEnabled && uid);
}

let listenersBound = false;
let lastToken = null;

function nativePushAvailable() {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications');
}

/**
 * Ask permission, register with FCM, and sync the device token to the backend.
 * Safe to call on every login — registration is idempotent and the backend
 * upserts by token. Returns true when registration was kicked off.
 */
export async function initPushNotifications(uid, { flagEnabled } = {}) {
    if (!shouldInitPush({ isNative: nativePushAvailable(), flagEnabled, uid })) return false;

    const { PushNotifications } = await import('@capacitor/push-notifications');

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return false;

    if (!listenersBound) {
        listenersBound = true;

        PushNotifications.addListener('registration', async ({ value }) => {
            lastToken = value;
            try {
                await registerDeviceToken(value, Capacitor.getPlatform());
            } catch {
                // Offline or transient failure — the next login re-registers.
            }
        });

        PushNotifications.addListener('registrationError', (err) => {
            console.warn('[push] registration error', err);
        });

        // Foreground notification → in-app toast (system tray handles background).
        PushNotifications.addListener('pushNotificationReceived', (n) => {
            const title = n?.title || n?.data?.title;
            const body = n?.body || n?.data?.body;
            if (title || body) toast(`${title ? `${title} — ` : ''}${body || ''}`, { icon: '🔔' });
        });

        // Tap on a notification → optional in-app route from the data payload.
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            const route = action?.notification?.data?.route;
            if (typeof route === 'string' && route.startsWith('/')) {
                window.location.assign(route);
            }
        });
    }

    await PushNotifications.register();
    return true;
}

/** Logout hook: release this device's token so a signed-out device gets no pushes. */
export async function teardownPushNotifications() {
    if (!nativePushAvailable() || !lastToken) return;
    const token = lastToken;
    lastToken = null;
    try {
        await unregisterDeviceToken(token);
    } catch {
        // Best-effort: the backend also prunes dead tokens on send failures.
    }
}
