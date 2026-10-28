// src/features/study-plan/KeyDateForm.jsx
//
// Add or edit one key date. Checked with the same rule the server uses
// (keyDateErrors in @ree/shared), so a date saved offline can't be rejected
// when it syncs.
//
// A lecture (review-center mode only) names the syllabus topics it covers;
// a self-reviewer never sees the kind, unless editing a lecture saved before
// switching modes.
import { useState } from 'react';
import { CANONICAL_SUBJECTS, KEY_DATE_KINDS, KEY_DATE_LIMITS, keyDateErrors, todayManila } from '@ree/shared';
import { Modal, Button, FormField, Input, Select, Textarea } from '../../components/ui';
import { CalendarDays, X } from '../../components/ui/icons';
import { KIND_HINT, KIND_LABEL, KIND_TITLE_HINT } from './keyDateLabels';

const SUBJECTS = [
  { value: '', label: 'No subject' },
  { value: 'ALL', label: 'All three' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'ESAS', label: 'ESAS' },
  { value: 'EE', label: 'EE' },
];

const fromEntry = (e, kind) => ({
  kind: e?.kind || kind || 'preboard',
  title: e?.title || '',
  startsOn: e?.startsOn || todayManila(),
  endsOn: e?.endsOn || '',
  subject: e?.subject || '',
  topicIds: e?.topicIds || [],
  note: e?.note || '',
});

/**
 * @param {{ open: boolean, onClose: () => void, entry?: object|null, reviewMode?: string,
 *   topics?: object[]|null, onSave: (entry: object) => Promise<void> }} props
 *   `entry` is the one being edited (null to add); `topics` are the syllabus
 *   rows a lecture picks from. Keyed per opening.
 */
export default function KeyDateForm({ open, onClose, entry = null, reviewMode = 'self', topics = null, onSave }) {
  const [form, setForm] = useState(() => fromEntry(entry));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const withSubject = form.kind === 'preboard' || form.kind === 'coaching';
  const lecture = form.kind === 'lecture';
  const kinds = KEY_DATE_KINDS.filter((k) => k !== 'lecture' || reviewMode === 'center' || entry?.kind === 'lecture');
  const nameOf = new Map((topics || []).map((t) => [t.topicId, t.name]));

  const addTopic = (id) => setForm((f) => ({
    ...f,
    topicIds: [...f.topicIds.filter((x) => x !== id), id],
    // A lecture with no name yet is named for its first topic.
    title: f.title || (nameOf.get(id) ? `Lecture: ${nameOf.get(id)}`.slice(0, KEY_DATE_LIMITS.title) : f.title),
  }));

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      kind: form.kind,
      title: form.title.trim(),
      startsOn: form.startsOn,
      endsOn: !lecture && form.endsOn && form.endsOn !== form.startsOn ? form.endsOn : null,
      subject: withSubject && form.subject ? form.subject : null,
      topicIds: lecture ? form.topicIds : [],
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
            {kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </Select>
        </FormField>

        {lecture && (
          <div className="flex flex-col gap-2">
            <FormField
              label="Topics covered"
              required
              error={errors.topicIds}
              hint={topics === null ? 'Loading the syllabus topics…' : 'The plan drills each one the day after.'}
            >
              <Select value="" disabled={!topics || form.topicIds.length >= KEY_DATE_LIMITS.topics} onChange={(e) => e.target.value && addTopic(e.target.value)}>
                <option value="">Add a topic</option>
                {CANONICAL_SUBJECTS.map((s) => (
                  <optgroup key={s} label={s}>
                    {(topics || []).filter((t) => t.subject === s && !form.topicIds.includes(t.topicId)).map((t) => (
                      <option key={t.topicId} value={t.topicId}>{t.name}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </FormField>
            {form.topicIds.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Topics covered">
                {form.topicIds.map((id) => (
                  <li key={id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface2/40 pl-3 pr-1 text-sm text-textMain">
                    {nameOf.get(id) || 'A retired topic'}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${nameOf.get(id) || 'this topic'}`}
                      onClick={() => setForm((f) => ({ ...f, topicIds: f.topicIds.filter((x) => x !== id) }))}
                    >
                      <X size={14} strokeWidth={1.75} aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <FormField label="Name" required error={errors.title} hint={KIND_TITLE_HINT[form.kind]}>
          <Input value={form.title} onChange={set('title')} maxLength={KEY_DATE_LIMITS.title} autoComplete="off" />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Date" required error={errors.startsOn}>
            <Input type="date" value={form.startsOn} onChange={set('startsOn')} />
          </FormField>
          {!lecture && (
            <FormField label="Last day" error={errors.endsOn} hint="For more than one day, like a coaching week.">
              <Input type="date" value={form.endsOn} min={form.startsOn || undefined} onChange={set('endsOn')} />
            </FormField>
          )}
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
