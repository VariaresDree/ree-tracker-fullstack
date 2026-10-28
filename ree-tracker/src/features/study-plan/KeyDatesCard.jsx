// src/features/study-plan/KeyDatesCard.jsx
//
// Progress › Study plan › Key dates: the learner's own calendar — preboards,
// coaching, deadlines, rest days, personal events — and the days of the week
// they rest. The CELE tracker's "Important events" list and the REST cells of
// its refresher calendar. The study plan works around both; Today shows the
// next date and a rest day.
//
// Review-center mode (step 2b) is a switch here, off by default: it adds the
// lecture kind and "Add lecture schedule" (the CELE "Topic schedule"), and the
// plan then drills each topic after its lecture. A self-reviewer never sees
// either.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { daysBetween, todayManila } from '@ree/shared';
import { Button, Card, CardTitle, EmptyState, IconChip, Modal, SegmentedControl, Skeleton } from '../../components/ui';
import { BookOpen, CalendarDays, CloudOff, Pencil, Plus, ShieldAlert, Trash2, Check } from '../../components/ui/icons';
import KeyDateForm from './KeyDateForm';
import LectureScheduleForm from './LectureScheduleForm';
import { useSyllabus } from '../syllabus/useSyllabus';

const REVIEW_MODES = [
  { value: 'self', label: 'On my own' },
  { value: 'center', label: 'With a review center' },
];
// The syllabus topics (for lectures) are read at most this often here.
const SYLLABUS_FRESH_MS = 30 * 60 * 1000;
import { KIND_ICON, KIND_LABEL, WEEKDAY_LONG, WEEKDAY_SHORT, dateRange, inDaysLabel } from './keyDateLabels';

const lastDay = (e) => (e.endsOn && e.endsOn > e.startsOn ? e.endsOn : e.startsOn);

function DateRow({ entry, today, onEdit, onDelete }) {
  const Icon = KIND_ICON[entry.kind] || CalendarDays;
  const ongoing = entry.startsOn <= today && lastDay(entry) >= today;
  const when = ongoing ? 'on now' : entry.startsOn > today ? inDaysLabel(daysBetween(today, entry.startsOn)) : null;
  return (
    <li className="flex items-start gap-3 rounded-[var(--radius-default)] border border-border bg-surface2/30 p-3">
      <IconChip icon={Icon} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-textMain [overflow-wrap:anywhere]">{entry.title}</p>
        <p className="text-xs text-muted2">
          {KIND_LABEL[entry.kind]} · {dateRange(entry)}{when ? ` · ${when}` : ''}
        </p>
        {entry.note && <p className="text-xs text-muted line-clamp-2 [overflow-wrap:anywhere] mt-0.5">{entry.note}</p>}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button type="button" size="icon" variant="ghost" onClick={() => onEdit(entry)} aria-label={`Edit ${entry.title}`}>
          <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <Button type="button" size="icon" variant="ghost" tone="danger" onClick={() => onDelete(entry)} aria-label={`Delete ${entry.title}`}>
          <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

/**
 * @param {{ calendar: ReturnType<import('./usePlanCalendar').usePlanCalendar>, onChanged?: () => void }} props
 *   `onChanged` runs after any change, so the plan can offer to re-plan.
 */
export default function KeyDatesCard({ calendar, onChanged }) {
  const { items, prefs, status, queuedCount, add, update, remove, savePrefs } = calendar;
  const [form, setForm] = useState({ open: false, entry: null, key: 0 });
  const [confirm, setConfirm] = useState(null);
  const [showPast, setShowPast] = useState(false);
  const [schedule, setSchedule] = useState({ open: false, key: 0 });
  const center = prefs.reviewMode === 'center';
  // Lectures name syllabus topics; only center mode needs the list.
  const { topics } = useSyllabus({ fetchIfOlderThanMs: SYLLABUS_FRESH_MS });
  const today = todayManila();

  const explain = (err, action) => toast.error(err?.message ? `Couldn’t ${action}: ${err.message}` : `Couldn’t ${action}. Try again.`);
  const queued = (result) => {
    if (result === 'queued') toast(navigator.onLine ? 'Saved. It syncs in a moment.' : 'Saved on this device. It syncs when you’re back online.');
  };

  const save = async (payload) => {
    try {
      queued(form.entry ? await update(form.entry.id, payload) : await add(payload));
      onChanged?.();
    } catch (err) {
      explain(err, 'save the date');
      throw err;
    }
  };

  const confirmDelete = async () => {
    const entry = confirm;
    setConfirm(null);
    try {
      queued(await remove(entry.id));
      onChanged?.();
    } catch (err) {
      explain(err, 'delete the date');
    }
  };

  // Each lecture is its own key date, saved in turn.
  const saveSchedule = async (entries) => {
    try {
      let result = 'sent';
      for (const entry of entries) {
        if ((await add(entry)) === 'queued') result = 'queued';
      }
      queued(result);
      toast.success(`Added ${entries.length} lecture${entries.length === 1 ? '' : 's'}. Re-plan to follow them.`);
      onChanged?.();
    } catch (err) {
      explain(err, 'save the schedule');
      throw err;
    }
  };

  const setMode = async (reviewMode) => {
    if (reviewMode === prefs.reviewMode) return;
    try {
      queued(await savePrefs({ reviewMode }));
      onChanged?.();
    } catch (err) {
      explain(err, 'save how you’re reviewing');
    }
  };

  const toggleRest = async (day) => {
    const on = prefs.restWeekdays.includes(day);
    const next = on ? prefs.restWeekdays.filter((d) => d !== day) : [...prefs.restWeekdays, day].sort((a, b) => a - b);
    if (next.length > 6) return toast.error('Leave at least one day a week to study.');
    try {
      queued(await savePrefs({ restWeekdays: next }));
      onChanged?.();
    } catch (err) {
      explain(err, 'save your rest days');
    }
    return undefined;
  };

  const list = items || [];
  const upcoming = list.filter((e) => lastDay(e) >= today);
  const past = list.filter((e) => lastDay(e) < today).reverse();
  const row = (e) => <DateRow key={e.id} entry={e} today={today} onEdit={(x) => setForm((f) => ({ open: true, entry: x, key: f.key + 1 }))} onDelete={setConfirm} />;
  const restNames = prefs.restWeekdays.map((d) => WEEKDAY_LONG[d]);

  return (
    <Card padding="md" className="flex flex-col gap-4" aria-labelledby="key-dates-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle size="lg" id="key-dates-title">Key dates</CardTitle>
          <p className="text-sm text-muted2 mt-1 max-w-prose">
            Preboards, coaching, deadlines and days off. Your plan works around them: no task on a rest day, and a preboard counts as that week’s timed sitting.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {center && (
            <Button size="sm" variant="secondary" onClick={() => setSchedule((x) => ({ open: true, key: x.key + 1 }))}>
              <BookOpen size={14} strokeWidth={1.75} aria-hidden="true" /> Add lecture schedule
            </Button>
          )}
          <Button size="sm" onClick={() => setForm((f) => ({ open: true, entry: null, key: f.key + 1 }))}>
            <Plus size={14} strokeWidth={2} aria-hidden="true" /> Add date
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-eyebrow" aria-hidden="true">How you’re reviewing</span>
        <SegmentedControl label="How you’re reviewing" options={REVIEW_MODES} value={prefs.reviewMode} onChange={setMode} />
        <p className="text-xs text-muted2">
          {center
            ? 'Add your review center’s lectures: the plan drills each topic the day after it’s taught, and holds off on a topic you’ve barely practised until then.'
            : 'Reviewing with a review center? Switch to follow its lecture schedule.'}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-eyebrow mb-2">Rest days each week</legend>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_SHORT.map((label, day) => {
            const on = prefs.restWeekdays.includes(day);
            return (
              <Button
                key={label}
                type="button"
                size="sm"
                variant={on ? 'outline' : 'secondary'}
                aria-pressed={on}
                aria-label={WEEKDAY_LONG[day]}
                onClick={() => toggleRest(day)}
              >
                {on && <Check size={14} strokeWidth={2} aria-hidden="true" />}
                {label}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-muted2">
          {restNames.length === 0
            ? 'None. Pick the days you don’t study, and the plan leaves them free.'
            : `No plan tasks on ${restNames.length === 1 ? restNames[0] : `${restNames.slice(0, -1).join(', ')} and ${restNames[restNames.length - 1]}`}.`}
        </p>
      </fieldset>

      {(queuedCount > 0 || status === 'offline' || status === 'unreachable') && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted2">
          <CloudOff size={14} strokeWidth={1.75} aria-hidden="true" />
          {queuedCount > 0
            ? `${queuedCount} change${queuedCount === 1 ? '' : 's'} saved on this device, waiting to sync.`
            : 'Showing the dates saved on this device.'}
        </p>
      )}

      {items === null ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          compact
          icon={CalendarDays}
          title="No key dates yet"
          description="Add your review center’s preboards and coaching, the PRC filing deadline, or a day you’ll be away."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {!center && upcoming.some((e) => e.kind === 'lecture') && (
            <p className="text-xs text-muted2">Your lectures are kept, but the plan follows them only in review-center mode.</p>
          )}
          {upcoming.length > 0
            ? <ul className="flex flex-col gap-2" aria-label="Upcoming key dates">{upcoming.map(row)}</ul>
            : <p className="text-sm text-muted2">Nothing coming up.</p>}
          {past.length > 0 && (
            <>
              <Button variant="ghost" size="sm" className="self-start" aria-expanded={showPast} onClick={() => setShowPast((v) => !v)}>
                {showPast ? 'Hide past dates' : `Show ${past.length} past ${past.length === 1 ? 'date' : 'dates'}`}
              </Button>
              {showPast && <ul className="flex flex-col gap-2" aria-label="Past key dates">{past.map(row)}</ul>}
            </>
          )}
        </div>
      )}

      {form.open && (
        <KeyDateForm key={form.key} open entry={form.entry} reviewMode={prefs.reviewMode} topics={topics} onClose={() => setForm((f) => ({ ...f, open: false }))} onSave={save} />
      )}

      {schedule.open && (
        <LectureScheduleForm key={schedule.key} open topics={topics} onClose={() => setSchedule((x) => ({ ...x, open: false }))} onSave={saveSchedule} />
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete this date?"
        icon={ShieldAlert}
        tone="danger"
        size="sm"
        footer={(
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button type="button" variant="danger" size="sm" onClick={confirmDelete}>Delete</Button>
          </>
        )}
      >
        <p className="text-sm text-muted2 leading-relaxed">
          Delete <strong className="text-textMain">{confirm?.title}</strong>? Re-plan afterwards to give the day back to the plan.
        </p>
      </Modal>
    </Card>
  );
}
