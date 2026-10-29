// src/features/exams/OutsideScoreForm.jsx
//
// Add or edit one outside score. Checked with the same rule the server uses
// (outsideScoreErrors in @ree/shared), so an entry saved offline can't be
// rejected when it syncs.
//
// The assessment log (the CELE tracker's "Assessments" sheet, 2026-10): an
// all-three entry takes each subject's score, and "More details" holds the
// time used, the items guessed and skipped, and the topics to improve. Those
// keys are sent only when the entry already has them or they were changed
// here: a form opened from a copy saved before they existed must not clear
// what another device recorded.
import { useState } from 'react';
import {
  CANONICAL_SUBJECTS, OUTSIDE_SCORE_LIMITS, PRC_EXAM_FORMAT, outsidePartsTotals, outsideScoreErrors, outsideScorePercent, todayManila,
} from '@ree/shared';
import { Modal, Button, Disclosure, FormField, Input, Select, Textarea, SegmentedControl } from '../../components/ui';
import { ClipboardList, X } from '../../components/ui/icons';
import { SUBJECT_OPTIONS, subjectLabel } from './outsideScoreLabels';

const LOG_FIELDS = ['parts', 'minutesUsed', 'guessed', 'skipped', 'improveTopicIds'];
const PART_ROW = 'grid grid-cols-[minmax(0,4.5rem)_1fr_1fr] items-center gap-3';

const blankParts = () => Object.fromEntries(
  CANONICAL_SUBJECTS.map((s) => [s, { score: '', total: String(PRC_EXAM_FORMAT[s].items) }]),
);

const partsFrom = (parts) => {
  const out = blankParts();
  for (const p of parts || []) if (out[p.subject]) out[p.subject] = { score: String(p.score), total: String(p.total) };
  return out;
};

const blank = () => ({
  title: '', source: '', takenOn: todayManila(), subject: 'EE', score: '', total: '', note: '', retestOfId: '',
});

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

const logFrom = (e, editing) => ({
  // A new all-three entry starts on per-subject scores, prefilled or not (a
  // preboard logged from Today, a set from the checklist); an older entry
  // without them stays a single score until the learner switches.
  byPart: editing ? Array.isArray(e.parts) && e.parts.length > 0 : true,
  parts: partsFrom(e?.parts),
  hours: e?.minutesUsed != null ? String(Math.floor(e.minutesUsed / 60)) : '',
  minutes: e?.minutesUsed != null ? String(e.minutesUsed % 60) : '',
  guessed: e?.guessed != null ? String(e.guessed) : '',
  skipped: e?.skipped != null ? String(e.skipped) : '',
  topicIds: e?.improveTopicIds || [],
});

const asNumber = (v) => (v === '' || v == null ? '' : Number(v));
const countOrNull = (v) => (String(v).trim() === '' ? null : Number(v));

/**
 * @param {{ open: boolean, onClose: () => void, entry?: object|null, prefill?: object|null,
 *   entries: object[], topics?: object[]|null, onSave: (entry: object) => Promise<void> }} props
 *   `entry` is the one being edited (null to add); `prefill` starts a new
 *   entry with some fields set (the rating calculator's scores); `entries`
 *   feeds "Retest of"; `topics` are the syllabus rows for "Topics to improve".
 *   The caller keys it per opening, so the fields start from `entry` each time.
 */
export default function OutsideScoreForm({ open, onClose, entry = null, prefill = null, entries = [], topics = null, onSave }) {
  const start = entry || prefill;
  const [form, setForm] = useState(() => (start ? fromEntry(start) : blank()));
  const [log, setLog] = useState(() => logFrom(start, !!entry));
  // Log fields changed here, or brought by a prefill: sent even on a new entry.
  const [touched, setTouched] = useState(() => new Set(prefill ? LOG_FIELDS.filter((f) => prefill[f] != null) : []));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }));
  const touch = (...fields) => setTouched((t) => new Set([...t, ...fields]));
  const setLogField = (key, field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setLog((l) => ({ ...l, [key]: value }));
    touch(field);
  };
  const setPart = (subject, key) => (e) => {
    const value = e.target.value;
    setLog((l) => ({ ...l, parts: { ...l.parts, [subject]: { ...l.parts[subject], [key]: value } } }));
    touch('parts');
  };
  const today = todayManila();

  // A retest points at a first try of the same subject. An entry that already
  // has retests stays a first try.
  const hasRetests = !!entry && entries.some((e) => e.retestOfId === entry.id);
  const firstTries = entries.filter((e) => !e.retestOfId && e.subject === form.subject && e.id !== entry?.id);

  const byPart = form.subject === 'ALL' && log.byPart;
  const partRows = CANONICAL_SUBJECTS
    .filter((s) => String(log.parts[s].score).trim() !== '')
    .map((s) => ({ subject: s, score: Number(log.parts[s].score), total: Number(log.parts[s].total) }));
  const sums = byPart ? outsidePartsTotals(partRows) : null;

  const pickable = (topics || []).filter((t) => form.subject === 'ALL' || t.subject === form.subject);
  const chosen = log.topicIds.filter((id) => pickable.some((t) => t.topicId === id));
  const nameOf = new Map((topics || []).map((t) => [t.topicId, t.name]));

  // A log key goes in the request when the entry has it, or it was set here.
  const sends = (field) => touched.has(field) || (!!entry && entry[field] !== undefined)
    || (field === 'parts' && form.subject !== 'ALL' && entry?.parts != null);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      source: form.source.trim() || null,
      takenOn: form.takenOn,
      subject: form.subject,
      score: sums ? sums.score : asNumber(form.score),
      total: sums ? sums.total : asNumber(form.total),
      note: form.note.trim() || null,
      retestOfId: hasRetests ? null : (firstTries.some((t) => t.id === form.retestOfId) ? form.retestOfId : null),
    };
    if (sends('parts')) payload.parts = byPart && partRows.length > 0 ? partRows : null;
    if (sends('minutesUsed')) {
      const h = countOrNull(log.hours);
      const m = countOrNull(log.minutes);
      payload.minutesUsed = h == null && m == null ? null : (h || 0) * 60 + (m || 0);
    }
    if (sends('guessed')) payload.guessed = countOrNull(log.guessed);
    if (sends('skipped')) payload.skipped = countOrNull(log.skipped);
    if (sends('improveTopicIds')) payload.improveTopicIds = topics ? chosen : log.topicIds;

    const found = outsideScoreErrors(payload, today);
    if (byPart && partRows.length === 0) found.parts = 'Enter at least one subject’s score.';
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

  const percent = sums ? outsideScorePercent(sums) : outsideScorePercent({ score: asNumber(form.score), total: asNumber(form.total) });
  const moreErrors = errors.minutesUsed || errors.guessed || errors.skipped || errors.improveTopicIds;

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

        {byPart ? (
          <fieldset className="flex flex-col gap-3 min-w-0">
            <legend className="text-eyebrow mb-1.5">Each subject’s score</legend>
            {/* One header row for the eye; each input is named inside its subject's group. */}
            <div className={PART_ROW} aria-hidden="true">
              <span />
              <span className="text-eyebrow">Score</span>
              <span className="text-eyebrow">Items</span>
            </div>
            {CANONICAL_SUBJECTS.map((s) => (
              <div key={s} role="group" aria-label={s} className={PART_ROW}>
                <span className="text-sm text-textMain" aria-hidden="true">{subjectLabel(s)}</span>
                <Input aria-label="Score" type="number" inputMode="decimal" min="0" step="0.5" value={log.parts[s].score} onChange={setPart(s, 'score')} />
                <Input aria-label="Items" type="number" inputMode="numeric" min="1" max={OUTSIDE_SCORE_LIMITS.maxTotal} step="1" value={log.parts[s].total} onChange={setPart(s, 'total')} />
              </div>
            ))}
            <p className={errors.parts ? 'text-xs text-[var(--accent-danger)]' : 'text-xs text-muted2'}>
              {errors.parts || (sums ? `${sums.score}/${sums.total} in all · ${percent}%. Leave a subject empty if you didn’t sit it.` : 'Leave a subject empty if you didn’t sit it.')}
            </p>
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => { setLog((l) => ({ ...l, byPart: false })); touch('parts'); }}>
              Only have the total?
            </Button>
          </fieldset>
        ) : (
          <div className="flex flex-col gap-2">
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
            {form.subject === 'ALL' && (
              <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => { setLog((l) => ({ ...l, byPart: true })); touch('parts'); }}>
                Enter each subject’s score
              </Button>
            )}
          </div>
        )}

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

        <Disclosure
          title="More details"
          description="Time used, guessed and skipped items, topics to improve"
          defaultOpen={!!moreErrors || (!!start && (start.minutesUsed != null || start.guessed != null || start.skipped != null || (start.improveTopicIds || []).length > 0))}
          variant="inset"
          bodyClassName="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Hours used">
                <Input type="number" inputMode="numeric" min="0" max="15" step="1" value={log.hours} onChange={setLogField('hours', 'minutesUsed')} />
              </FormField>
              <FormField label="Minutes">
                <Input type="number" inputMode="numeric" min="0" max="59" step="1" value={log.minutes} onChange={setLogField('minutes', 'minutesUsed')} />
              </FormField>
            </div>
            {errors.minutesUsed && <p className="text-xs text-[var(--accent-danger)]">{errors.minutesUsed}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Items guessed" error={errors.guessed}>
              <Input type="number" inputMode="numeric" min="0" step="1" value={log.guessed} onChange={setLogField('guessed', 'guessed')} />
            </FormField>
            <FormField label="Items skipped" error={errors.skipped}>
              <Input type="number" inputMode="numeric" min="0" step="1" value={log.skipped} onChange={setLogField('skipped', 'skipped')} />
            </FormField>
          </div>

          <div className="flex flex-col gap-2">
            <FormField
              label="Topics to improve"
              error={errors.improveTopicIds}
              hint={topics === null
                ? 'Loading the syllabus topics…'
                : chosen.length >= OUTSIDE_SCORE_LIMITS.maxTopics
                  ? `That’s ${OUTSIDE_SCORE_LIMITS.maxTopics}, the most one score keeps.`
                  : 'Your study plan drills these sooner for the next six weeks.'}
            >
              <Select
                value=""
                disabled={!topics || chosen.length >= OUTSIDE_SCORE_LIMITS.maxTopics}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  setLog((l) => ({ ...l, topicIds: [...l.topicIds.filter((x) => x !== id), id] }));
                  touch('improveTopicIds');
                }}
              >
                <option value="">Add a topic</option>
                {CANONICAL_SUBJECTS.filter((s) => form.subject === 'ALL' || s === form.subject).map((s) => (
                  <optgroup key={s} label={subjectLabel(s)}>
                    {pickable.filter((t) => t.subject === s && !chosen.includes(t.topicId)).map((t) => (
                      <option key={t.topicId} value={t.topicId}>{t.name}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </FormField>
            {chosen.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Topics to improve">
                {chosen.map((id) => (
                  <li key={id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface2/40 pl-3 pr-1 text-sm text-textMain">
                    {nameOf.get(id)}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${nameOf.get(id)}`}
                      onClick={() => { setLog((l) => ({ ...l, topicIds: l.topicIds.filter((x) => x !== id) })); touch('improveTopicIds'); }}
                    >
                      <X size={14} strokeWidth={1.75} aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Disclosure>

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
