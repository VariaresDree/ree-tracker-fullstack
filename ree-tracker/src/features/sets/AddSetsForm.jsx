// src/features/sets/AddSetsForm.jsx
//
// Add sets to finish: one at a time, a numbered run ("Set 1" … "Set 20"), or
// past boards by year and month. The months are the learner's own: board
// months have moved over the years, so none are assumed.
import { useState } from 'react';
import { PRACTICE_SET_LIMITS, numberedSets, pastBoardSets, practiceSetErrors } from '@ree/shared';
import { Modal, Button, FormField, Input, Select, SegmentedControl } from '../../components/ui';
import { Check, ListChecks } from '../../components/ui/icons';

const MODES = [
  { value: 'one', label: 'One set' },
  { value: 'numbered', label: 'Numbered' },
  { value: 'boards', label: 'Past boards' },
];
const SUBJECTS = [
  { value: 'ALL', label: 'All three' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'ESAS', label: 'ESAS' },
  { value: 'EE', label: 'EE' },
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * @param {{ open: boolean, onClose: () => void, collections: string[],
 *   onSave: (sets: object[]) => Promise<void> }} props
 *   `collections` are the existing group names, offered for reuse. Keyed per opening.
 */
export default function AddSetsForm({ open, onClose, collections = [], onSave }) {
  const thisYear = new Date().getFullYear();
  const [mode, setMode] = useState('one');
  const [form, setForm] = useState({
    collection: '',
    subject: 'ALL',
    title: '',
    prefix: 'Set',
    from: '1',
    to: '20',
    fromYear: String(thisYear - 5),
    toYear: String(thisYear - 1),
    months: [],
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Any change clears the last error, so the preview of what's added shows again.
  const set = (field) => (e) => { setError(''); setForm((f) => ({ ...f, [field]: e.target.value })); };
  const toggleMonth = (m) => {
    setError('');
    setForm((f) => ({ ...f, months: f.months.includes(m) ? f.months.filter((x) => x !== m) : [...f.months, m] }));
  };

  const collection = form.collection.trim() || (mode === 'boards' ? 'Past boards' : '');
  const sets = mode === 'one'
    ? [{ collection, title: form.title.trim(), subject: form.subject, status: 'todo', sortOrder: 0 }]
    : mode === 'numbered'
      ? numberedSets({ collection, from: form.from, to: form.to, subject: form.subject, prefix: form.prefix })
      : pastBoardSets({ collection, fromYear: Number(form.fromYear), toYear: Number(form.toYear), months: form.months, subject: form.subject });

  const preview = sets.length === 0
    ? null
    : sets.length === 1 ? `Adds ${sets[0].title || 'one set'}.` : `Adds ${sets.length} sets: ${sets[0].title} to ${sets[sets.length - 1].title}.`;

  const submit = async (e) => {
    e.preventDefault();
    if (sets.length === 0) {
      setError(mode === 'boards' ? 'Pick at least one month the board was held.' : 'Check the numbers: the first can’t be after the last.');
      return;
    }
    const problem = sets.map(practiceSetErrors).find((errs) => Object.keys(errs).length > 0);
    if (problem) {
      setError(Object.values(problem)[0]);
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave(sets);
      onClose();
    } catch {
      /* the caller explains; the form stays */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add sets to finish"
      icon={ListChecks}
      size="md"
      footer={(
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" form="add-sets-form" loading={saving}>
            {sets.length > 1 ? `Add ${sets.length} sets` : 'Add set'}
          </Button>
        </>
      )}
    >
      <form id="add-sets-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <SegmentedControl label="How to add" options={MODES} value={mode} onChange={(m) => { setMode(m); setError(''); }} fullWidth />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Group" hint={mode === 'boards' ? 'Empty: "Past boards"' : 'e.g. RC refresher, Book drills'}>
            <Input value={form.collection} onChange={set('collection')} maxLength={PRACTICE_SET_LIMITS.collection} list="set-collections" autoComplete="off" />
          </FormField>
          <FormField label="Subject">
            <Select value={form.subject} onChange={set('subject')}>
              {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </FormField>
        </div>
        <datalist id="set-collections">
          {collections.map((c) => <option key={c} value={c} />)}
        </datalist>

        {mode === 'one' && (
          <FormField label="Set" hint="e.g. Set 7, Chapter 4 drill">
            <Input value={form.title} onChange={set('title')} maxLength={PRACTICE_SET_LIMITS.title} autoComplete="off" />
          </FormField>
        )}

        {mode === 'numbered' && (
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Name">
              <Input value={form.prefix} onChange={set('prefix')} maxLength={40} autoComplete="off" />
            </FormField>
            <FormField label="From">
              <Input type="number" inputMode="numeric" min="1" value={form.from} onChange={set('from')} />
            </FormField>
            <FormField label="To">
              <Input type="number" inputMode="numeric" min="1" value={form.to} onChange={set('to')} />
            </FormField>
          </div>
        )}

        {mode === 'boards' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="From year">
                <Input type="number" inputMode="numeric" min="1990" max={thisYear} value={form.fromYear} onChange={set('fromYear')} />
              </FormField>
              <FormField label="To year">
                <Input type="number" inputMode="numeric" min="1990" max={thisYear} value={form.toYear} onChange={set('toYear')} />
              </FormField>
            </div>
            <fieldset>
              <legend className="text-eyebrow mb-2">Months the board was held</legend>
              <div className="flex flex-wrap gap-1.5">
                {MONTHS.map((label, i) => {
                  const on = form.months.includes(i + 1);
                  return (
                    <Button key={label} type="button" size="sm" variant={on ? 'outline' : 'secondary'} aria-pressed={on} aria-label={MONTH_NAMES[i]} onClick={() => toggleMonth(i + 1)}>
                      {on && <Check size={14} strokeWidth={2} aria-hidden="true" />}
                      {label}
                    </Button>
                  );
                })}
              </div>
            </fieldset>
          </>
        )}

        {preview && !error && <p className="text-sm text-muted2" aria-live="polite">{preview}{sets.length >= PRACTICE_SET_LIMITS.bulk ? ` That’s the most one go adds (${PRACTICE_SET_LIMITS.bulk}).` : ''}</p>}
        {error && <p role="alert" className="text-xs text-[var(--accent-danger)]">{error}</p>}
      </form>
    </Modal>
  );
}
