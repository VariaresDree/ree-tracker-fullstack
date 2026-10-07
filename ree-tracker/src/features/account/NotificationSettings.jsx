// src/features/account/NotificationSettings.jsx
//
// Session alerts and the daily practice reminder (moved from Profile's
// Settings tab, behaviour unchanged). Web notifications are requested only
// from a real tap, never on load; the daily reminder needs the installed app.
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { useNotificationSlice } from '../../store/slices';
import { scheduleDailyReminder, cancelDailyReminder } from '../../services/localReminders';
import { FormField, Select, SegmentedControl } from '../../components/ui';
import { BellOff } from '../../components/ui/icons';

// 24h hour → "7:00 PM" for the reminder-time picker.
const formatHour = (h) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`;

export default function NotificationSettings() {
  const { notifications, setNotificationPrefs } = useNotificationSlice();
  const isNative = Capacitor.isNativePlatform();

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

  const setDailyReminder = async (on) => {
    if (on) {
      const ok = await scheduleDailyReminder({ hour: notifications.reminderHour, minute: notifications.reminderMinute });
      if (!ok) {
        toast(isNative ? 'Turn on notifications for REE.ai in your phone settings first.' : 'Daily reminders need the installed app.');
        return;
      }
      setNotificationPrefs({ dailyReminderEnabled: true, enabled: true });
      toast.success('Daily reminder set.');
    } else {
      await cancelDailyReminder();
      setNotificationPrefs({ dailyReminderEnabled: false });
    }
  };

  const changeReminderHour = async (hour) => {
    setNotificationPrefs({ reminderHour: hour });
    if (notifications.dailyReminderEnabled) {
      await scheduleDailyReminder({ hour, minute: notifications.reminderMinute });
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
            {!isNative && <BellOff size={13} strokeWidth={1.75} aria-hidden="true" className="text-muted" />}
          </p>
          <p className="text-xs text-muted2">
            {isNative ? 'A daily nudge to practise, even with the app closed.' : 'Needs the installed app — add REE.ai to your Home Screen.'}
          </p>
        </div>
        <SegmentedControl
          size="sm"
          label="Daily practice reminder"
          value={notifications.dailyReminderEnabled ? 'on' : 'off'}
          onChange={(v) => setDailyReminder(v === 'on')}
          options={[{ value: 'on', label: 'On', disabled: !isNative }, { value: 'off', label: 'Off' }]}
        />
      </div>

      {notifications.dailyReminderEnabled && (
        <div className="max-w-[220px]">
          <FormField label="Reminder time">
            <Select value={notifications.reminderHour} onChange={(e) => changeReminderHour(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{formatHour(h)}</option>)}
            </Select>
          </FormField>
        </div>
      )}
    </div>
  );
}
