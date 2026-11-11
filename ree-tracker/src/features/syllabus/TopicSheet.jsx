// src/features/syllabus/TopicSheet.jsx
//
// Everything about one topic, over the list: its subtopics, Read / Watched /
// Drilled, the learner's own ratings, dates and a note, and a drill. SyllabusTab
// keeps which topic is open in ?topic=, so Back closes it and the list keeps its
// place. Ticks and ratings save as they're tapped; dates and the note have a Save.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { SYLLABUS_NOTE_MAX, todayManila } from '@ree/shared';
import { subtopicProgress } from '@ree/shared/subtopics';
import { Button, FormField, Input, Modal, Ring, Textarea, cn } from '../../components/ui';
import { ScaleSlider } from '../../components/ui/ScaleSlider';
import { BookOpen, Crosshair, Play } from '../../components/ui/icons';
import { CONFIDENCE_SCALE, DREAD_SCALE } from './selfRating';
import TopicContents from './TopicContents';
import { accuracyOf, bandOf } from './trackerModel';

// Mastery's own colours, as on Progress › Topics.
const BAND_TEXT = { mastered: 'text-reeGreen-text', proficient: 'text-reeCyan-text', developing: 'text-reeAmber-text', novice: 'text-reeRed-text' };

function Toggle({ icon: Icon, pressed, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      aria-pressed={!!pressed}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={cn(
        'flex flex-col items-center justify-center gap-1 min-h-16 min-w-0 p-2 rounded-[var(--radius-default)] border text-sm font-medium text-center transition-colors',
        pressed
          ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] border-[color-mix(in_srgb,var(--accent)_45%,transparent)] text-[var(--accent-text)]'
          : 'border-border text-muted2 hover:text-textMain hover:bg-surface2',
        disabled ? 'cursor-default' : 'cursor-pointer',
      )}
    >
      <Icon size={20} strokeWidth={pressed ? 2.25 : 1.5} aria-hidden="true" />
      {children}
    </button>
  );
}

function TopicDetails({ row, onSave }) {
  const [draft, setDraft] = useState({ startedOn: row.startedOn || '', finishedOn: row.finishedOn || '', note: row.note || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setDraft((d) => ({ ...d, [field]: e.target.value }));
  const today = todayManila();

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(row.topicId, { startedOn: draft.startedOn || null, finishedOn: draft.finishedOn || null, note: draft.note.trim() || null });
      setErrors({});
    } catch (err) {
      setErrors(err?.fields || {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Started" error={errors.startedOn}>
          <Input type="date" value={draft.startedOn} max={today} onChange={set('startedOn')} />
        </FormField>
        <FormField label="Finished" error={errors.finishedOn}>
          <Input type="date" value={draft.finishedOn} max={today} onChange={set('finishedOn')} />
        </FormField>
      </div>
      <FormField label="Note" error={errors.note} hint={`${draft.note.length}/${SYLLABUS_NOTE_MAX}. Pages, formulas, what to revisit.`}>
        <Textarea rows={2} value={draft.note} onChange={set('note')} maxLength={SYLLABUS_NOTE_MAX} />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" size="sm" variant="secondary" loading={saving}>Save dates and note</Button>
      </div>
    </form>
  );
}

function Figure({ label, className, children }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted2">{label}</span>
      <span className={cn('text-base font-semibold tabular-nums', className || 'text-textMain')}>{children}</span>
    </div>
  );
}

export default function TopicSheet({ row, rows, ready, status, actions, onSave, onDrill, onDrillSubtopic, onClose }) {
  const { done, total } = subtopicProgress(rows);
  const hasList = ready && total > 0;
  const band = bandOf(row);
  const accuracy = accuracyOf(row);
  const answers = `${row.attempts} ${row.attempts === 1 ? 'answer' : 'answers'}`;

  // A tick has no form to show a field error in, so it gets a toast. (A refused
  // request was already toasted by onSave.)
  const patch = (fields) => onSave(row.topicId, fields).catch((err) => {
    if (err?.fields) toast.error(err.message);
  });
  const tick = (field) => patch({ [field]: !row[field] });
  const finished = () => {
    if (!row.read) tick('read');
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={row.name}
      footer={(
        <Button onClick={() => onDrill(row)}>
          <Crosshair size={16} strokeWidth={1.75} aria-hidden="true" /> Drill this topic
        </Button>
      )}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Ring size={72} stroke={7} percent={hasList ? (done / total) * 100 : 0} done={hasList && done === total} label={`${row.name}: subtopics done`}>
            {hasList ? `${done}/${total}` : '—'}
          </Ring>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <Figure label="Mastery" className={band ? BAND_TEXT[band.key] : undefined}>{band ? band.label : '—'}</Figure>
            <Figure label="Accuracy">{accuracy == null ? '—' : `${accuracy}%`}</Figure>
          </div>
        </div>

        <div role="group" aria-label={`${row.name}: checklist`} className="grid grid-cols-3 gap-2">
          <Toggle icon={BookOpen} pressed={row.read} onClick={() => tick('read')}>Read</Toggle>
          <Toggle icon={Play} pressed={row.watched} onClick={() => tick('watched')}>Watched</Toggle>
          {row.autoDrilled ? (
            <Toggle icon={Crosshair} pressed disabled title="Ticked from your answers in this topic">Drilled · {answers}</Toggle>
          ) : (
            <Toggle icon={Crosshair} pressed={row.drilled} onClick={() => tick('drilled')}>
              Drilled{row.attempts > 0 ? ` · ${answers}` : ''}
            </Toggle>
          )}
        </div>

        <TopicContents topicId={row.topicId} name={row.name} rows={rows} ready={ready} status={status} actions={actions} onFinished={finished}
          onDrillSubtopic={onDrillSubtopic ? (sub) => onDrillSubtopic(row, sub) : undefined} />

        {/* Your own rating (the CELE "Meta topics"): saved as you let go. Two scales,
            because being sure of a topic and dreading it aren't opposites. */}
        <div className="flex flex-col gap-4">
          <ScaleSlider {...CONFIDENCE_SCALE} value={row.confidence ?? null} onCommit={(confidence) => patch({ confidence })} />
          <ScaleSlider {...DREAD_SCALE} value={row.dread ?? null} onCommit={(dread) => patch({ dread })} />
          <p className="text-xs text-muted2">Just for you. Neither changes your readiness or rankings.</p>
        </div>

        {/* Keyed on the saved values: when they change underneath an open form (a
            refetch, another device), the form starts again from them instead of
            saving a stale copy back over them. */}
        <TopicDetails key={`${row.startedOn}|${row.finishedOn}|${row.note}`} row={row} onSave={onSave} />
      </div>
    </Modal>
  );
}
