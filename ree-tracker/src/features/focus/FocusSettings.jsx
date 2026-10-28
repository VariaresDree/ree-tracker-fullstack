// src/features/focus/FocusSettings.jsx
// Timer settings: the lengths, the long break's rhythm, auto-start, sound and
// what the focus time counts toward. They edit a draft: typing into the old
// sidebar inputs wrote straight into the timer, so clearing a field set a
// 0-minute block, and Save reset a running timer even when nothing changed.
// Save sends only what changed; the timer restarts only if the CURRENT
// block's length changed (utils/pomodoroLogic.updateSettings).
import { useState } from 'react';
import { FOCUS_SUBJECTS, toDisplaySubject } from '@ree/shared';
import { Button, FormField, Input, Modal, Select } from '../../components/ui';
import { Settings2, Volume2 } from '../../components/ui/icons';
import {
  MAX_LONG_EVERY, MAX_MINUTES, MIN_LONG_EVERY, MIN_MINUTES, SHADE_REMINDER_OPTIONS, clampLongEvery, clampMinutes,
} from '../../utils/pomodoroLogic';
import { playChime, primeChime } from '../../utils/chime';

const LENGTHS = [
  ['workDuration', 'Focus'],
  ['breakDuration', 'Short break'],
  ['longBreakDuration', 'Long break'],
];
const TOGGLES = [
  ['autoStartBreaks', 'Auto-start breaks', 'A break starts as soon as a focus block ends.'],
  ['autoStartFocus', 'Auto-start focus', 'The next focus block starts as soon as a break ends.'],
];
const subjectLabel = (s) => (s === 'General' ? 'General' : toDisplaySubject(s));

const draftOf = (p) => ({
  workDuration: String(p.workDuration),
  breakDuration: String(p.breakDuration),
  longBreakDuration: String(p.longBreakDuration),
  longEvery: String(p.longEvery),
  autoStartBreaks: !!p.autoStartBreaks,
  autoStartFocus: !!p.autoStartFocus,
  sound: p.sound !== false,
  subject: p.subject || 'General',
  shadeReminder: String(p.shadeReminder ?? 30),
});

function Toggle({ id, label, hint, checked, onChange }) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent)]"
      />
      <span className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-textMain cursor-pointer">{label}</label>
        {hint && <span id={`${id}-hint`} className="block text-xs text-muted2">{hint}</span>}
      </span>
    </div>
  );
}

function SettingsForm({ pomodoro, onSave, onClose }) {
  const [draft, setDraft] = useState(() => draftOf(pomodoro));
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

  const save = () => {
    const next = {
      workDuration: clampMinutes(draft.workDuration, pomodoro.workDuration),
      breakDuration: clampMinutes(draft.breakDuration, pomodoro.breakDuration),
      longBreakDuration: clampMinutes(draft.longBreakDuration, pomodoro.longBreakDuration),
      longEvery: clampLongEvery(draft.longEvery, pomodoro.longEvery),
      autoStartBreaks: draft.autoStartBreaks,
      autoStartFocus: draft.autoStartFocus,
      sound: draft.sound,
      subject: draft.subject,
      shadeReminder: Number(draft.shadeReminder),
    };
    const changed = Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== pomodoro[k]));
    onClose();
    if (Object.keys(changed).length) onSave(changed);
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-textMain mb-2">Lengths, in minutes ({MIN_MINUTES}–{MAX_MINUTES})</legend>
          <div className="grid grid-cols-3 gap-3">
            {LENGTHS.map(([key, label]) => (
              <FormField key={key} label={label}>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={MIN_MINUTES}
                  max={MAX_MINUTES}
                  value={draft[key]}
                  onChange={(e) => set(key)(e.target.value)}
                  className="font-mono tabular-nums"
                />
              </FormField>
            ))}
          </div>
          <p className="text-xs text-muted2">Changing the length of the current block restarts it.</p>
        </fieldset>

        <FormField label="Long break after every" hint="Focus blocks finished in a row before the long break.">
          <Select value={draft.longEvery} onChange={(e) => set('longEvery')(e.target.value)}>
            {Array.from({ length: MAX_LONG_EVERY - MIN_LONG_EVERY + 1 }, (_, i) => MIN_LONG_EVERY + i).map((n) => (
              <option key={n} value={String(n)}>{n} focus blocks</option>
            ))}
          </Select>
        </FormField>

        <div className="flex flex-col gap-3">
          {TOGGLES.map(([key, label, hint]) => (
            <Toggle key={key} id={`focus-${key}`} label={label} hint={hint} checked={draft[key]} onChange={set(key)} />
          ))}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Toggle id="focus-sound" label="Sound" hint="A chime when a block ends." checked={draft.sound} onChange={set('sound')} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { primeChime(); playChime('test'); }}
            >
              <Volume2 size={14} strokeWidth={1.75} aria-hidden="true" /> Play test sound
            </Button>
          </div>
        </div>

        <FormField label="Shading reminder" hint="In a paper exam, a reminder to transfer your answers to the sheet before the section ends.">
          <Select value={draft.shadeReminder} onChange={(e) => set('shadeReminder')(e.target.value)}>
            {SHADE_REMINDER_OPTIONS.map((m) => <option key={m} value={String(m)}>{m === 0 ? 'Off' : `${m} minutes before the end`}</option>)}
          </Select>
        </FormField>

        <FormField label="Focus on" hint="What your focus blocks count toward in Progress › Habits.">
          <Select value={draft.subject} onChange={(e) => set('subject')(e.target.value)}>
            {FOCUS_SUBJECTS.map((s) => <option key={s} value={s}>{subjectLabel(s)}</option>)}
          </Select>
        </FormField>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="button" onClick={save}>Save</Button>
      </div>
    </>
  );
}

/** The settings dialog. `onSave(patch)` gets only the fields that changed, already clamped. */
export default function FocusSettings({ open, onClose, pomodoro, onSave }) {
  return (
    <Modal open={open} onClose={onClose} title="Timer settings" icon={Settings2}>
      {/* Mounted fresh each time it opens, so the draft starts from the timer. */}
      {open && <SettingsForm pomodoro={pomodoro} onSave={onSave} onClose={onClose} />}
    </Modal>
  );
}
