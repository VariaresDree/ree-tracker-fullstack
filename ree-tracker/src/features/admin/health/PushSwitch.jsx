// Admin › App health › Push reminders: the `push-notifications` switch the
// server checks before sending any push (services/pushService, fails closed).
// It had never been turned on, and there was no screen for it, so no reminder
// was ever sent, to the phone app or (since 2026-11-12) a browser.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiRequest } from '../../../services/dbQueries';
import { Card, SegmentedControl, StatusPill } from '../../../components/ui';

const FLAG = 'push-notifications';
const KEY_IN_BUILD = !!import.meta.env.VITE_FIREBASE_VAPID_KEY;

export default function PushSwitch() {
  const [on, setOn] = useState(null); // null while loading
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    apiRequest('/api/config/flags')
      .then((res) => { if (live) setOn(res?.flags?.[FLAG]?.enabled === true); })
      .catch(() => { if (live) setOn(false); });
    return () => { live = false; };
  }, []);

  const change = async (value) => {
    const enabled = value === 'on';
    setSaving(true);
    try {
      await apiRequest(`/api/config/flags/${FLAG}`, 'PUT', { enabled, description: 'Daily reminders by push (phone app and browsers).' });
      setOn(enabled);
      toast.success(enabled ? 'Push reminders are on.' : 'Push reminders are off.');
    } catch (err) {
      toast.error(err.message || 'Couldn’t change it. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding="md" className="flex flex-col gap-3" aria-labelledby="health-push">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 id="health-push" className="text-h3 text-textMain">Push reminders</h3>
          <p className="text-xs text-muted2 mt-1">
            The daily reminder learners turn on in Account › Notifications: a streak about to break, the reviews due, or today’s plan, at their hour. Off, nothing is sent.
          </p>
        </div>
        {on !== null && (
          <SegmentedControl
            size="sm"
            label="Push reminders"
            value={on ? 'on' : 'off'}
            onChange={change}
            options={[{ value: 'on', label: 'On', disabled: saving }, { value: 'off', label: 'Off', disabled: saving }]}
          />
        )}
      </div>
      {!KEY_IN_BUILD && (
        <StatusPill tone="amber">
          Browsers can’t sign up yet: add VITE_FIREBASE_VAPID_KEY in Vercel and redeploy.
        </StatusPill>
      )}
    </Card>
  );
}
