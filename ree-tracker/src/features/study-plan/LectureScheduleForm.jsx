// src/features/study-plan/LectureScheduleForm.jsx
//
// Review-center mode: a review center's lecture schedule, row by row (date
// and topic), the CELE tracker's "Topic schedule" sheet. Each filled row is
// saved as its own lecture key date, so one can be moved or deleted later.
import { useState } from 'react';
import { CANONICAL_SUBJECTS, KEY_DATE_LIMITS, isIsoDay, todayManila } from '@ree/shared';
import { Modal, Button, Input, Select } from '../../components/ui';
import { BookOpen, Plus, Trash2 } from '../../components/ui/icons';

const ROWS_AT_START = 3;
const MAX_ROWS = 30;
const ROW = 'grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[9rem_minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--radius-default)] border border-border bg-surface2/30 p-2';

let rowSeq = 0;
const blankRow = (date = '') => ({ key: (rowSeq += 1), date, topicId: '' });

/**
 * @param {{ open: boolean, onClose: () => void, topics: object[]|null,
 *   onSave: (entries: object[]) => Promise<void> }} props
 *   `onSave` gets one lecture key date per filled row. Keyed per opening.
 */
export default function LectureScheduleForm({ open, onClose, topics, onSave }) {
  const [rows, setRows] = useState(() => Array.from({ length: ROWS_AT_START }, (_, i) => blankRow(i === 0 ? todayManila() : '')));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const nameOf = new Map((topics || []).map((t) => [t.topicId, t.name]));

  const setRow = (key, field) => (e) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: e.target.value } : r)));
  const filled = rows.filter((r) => r.date || r.topicId);

  const submit = async (e) => {
    e.preventDefault();
    if (filled.length === 0) return setError('Fill in at least one lecture: its date and topic.');
    if (filled.some((r) => !isIsoDay(r.date) || !r.topicId)) return setError('Each lecture needs both a date and a topic.');
    setError('');
    setSaving(true);
    try {
      await onSave(filled.map((r) => ({
        kind: 'lecture',
        title: `Lecture: ${nameOf.get(r.topicId) || 'topic'}`.slice(0, KEY_DATE_LIMITS.title),
        startsOn: r.date,
        endsOn: null,
        subject: null,
        topicIds: [r.topicId],
        note: null,
      })));
      onClose();
    } catch {
      /* the caller explains; the rows stay */
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add your lecture schedule"
      icon={BookOpen}
      size="md"
      footer={(
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" form="lecture-schedule-form" loading={saving}>
            {filled.length > 1 ? `Save ${filled.length} lectures` : 'Save lecture'}
          </Button>
        </>
      )}
    >
      <form id="lecture-schedule-form" onSubmit={submit} noValidate className="flex flex-col gap-3">
        <p className="text-sm text-muted2">
          One row a lecture, from your review center’s schedule. The plan drills each topic the day after it’s taught.
        </p>
        <ul className="flex flex-col gap-2" aria-label="Lectures">
          {rows.map((r, i) => (
            // On a phone the topic takes its own line under the date: beside
            // it, a long topic name was cut to "Pick a t…".
            <li key={r.key} role="group" aria-label={`Lecture ${i + 1}`} className={ROW}>
              <Input aria-label="Date" type="date" value={r.date} onChange={setRow(r.key, 'date')} />
              <Select aria-label="Topic" wrapperClassName="col-span-2 sm:col-span-1 order-last sm:order-none" value={r.topicId} onChange={setRow(r.key, 'topicId')} disabled={!topics}>
                <option value="">{topics ? 'Pick a topic' : 'Loading topics…'}</option>
                {CANONICAL_SUBJECTS.map((s) => (
                  <optgroup key={s} label={s}>
                    {(topics || []).filter((t) => t.subject === s).map((t) => <option key={t.topicId} value={t.topicId}>{t.name}</option>)}
                  </optgroup>
                ))}
              </Select>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove lecture ${i + 1}`}
                disabled={rows.length === 1}
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              >
                <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          disabled={rows.length >= MAX_ROWS}
          onClick={() => setRows((rs) => [...rs, blankRow()])}
        >
          <Plus size={14} strokeWidth={2} aria-hidden="true" /> Add a row
        </Button>
        {error && <p role="alert" className="text-xs text-[var(--accent-danger)]">{error}</p>}
      </form>
    </Modal>
  );
}
