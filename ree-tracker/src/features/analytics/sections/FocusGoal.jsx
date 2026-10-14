// src/features/analytics/sections/FocusGoal.jsx
//
// Progress › Habits › Focus time › This week: focus minutes since Monday
// (Manila) against a weekly goal the learner sets, and each board subject's
// part of it by its weight on the board (focusGoal.js). Saved with
// PUT /api/user/focus-goal, queued on the device when offline. Display only,
// like the focus blocks: it never feeds θ, readiness or the forecast.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { toDisplaySubject } from '@ree/shared';
import { Button, FormField, Input, ProgressIndicator } from '../../../components/ui';
import { writeOrQueue } from '../../../services/writeOrQueue';
import { formatDuration } from '../../../utils/time';
import { GOAL_MAX, GOAL_MIN, GOAL_PRESETS, goalRows, hoursLabel, minutesFromHours, weightsFrom } from './focusGoal';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mondayLabel = (iso) => {
  const [, m, d] = String(iso || '').split('-').map(Number);
  return m >= 1 && m <= 12 ? `Mon ${MONTHS[m - 1]} ${d}` : null;
};
const percent = (part, whole) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);
const duration = (minutes) => formatDuration(minutes * 60);

function GoalForm({ current, onSave, onCancel, busy }) {
  const [hours, setHours] = useState(current ? String(Math.round((current / 60) * 10) / 10) : '');
  const minutes = minutesFromHours(hours);
  const typed = hours.trim() !== '';
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => { e.preventDefault(); if (minutes) onSave(minutes); }}
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Common goals">
        {GOAL_PRESETS.map((m) => (
          <Button key={m} type="button" size="sm" variant={minutes === m ? 'primary' : 'secondary'} onClick={() => setHours(String(m / 60))}>
            {hoursLabel(m)}
          </Button>
        ))}
      </div>
      <FormField
        label="Hours a week"
        className="max-w-[12rem]"
        error={typed && !minutes ? `Pick between half an hour and ${GOAL_MAX / 60} hours a week.` : undefined}
      >
        <Input type="number" inputMode="decimal" min={GOAL_MIN / 60} max={GOAL_MAX / 60} step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!minutes || busy} loading={busy}>Save goal</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        {current != null && (
          <Button type="button" size="sm" variant="ghost" tone="danger" onClick={() => onSave(null)} disabled={busy}>Remove goal</Button>
        )}
      </div>
    </form>
  );
}

/**
 * @param {{ week?: { startsOn: string, minutes: number, bySubject: object }, goal?: { weeklyMinutes: number|null },
 *   shares?: Array, onSaved?: () => void }} props
 */
export default function FocusGoal({ week, goal, shares, onSaved }) {
  // A goal saved here, shown at once (and while it waits in the queue offline).
  const [saved, setSaved] = useState(undefined);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = saved !== undefined ? saved : goal?.weeklyMinutes ?? null;
  const spent = week?.minutes || 0;
  const since = mondayLabel(week?.startsOn);

  const save = async (weeklyMinutes) => {
    setBusy(true);
    try {
      const { status } = await writeOrQueue('/api/user/focus-goal', 'PUT', { weeklyMinutes }, { queueKey: '/api/user/focus-goal', supersede: true });
      setSaved(weeklyMinutes);
      setEditing(false);
      if (status === 'queued') toast.success('Saved on this device. It syncs when you reconnect.');
      else {
        toast.success(weeklyMinutes == null ? 'Weekly focus goal removed.' : 'Weekly focus goal saved.');
        onSaved?.();
      }
    } catch {
      toast.error('Couldn’t save your focus goal. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="focus-week-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="focus-week-heading" className="text-eyebrow">This week{since ? ` (from ${since})` : ''}</h3>
        {current != null && !editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Change goal</Button>
        )}
      </div>

      {editing ? (
        <GoalForm current={current} busy={busy} onSave={save} onCancel={() => setEditing(false)} />
      ) : current == null ? (
        <div className="flex flex-col gap-2 items-start">
          <p className="text-sm text-muted2">
            {spent > 0 ? `${duration(spent)} of focus so far this week. ` : ''}
            Set a weekly focus goal to see each subject’s part of it, by its weight on the board.
          </p>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Set a weekly goal</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-textMain">
            <span className="font-semibold tabular-nums">{duration(spent)}</span> of your {hoursLabel(current)} goal
            {spent >= current ? ' — goal reached.' : `, ${duration(current - spent)} to go.`}
          </p>
          <ProgressIndicator value={percent(spent, current)} tone={spent >= current ? 'success' : 'amber'} size="sm" ariaLabel={`${percent(spent, current)}% of this week's focus goal`} />
          <ul className="flex flex-col gap-2">
            {goalRows(current, week, weightsFrom(shares)).map((r) => (
              <li key={r.subject} className="flex flex-col gap-1">
                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-textMain">{toDisplaySubject(r.subject)}</span>
                  <span className="text-muted2 tabular-nums">{duration(r.minutes)} of {duration(r.target)}</span>
                </div>
                <ProgressIndicator
                  value={percent(r.minutes, r.target)}
                  tone={r.minutes >= r.target ? 'success' : 'velocity'}
                  size="sm"
                  ariaLabel={`${toDisplaySubject(r.subject)}: ${duration(r.minutes)} of ${duration(r.target)} this week`}
                />
              </li>
            ))}
          </ul>
          {week?.bySubject?.General > 0 && (
            <p className="text-xs text-muted2">{duration(week.bySubject.General)} marked General counts toward the goal, not toward a subject.</p>
          )}
        </div>
      )}
    </section>
  );
}
