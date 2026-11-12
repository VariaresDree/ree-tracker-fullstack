// src/services/webPush.js
//
// The daily reminder in a browser (2026-11-12): Web Push through Firebase
// Cloud Messaging, the same channel the phone app uses. The browser is
// registered as a device (platform 'web'), and the server's hourly reminder
// run (services/reminderService) sends to it like a phone. Before, reminders
// existed only in the Android app, which nobody had installed: no learner got
// one.
//
// Needs VITE_FIREBASE_VAPID_KEY (Firebase console › Project settings › Cloud
// Messaging › Web Push certificates); without it the browser keeps the
// "phone app only" note. On an iPhone or iPad, the web app has to be added to
// the Home Screen first: Safari in a tab has no push.
//
// Firebase Messaging loads only when someone turns the reminder on (it is kept
// out of the boot download, vite.config.js).

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
// This browser's registration, so it can be removed (turning it off, or on
// sign-out). Its presence also means "on here".
const TOKEN_KEY = 'ree:web-push-token';

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone === true;

/**
 * What this browser can do now:
 *   'unconfigured'     no web push key in this build
 *   'ios-home-screen'  iPhone/iPad Safari in a tab: add to Home Screen first
 *   'unsupported'      no push in this browser
 *   'blocked'          notifications blocked in the browser's settings
 *   'ready'
 */
export function webPushSupport() {
  if (!VAPID_KEY) return 'unconfigured';
  if (typeof window === 'undefined') return 'unsupported';
  const capable = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!capable) return isIos() && !isStandalone() ? 'ios-home-screen' : 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return 'ready';
}

/** Whether this browser is registered for the reminder. */
export function webPushOn() {
  try { return !!localStorage.getItem(TOKEN_KEY); } catch { return false; }
}

const loadMessaging = () => Promise.all([
  import('firebase/messaging'),
  import('../config/firebaseDb'),
  import('./dbQueries'),
]);

/**
 * Ask for notifications (from a tap) and register this browser.
 * @returns {Promise<{ ok: boolean, reason?: 'blocked' | 'unsupported' }>}
 */
export async function enableWebPush() {
  if (webPushSupport() !== 'ready') return { ok: false, reason: webPushSupport() === 'blocked' ? 'blocked' : 'unsupported' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'blocked' };
  const registration = await navigator.serviceWorker.ready;
  const [{ getMessaging, getToken, isSupported }, { app }, { registerDeviceToken }] = await loadMessaging();
  if (!(await isSupported())) return { ok: false, reason: 'unsupported' };
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return { ok: false, reason: 'unsupported' };
  await registerDeviceToken(token, 'web');
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* the server still has it */ }
  return { ok: true };
}

/** Stop this browser's reminders: the server forgets it, and so does Firebase. Never throws. */
export async function disableWebPush() {
  let token = null;
  try { token = localStorage.getItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch { /* nothing kept */ }
  if (!token) return;
  try {
    const [{ getMessaging, deleteToken }, { app }, { unregisterDeviceToken }] = await loadMessaging();
    await unregisterDeviceToken(token);
    await deleteToken(getMessaging(app)).catch(() => {});
  } catch { /* best effort: the server prunes a dead token on its next send */ }
}
