// src/features/study-plan/KeyDateForm.jsx
//
// Add or edit one key date. Checked with the same rule the server uses
// (keyDateErrors in @ree/shared), so a date saved offline can't be rejected
// when it syncs.
import { useState } from 'react';
import { KEY_DATE_KINDS, KEY_DATE_LIMITS, keyDateErrors, todayManila } from '@ree/shared';
import { Modal, Button, FormField, Input, Select, Textarea } from '../../components/ui';
import { CalendarDays } from '../../components/ui/icons';
import { KIND_HINT, KIND_LABEL, KIND_TITLE_HINT } from './keyDateLabels';

const SUBJECTS = [
  { value: '', label: 'No subject' },
  { value: 'ALL', label: 'All three' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'ESAS', label: 'ESAS' },
  { value: 'EE', label: 'EE' },
];

const fromEntry = (e) => ({
  kind: e?.kind || 'preboard',
  title: e?.title || '',
  startsOn: e?.startsOn || todayManila(),
  endsOn: e?.endsOn || '',
  subject: e?.subject || '',
  note: e?.note || '',
});

/**
 * @param {{ open: boolean, onClose: () => void, entry?: object|null,
 *   onSave: (entry: object) => Promise<void> }} props
 *   `entry` is the one being edited (null to add). Keyed per opening.
 */
export default function KeyDateForm({ open, onClose, entry = null, onSave }) {
  const [form, setForm] = useState(() => fromEntry(entry));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const withSubject = form.kind === 'preboard' || form.kind === 'coaching';

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      kind: form.kind,
      title: form.title.trim(),
      startsOn: form.startsOn,
      endsOn: form.endsOn && form.endsOn !== form.startsOn ? form.endsOn : null,
      subject: withSubject && form.subject ? form.subject : null,
      // Lectures (review-center mode) carry topics; nothing here does yet.
      topicIds: entry?.topicIds || [],
      note: form.note.trim() || null,
    };
    const found = keyDateErrors(payload);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch {
      /* the caller explains; the form stays open */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit key date' : 'Add a key date'}
      icon={CalendarDays}
      size="md"
      footer={(
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" form="key-date-form" loading={saving}>Save date</Button>
        </>
      )}
    >
      <form id="key-date-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormField label="What is it" hint={KIND_HINT[form.kind]} error={errors.kind}>
          <Select value={form.kind} onChange={set('kind')}>
            {KEY_DATE_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </Select>
        </FormField>
        <FormField label="Name" required error={errors.title} hint={KIND_TITLE_HINT[form.kind]}>
          <Input value={form.title} onChange={set('title')} maxLength={KEY_DATE_LIMITS.title} autoComplete="off" />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Date" required error={errors.startsOn}>
            <Input type="date" value={form.startsOn} onChange={set('startsOn')} />
          </FormField>
          <FormField label="Last day" error={errors.endsOn} hint="For more than one day, like a coaching week.">
            <Input type="date" value={form.endsOn} min={form.startsOn || undefined} onChange={set('endsOn')} />
          </FormField>
        </div>
        {withSubject && (
          <FormField label="Subject" error={errors.subject}>
            <Select value={form.subject} onChange={set('subject')}>
              {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </FormField>
        )}
        <FormField label="Note" error={errors.note} hint={`${form.note.length}/${KEY_DATE_LIMITS.note}`}>
          <Textarea rows={2} value={form.note} onChange={set('note')} maxLength={KEY_DATE_LIMITS.note} />
        </FormField>
      </form>
    </Modal>
  );
}
