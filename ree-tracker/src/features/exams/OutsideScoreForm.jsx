// src/features/exams/OutsideScoreForm.jsx
//
// Add or edit one outside score. Checked with the same rule the server uses
// (outsideScoreErrors in @ree/shared), so an entry saved offline can't be
// rejected when it syncs.
import { useState } from 'react';
import { OUTSIDE_SCORE_LIMITS, outsideScoreErrors, outsideScorePercent, todayManila } from '@ree/shared';
import { Modal, Button, FormField, Input, Select, Textarea, SegmentedControl } from '../../components/ui';
import { ClipboardList } from '../../components/ui/icons';
import { SUBJECT_OPTIONS } from './outsideScoreLabels';

const blank = () => ({ title: '', source: '', takenOn: todayManila(), subject: 'EE', score: '', total: '', note: '', retestOfId: '' });

const fromEntry = (e) => ({
  title: e.title || '',
  source: e.source || '',
  takenOn: e.takenOn || todayManila(),
  subject: e.subject || 'EE',
  score: e.score ?? '',
  total: e.total ?? '',
  note: e.note || '',
  retestOfId: e.retestOfId || '',
});

const asNumber = (v) => (v === '' || v == null ? '' : Number(v));

/**
 * @param {{ open: boolean, onClose: () => void, entry?: object|null,
 *   entries: object[], onSave: (entry: object) => Promise<void> }} props
 *   `entry` is the one being edited (null to add); `entries` feeds "Retest of".
 *   The caller keys it per opening, so the fields start from `entry` each time.
 */
export default function OutsideScoreForm({ open, onClose, entry = null, entries = [], onSave }) {
  const [form, setForm] = useState(() => (entry ? fromEntry(entry) : blank()));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }));
  const today = todayManila();

  // A retest points at a first try of the same subject. An entry that already
  // has retests stays a first try.
  const hasRetests = !!entry && entries.some((e) => e.retestOfId === entry.id);
  const firstTries = entries.filter((e) => !e.retestOfId && e.subject === form.subject && e.id !== entry?.id);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      source: form.source.trim() || null,
      takenOn: form.takenOn,
      subject: form.subject,
      score: asNumber(form.score),
      total: asNumber(form.total),
      note: form.note.trim() || null,
      retestOfId: hasRetests ? null : (firstTries.some((t) => t.id === form.retestOfId) ? form.retestOfId : null),
    };
    const found = outsideScoreErrors(payload, today);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch {
      /* the caller explains; the form stays open with what was typed */
    } finally {
      setSaving(false);
    }
  };

  const percent = outsideScorePercent({ score: asNumber(form.score), total: asNumber(form.total) });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit outside score' : 'Add an outside score'}
      icon={ClipboardList}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" form="outside-score-form" loading={saving}>Save score</Button>
        </>
      }
    >
      <form id="outside-score-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormField label="Name" required error={errors.title} hint="e.g. RC Preboard 2, Chapter 5 drill">
          <Input value={form.title} onChange={set('title')} maxLength={OUTSIDE_SCORE_LIMITS.title} autoComplete="off" />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Taken on" required error={errors.takenOn}>
            <Input type="date" value={form.takenOn} onChange={set('takenOn')} max={today} />
          </FormField>
          <FormField label="Source" error={errors.source} hint="Review center, book or website">
            <Input value={form.source} onChange={set('source')} maxLength={OUTSIDE_SCORE_LIMITS.source} autoComplete="off" />
          </FormField>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-eyebrow" aria-hidden="true">Subject</span>
          <SegmentedControl
            label="Subject"
            options={SUBJECT_OPTIONS}
            value={form.subject}
            onChange={(v) => setForm((f) => ({ ...f, subject: v, retestOfId: f.subject === v ? f.retestOfId : '' }))}
            fullWidth
          />
          {errors.subject && <p className="text-xs text-[var(--accent-danger)]">{errors.subject}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Your score" required error={errors.score}>
            <Input type="number" inputMode="decimal" min="0" step="0.5" value={form.score} onChange={set('score')} />
          </FormField>
          <FormField
            label="Number of items"
            required
            error={errors.total}
            hint={percent != null && !errors.total ? `${percent}%` : undefined}
          >
            <Input type="number" inputMode="numeric" min="1" max={OUTSIDE_SCORE_LIMITS.maxTotal} step="1" value={form.total} onChange={set('total')} />
          </FormField>
        </div>

        <FormField
          label="Retest of"
          hint={hasRetests
            ? 'This entry has retests, so it stays a first try.'
            : firstTries.length === 0 ? 'No earlier entries in this subject yet.' : 'Pick the first try to see how much you improved.'}
        >
          <Select value={hasRetests ? '' : form.retestOfId} onChange={set('retestOfId')} disabled={hasRetests || firstTries.length === 0}>
            <option value="">Not a retest</option>
            {firstTries.map((t) => (
              <option key={t.id} value={t.id}>{t.title} ({t.takenOn})</option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Note"
          error={errors.note}
          hint={`${form.note.length}/${OUTSIDE_SCORE_LIMITS.note}. What went wrong, what to review.`}
        >
          <Textarea rows={3} value={form.note} onChange={set('note')} maxLength={OUTSIDE_SCORE_LIMITS.note} />
        </FormField>
      </form>
    </Modal>
  );
}
