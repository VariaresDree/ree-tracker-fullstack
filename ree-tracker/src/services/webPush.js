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

import { wakeBackend } from './wakeBackend';

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

// The server on Render's free tier sleeps after 15 idle minutes and takes tens
// of seconds to boot; the default 12 s request timeout read that as "offline",
// so turning the reminder on said "Check your connection" on a phone with a
// working connection (2026-11-12).
export const REGISTER_TIMEOUT_MS = 60_000;
const RETRY_MS = 1_500;
const pause = (ms) => new Promise((ok) => { setTimeout(ok, ms); });

// A failure, tagged with the step: 'browser' (Firebase / push) or 'server'.
// Reworded so App health's noise filter (services/appHealth NOISE) keeps it:
// these are exactly the failures to see.
const plainCause = (cause) => `${cause?.code ? `${cause.code} ` : ''}${cause?.message || cause}`
  .replace('[OFFLINE]', 'no answer').replace('[TIMEOUT]', `no answer in ${REGISTER_TIMEOUT_MS / 1000} s`).replace(/AbortError/gi, 'Abort error');
const stepError = (step, cause) => Object.assign(new Error(`Web push ${step}: ${plainCause(cause)}`), { step, cause });

/**
 * What to tell the learner when a step failed. Every failure used to say
 * "Check your connection", also when the server was only slow to wake.
 */
export function webFailureText(err, online = navigator.onLine) {
  if (!online) return 'You’re offline. Connect, then turn the reminder on again.';
  // Brave, Samsung Internet and phones without Google services often can't.
  if (err?.step === 'browser') return 'This browser couldn’t sign up for notifications. Try again in a minute; on Android, Chrome can, and on iPhone, REE.ai opened from the Home Screen.';
  const said = String(err?.cause?.message || '');
  if (/^\[(OFFLINE|TIMEOUT)\]$/.test(said)) return 'The REE.ai server didn’t answer in time. Try again: it’s awake now.';
  if (/signed out/i.test(said)) return said;
  return 'The REE.ai server couldn’t save it. Try again in a minute.';
}

/** Once more after a pause: a first try right after the permission prompt, or into a waking server, can fail. */
async function twice(fn) {
  try { return await fn(); } catch { await pause(RETRY_MS); return fn(); }
}

/**
 * Ask for notifications (from a tap) and register this browser.
 * Throws an error with `step` ('browser' | 'server') when a step fails.
 * @returns {Promise<{ ok: boolean, reason?: 'blocked' | 'unsupported' }>}
 */
export async function enableWebPush({ wake = wakeBackend } = {}) {
  if (webPushSupport() !== 'ready') return { ok: false, reason: webPushSupport() === 'blocked' ? 'blocked' : 'unsupported' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'blocked' };
  // Start the server's boot now, while Firebase does its part.
  wake();
  let token;
  let registerDeviceToken;
  try {
    const registration = await navigator.serviceWorker.ready;
    const [{ getMessaging, getToken, isSupported }, { app }, db] = await loadMessaging();
    registerDeviceToken = db.registerDeviceToken;
    if (!(await isSupported())) return { ok: false, reason: 'unsupported' };
    token = await twice(() => getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration }));
  } catch (err) {
    throw stepError('browser', err);
  }
  if (!token) return { ok: false, reason: 'unsupported' };
  try {
    await twice(() => registerDeviceToken(token, 'web', { timeoutMs: REGISTER_TIMEOUT_MS }));
  } catch (err) {
    throw stepError('server', err);
  }
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
