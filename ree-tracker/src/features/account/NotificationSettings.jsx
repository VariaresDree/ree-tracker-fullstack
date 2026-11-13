// src/features/account/NotificationSettings.jsx
//
// Session alerts and the daily practice reminder (moved from Profile's
// Settings tab). Web notifications are requested only from a real tap, never
// on load; the daily reminder needs the installed app.
//
// In a browser (2026-11-12) the reminder is a Web Push from the server, at the
// same hour, saying the same things (services/webPush.js): turning it on asks
// for notifications and registers the browser; the hours offered are the ones
// the server sends at. Without a push key in the build, or where the browser
// can't, it says why and stays off.
//
// When this phone is registered for pushes (and the hour is one the server
// sends at), the server sends the reminder with the day's most useful line (a
// streak about to break, reviews due, today's plan task) and the on-device
// one is cancelled, so it never comes twice; otherwise the on-device reminder
// stands in (services/reminderPrefs applyDailyReminder).
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { serverRemindsAt, SERVER_REMINDER_FIRST_HOUR, SERVER_REMINDER_LAST_HOUR } from '@ree/shared';
import { useNotificationSlice } from '../../store/slices';
import { applyDailyReminder, saveReminderHour } from '../../services/reminderPrefs';
import { disableWebPush, enableWebPush, isPushServiceError, webFailureText, webPushOn, webPushSupport } from '../../services/webPush';
import { reportError } from '../../services/appHealth';
import { FormField, Select, SegmentedControl } from '../../components/ui';
import { BellOff } from '../../components/ui/icons';

// 24h hour → "7:00 PM" for the reminder-time picker.
const formatHour = (h) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`;
const DEFAULT_HOUR = 19;
const ALL_HOURS = Array.from({ length: 24 }, (_, h) => h);
// The hours the server sends at (Manila): the browser's only sender.
const SERVER_HOURS = ALL_HOURS.filter((h) => h >= SERVER_REMINDER_FIRST_HOUR && h <= SERVER_REMINDER_LAST_HOUR);

// What the reminder line says in a browser, by what it can do.
const WEB_NOTE = {
  ready: 'A daily nudge at your time, even with this tab closed: a streak about to break, the reviews due, or today’s plan.',
  blocked: 'Notifications are blocked for this site. Allow them in your browser’s site settings, then turn this on.',
  'ios-home-screen': 'On iPhone or iPad, add REE.ai to your Home Screen first (Share › Add to Home Screen), then turn this on from there.',
  unsupported: 'This browser can’t show reminders. Chrome, Edge and Firefox can, and so can the REE.ai phone app.',
  // Adding the web app to the Home Screen doesn't help without a push key:
  // the reminder is then only the phone app's.
  unconfigured: 'Only in the REE.ai phone app for now.',
};
const WEB_REFUSED = {
  blocked: 'Notifications are blocked for this site. Allow them in your browser’s site settings, then try again.',
  unsupported: 'This browser can’t show reminders. Try Chrome or Edge.',
};

export default function NotificationSettings() {
  const { notifications, setNotificationPrefs } = useNotificationSlice();
  const isNative = Capacitor.isNativePlatform();
  const web = isNative ? null : webPushSupport();
  const webReady = web === 'ready';
  // On in a browser means this browser is registered too.
  const reminderOn = notifications.dailyReminderEnabled && (isNative || webPushOn());
  const webBusy = useRef(false);
  // Chrome couldn't reach its push service: the steps stay on screen until it works.
  const [pushHelp, setPushHelp] = useState(false);

  const setSessionAlerts = async (on) => {
    if (on && !isNative && 'Notification' in window && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toast('Notifications are blocked in your browser settings.');
        return;
      }
    }
    setNotificationPrefs({ enabled: on });
  };

  const setWebReminder = async (on) => {
    // A second tap while the first is still going registered the browser twice.
    if (webBusy.current) return;
    webBusy.current = true;
    try { await setWebReminderNow(on); } finally { webBusy.current = false; }
  };

  const setWebReminderNow = async (on) => {
    if (!on) {
      await disableWebPush();
      saveReminderHour(null);
      setNotificationPrefs({ dailyReminderEnabled: false });
      return;
    }
    const hour = serverRemindsAt(notifications.reminderHour) ? notifications.reminderHour : DEFAULT_HOUR;
    // A sleeping server can take most of a minute to answer.
    const waiting = toast.loading('Turning the reminder on…');
    try {
      const { ok, reason } = await enableWebPush();
      toast.dismiss(waiting);
      setPushHelp(false);
      if (!ok) { toast(WEB_REFUSED[reason] || WEB_REFUSED.unsupported); return; }
    } catch (err) {
      toast.dismiss(waiting);
      // Admin › App health shows what really failed.
      reportError(err instanceof Error ? err : new Error(String(err)));
      setPushHelp(isPushServiceError(err));
      toast.error(webFailureText(err));
      return;
    }
    await saveReminderHour(hour);
    setNotificationPrefs({ dailyReminderEnabled: true, reminderHour: hour });
    toast.success(`Daily reminder set for ${formatHour(hour)}. It says what’s due that day.`);
  };

  const setDailyReminder = async (on) => {
    if (!isNative) return setWebReminder(on);
    if (on) {
      const { ok, from } = await applyDailyReminder({ on: true, hour: notifications.reminderHour, minute: notifications.reminderMinute });
      if (!ok) {
        toast(isNative ? 'Turn on notifications for REE.ai in your phone settings first.' : 'Daily reminders need the REE.ai phone app.');
        return;
      }
      setNotificationPrefs({ dailyReminderEnabled: true, enabled: true });
      toast.success(from === 'server' ? 'Daily reminder set. It says what’s due that day.' : 'Daily reminder set.');
    } else {
      await applyDailyReminder({ on: false });
      setNotificationPrefs({ dailyReminderEnabled: false });
    }
  };

  const changeReminderHour = async (hour) => {
    setNotificationPrefs({ reminderHour: hour });
    if (!isNative) {
      if (reminderOn) { await saveReminderHour(hour); toast.success('Reminder time updated.'); }
      return;
    }
    if (notifications.dailyReminderEnabled) {
      await applyDailyReminder({ on: true, hour, minute: notifications.reminderMinute });
      toast.success('Reminder time updated.');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium text-textMain">Session alerts</p>
          <p className="text-xs text-muted2">An alert when a focus-timer block ends.</p>
        </div>
        <SegmentedControl
          size="sm"
          label="Session alerts"
          value={notifications.enabled ? 'on' : 'off'}
          onChange={(v) => setSessionAlerts(v === 'on')}
          options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
        />
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap border-t border-border2/60 pt-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-textMain flex items-center gap-2">
            Daily practice reminder
            {!isNative && !webReady && !reminderOn && <BellOff size={13} strokeWidth={1.75} aria-hidden="true" className="text-muted" />}
          </p>
          <p className="text-xs text-muted2">
            {isNative ? 'A daily nudge at your time, even with the app closed: a streak about to break, the reviews due, or today’s plan.' : WEB_NOTE[reminderOn ? 'ready' : web]}
          </p>
        </div>
        <SegmentedControl
          size="sm"
          label="Daily practice reminder"
          value={reminderOn ? 'on' : 'off'}
          onChange={(v) => setDailyReminder(v === 'on')}
          options={[{ value: 'on', label: 'On', disabled: !isNative && !webReady }, { value: 'off', label: 'Off' }]}
        />
      </div>

      {pushHelp && !reminderOn && (
        <div role="note" aria-labelledby="push-help-title" className="bg-bg border border-border rounded-[var(--radius-lg)] p-4 flex flex-col gap-2 min-w-0">
          <p id="push-help-title" className="text-sm font-medium text-textMain">Your phone couldn’t reach Google’s push service</p>
          <p className="text-xs text-muted2">Chrome gets the reminder through it. This is a phone setting, not REE.ai. Try these, then turn the reminder on again:</p>
          <ol className="list-decimal pl-5 text-xs text-muted2 flex flex-col gap-1">
            <li>Settings › Network › <b className="text-textMain font-medium">Private DNS</b>: set it to Automatic or Off. Ad-blocking DNS often blocks it.</li>
            <li>Turn off any VPN or ad-blocker app.</li>
            <li>Play Store: update <b className="text-textMain font-medium">Google Play services</b> and Chrome.</li>
            <li>Settings › Apps › Google Play services and Chrome › Battery: <b className="text-textMain font-medium">Unrestricted</b>.</li>
          </ol>
        </div>
      )}

      {reminderOn && (
        <div className="max-w-[220px]">
          <FormField label="Reminder time">
            <Select value={notifications.reminderHour} onChange={(e) => changeReminderHour(Number(e.target.value))}>
              {(isNative ? ALL_HOURS : SERVER_HOURS).map((h) => <option key={h} value={h}>{formatHour(h)}</option>)}
            </Select>
          </FormField>
        </div>
      )}
    </div>
  );
}
