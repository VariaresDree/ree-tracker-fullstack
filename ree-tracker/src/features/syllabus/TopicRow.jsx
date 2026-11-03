// src/features/syllabus/TopicRow.jsx
//
// One topic in the tracker. Closed, a row of figures: board items, subtopics
// done, Read / Watched / Drilled, mastery and accuracy, stacking under the name
// on a phone. Open, the table of contents and everything else about the topic.
// It held all of that open for every topic, which made a 3,900px page.
import { memo, useId, useState } from 'react';
import toast from 'react-hot-toast';
import { SYLLABUS_NOTE_MAX, isTopicCovered, isTopicDrilled, todayManila } from '@ree/shared';
import { boardItemsFor } from '@ree/shared/boardItems';
import { subtopicProgress } from '@ree/shared/subtopics';
import { Button, FormField, Input, ProgressIndicator, Select, StatusPill, Textarea, cn } from '../../components/ui';
import { Check, ChevronDown, Crosshair, Plus } from '../../components/ui/icons';
import { CONFIDENCE_OPTIONS, DREAD_OPTIONS } from './selfRating';
import TopicContents from './TopicContents';
import { accuracyOf, bandOf, isWeak } from './trackerModel';

// The same columns under the header and in each row, from 42rem of room.
export const ROW_COLUMNS = '@2xl:grid-cols-[minmax(0,1fr)_3.5rem_8.5rem_4.5rem_6rem_4.5rem_1rem]';

// Mastery's own colours, as on Progress › Topics.
const BAND_TEXT = { mastered: 'text-reeGreen-text', proficient: 'text-reeCyan-text', developing: 'text-reeAmber-text', novice: 'text-reeRed-text' };

// A toggle chip: one tick on the checklist.
function Tick({ pressed, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      aria-pressed={!!pressed}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-full border text-sm font-medium transition-colors',
        pressed
          ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] border-[color-mix(in_srgb,var(--accent)_45%,transparent)] text-[var(--accent-text)]'
          : 'border-border text-muted2 hover:text-textMain hover:bg-surface2',
        disabled && 'cursor-default',
      )}
    >
      {pressed ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : <Plus size={14} strokeWidth={2} aria-hidden="true" />}
      {children}
    </button>
  );
}

function TopicDetails({ id, row, onSave }) {
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
    <form id={id} onSubmit={save} noValidate className="flex flex-col gap-3 border-t border-border pt-3">
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
        <Button type="submit" size="sm" loading={saving}>Save dates and note</Button>
      </div>
    </form>
  );
}

function CheckDots({ row }) {
  const marks = [['R', 'read', row.read], ['W', 'watched', row.watched], ['D', 'drilled', isTopicDrilled(row)]];
  const words = marks.map(([, word, on]) => (on ? word : `not ${word}`)).join(', ');
  return (
    <span role="img" aria-label={words} title={words} className="inline-flex gap-1">
      {marks.map(([letter, , on]) => (
        <span
          key={letter}
          aria-hidden="true"
          className={cn(
            'inline-flex items-center justify-center size-5 rounded-full border text-[0.625rem] font-semibold',
            on ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] border-[color-mix(in_srgb,var(--accent)_45%,transparent)] text-[var(--accent-text)]' : 'border-border text-muted',
          )}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}

const TopicRow = memo(function TopicRow({ row, rows, ready, status, open, onToggle, actions, onSave, onDrill }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();
  const panelId = useId();
  // A tick has no form to show a field error in, so it gets a toast. (A
  // refused request was already toasted by onSave.)
  const tick = (field) => onSave(row.topicId, { [field]: !row[field] }).catch((err) => {
    if (err?.fields) toast.error(err.message);
  });
  const answers = `${row.attempts} ${row.attempts === 1 ? 'answer' : 'answers'}`;
  const rate = (field, value) => onSave(row.topicId, { [field]: value === '' ? null : Number(value) }).catch((err) => {
    if (err?.fields) toast.error(err.message);
  });
  const finished = () => {
    if (!row.read) tick('read');
  };

  const board = boardItemsFor(row.subject, row.name);
  const shared = board && board.sharedWith.length > 0;
  const progress = subtopicProgress(rows);
  const band = bandOf(row);
  const accuracy = accuracyOf(row);
  const weak = isWeak(row);

  return (
    <li className="rounded-[var(--radius-default)] border border-border bg-surface2/30">
      <div className={cn('relative grid grid-cols-[minmax(0,1fr)_1rem] gap-x-3 gap-y-2 items-center p-3.5 hover:bg-surface2/50 rounded-[var(--radius-default)]', ROW_COLUMNS)}>
        <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="min-w-0 text-sm font-semibold text-textMain [overflow-wrap:anywhere]">
            {/* The whole row is the target (the ::after), but only the name is the
                button's name, so a screen reader hears the topic and then its figures. */}
            <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => onToggle(row.topicId)} className="text-left cursor-pointer after:absolute after:inset-0 after:content-['']">
              {row.name}
            </button>
          </h3>
          {row.highYield && <StatusPill tone="velocity" dot={false}>High-yield</StatusPill>}
          {isTopicCovered(row) && <StatusPill tone="success" dot={false}>Covered</StatusPill>}
        </div>
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" className={cn('text-muted transition-[rotate] motion-reduce:transition-none @2xl:order-last', open && 'rotate-180')} />
        <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted2 @2xl:contents">
          <span className="tabular-nums">
            {board ? board.items : '—'}
            {board && shared && <span className="@2xl:sr-only"> shared</span>}
            {board && shared && <span aria-hidden="true" className="hidden @2xl:inline">*</span>}
            <span className="@2xl:sr-only"> {board ? 'board items' : 'not itemized by PRC'}</span>
          </span>
          <span className="flex items-center gap-2 min-w-32 flex-1 @2xl:flex-none">
            {ready && progress.total > 0 ? (
              <>
                <ProgressIndicator value={progress.done} max={progress.total} size="sm" tone={progress.done === progress.total ? 'success' : 'velocity'} ariaLabel={`${row.name}: ${progress.done} of ${progress.total} subtopics`} />
                <span className="tabular-nums shrink-0">{progress.done}/{progress.total}</span>
              </>
            ) : <span>—<span className="sr-only"> no subtopics</span></span>}
          </span>
          <CheckDots row={row} />
          <span>
            {weak
              ? <StatusPill tone="danger" dot={false}>Weak</StatusPill>
              : band
                ? <span className={cn('font-medium', BAND_TEXT[band.key])}>{band.label}</span>
                : <span>—<span className="sr-only"> no mastery yet</span></span>}
          </span>
          <span className="tabular-nums">
            {accuracy == null ? '—' : `${accuracy}%`}<span className="@2xl:sr-only"> accuracy</span>
          </span>
        </div>
      </div>

      <div id={panelId} hidden={!open}>
        {open && (
          <div className="flex flex-col gap-4 p-3.5 pt-3 border-t border-border">
            {board && (
              <p className="text-xs text-muted2">
                {board.items} of the board’s 100 {row.subject === 'Mathematics' ? 'Math' : row.subject} items
                {shared ? `, shared with ${board.sharedWith.join(' and ')}.` : '.'}
              </p>
            )}
            <TopicContents topicId={row.topicId} name={row.name} rows={rows} ready={ready} status={status} actions={actions} onFinished={finished} />
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3" role="group" aria-label={`${row.name}: checklist`}>
              <Tick pressed={row.read} onClick={() => tick('read')}>Read</Tick>
              <Tick pressed={row.watched} onClick={() => tick('watched')}>Watched</Tick>
              {row.autoDrilled ? (
                <Tick pressed disabled title="Ticked from your answers in this topic">Drilled · {answers}</Tick>
              ) : (
                <Tick pressed={row.drilled} onClick={() => tick('drilled')}>
                  Drilled{row.attempts > 0 ? ` · ${answers}` : ''}
                </Tick>
              )}
            </div>
            {/* Your own rating (the CELE "Meta topics"): saved as you pick. */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="How sure">
                <Select value={row.confidence == null ? '' : String(row.confidence)} onChange={(e) => rate('confidence', e.target.value)}>
                  {CONFIDENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Dread">
                <Select value={row.dread == null ? '' : String(row.dread)} onChange={(e) => rate('dread', e.target.value)}>
                  {DREAD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </FormField>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => onDrill(row)}>
                <Crosshair size={14} strokeWidth={1.75} aria-hidden="true" /> Drill this topic
              </Button>
              <button
                type="button"
                aria-expanded={detailsOpen}
                aria-controls={detailsId}
                onClick={() => setDetailsOpen((o) => !o)}
                className="inline-flex items-center gap-1 min-h-11 px-2 rounded-md text-xs text-muted2 hover:text-textMain cursor-pointer"
              >
                Dates and note
                <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" className={cn('transition-transform', detailsOpen && 'rotate-180')} />
              </button>
            </div>
            {/* Keyed on the saved values: when they change underneath an open form
                (a refetch, another device), the form starts again from them
                instead of saving a stale copy back over them. */}
            {detailsOpen && (
              <TopicDetails
                key={`${row.startedOn}|${row.finishedOn}|${row.note}`}
                id={detailsId}
                row={row}
                onSave={onSave}
              />
            )}
          </div>
        )}
      </div>
    </li>
  );
});

export default TopicRow;
