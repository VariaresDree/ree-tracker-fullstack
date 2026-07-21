// Contextual, ethical notification opt-in.
//
// Shown ONCE, only after the user has completed a session (endSession flips the
// transient `optInEligible` flag) — never on a cold load, which is where cold
// permission prompts get permanently denied. The permission request runs
// strictly inside the explicit "Enable" click handler.
//
// Platform behavior:
//   • Native (Capacitor): schedules the on-device daily reminder (which asks
//     LocalNotifications permission itself).
//   • Web browser: only in-page session notifications are possible — a
//     while-closed daily reminder needs the installed app — so it requests
//     Notification permission and says so honestly.
//   • iOS in a browser tab: permission would silently no-op, so we show an
//     "Add to Home Screen" explainer instead of a prompt.
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import { Button } from './ui';
import { Bell, X } from './ui/icons';
import { useNotificationSlice } from '../store/slices';
import { scheduleDailyReminder } from '../services/localReminders';

export default function NotificationOptIn() {
  const { notifications, optInEligible, setNotificationPrefs, markOptInPrompted } = useNotificationSlice();
  const [busy, setBusy] = useState(false);

  if (!optInEligible || notifications.promptedForOptIn) return null;

  const isNative = Capacitor.isNativePlatform();
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  // A browser tab on iOS can't hold a notification permission — installing to
  // the Home Screen is the prerequisite. (Native Capacitor is unaffected.)
  const iosNeedsInstall = isIOS && !isStandalone && !isNative;

  const dismiss = () => markOptInPrompted();

  const enable = async () => {
    setBusy(true);
    try {
      if (isNative) {
        const ok = await scheduleDailyReminder({
          hour: notifications.reminderHour,
          minute: notifications.reminderMinute,
        });
        if (ok) {
          setNotificationPrefs({ enabled: true, dailyReminderEnabled: true });
          toast.success('Daily reminder set — change the time anytime in Settings.');
        } else {
          toast('Notifications are off in your system settings.', { icon: '🔕' });
        }
      } else if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setNotificationPrefs({ enabled: true });
          toast.success('Session notifications on. Daily reminders need the installed app.');
        } else {
          toast('Notifications blocked — you can enable them later in Settings.', { icon: '🔕' });
        }
      }
    } finally {
      markOptInPrompted();
      setBusy(false);
    }
  };

  return (
    <div className="fixed z-[60] left-4 right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:left-auto md:right-6 md:bottom-6 md:max-w-sm animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-surface border border-border2 rounded-[var(--radius-lg)] elevate-3 p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 text-[var(--accent)]">
            <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-textMain">Keep your streak alive?</p>
            {iosNeedsInstall ? (
              <p className="text-xs text-muted2 mt-1">
                Add REE.ai to your Home Screen (Share → Add to Home Screen) to unlock daily review reminders.
              </p>
            ) : (
              <p className="text-xs text-muted2 mt-1">
                Get a daily nudge for your Active Recall session. You choose the time in Settings.
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {iosNeedsInstall ? (
                <Button size="sm" variant="secondary" onClick={dismiss}>Got it</Button>
              ) : (
                <>
                  <Button size="sm" onClick={enable} disabled={busy}>Enable reminders</Button>
                  <Button size="sm" variant="ghost" onClick={dismiss} disabled={busy}>Not now</Button>
                </>
              )}
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 p-1 -mt-1 -mr-1 text-muted hover:text-textMain rounded cursor-pointer"
          >
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
