// src/features/syllabus/SyllabusTab.jsx
//
// Progress › Syllabus: the board's topic list as a checklist. Per topic, has
// the learner read it, watched a lecture on it, drilled it? Drilled ticks
// itself from their answers. Coverage per subject and overall (weighted the
// way the board weighs the subjects), and a pace line against the exam date.
// The psychometrician tracker's Tracker + TOS Summary sheets, for the REE
// board, on the app's own topics.
//
// Display only: none of this feeds readiness, the forecast or the rankings.
import { memo, useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SYLLABUS_NOTE_MAX, SYLLABUS_SUBJECTS, isTopicCovered, syllabusCoverage, todayManila } from '@ree/shared';
import {
  Panel, Button, SegmentedControl, ProgressIndicator, StatusPill, EmptyState, Skeleton, FormField, Input, Textarea, cn,
} from '../../components/ui';
import { ListChecks, BookOpen, CloudOff, RotateCcw, ChevronDown, Crosshair, Check, Plus } from '../../components/ui/icons';
import { useSyllabus } from './useSyllabus';
import { daysToExam } from '../today/todayActions';
import { drillPreset, launchPractice } from '../active-recall/presets';
import { paceLine } from './syllabusPace';

const SUBJECT_LABEL = { Mathematics: 'Math', ESAS: 'ESAS', EE: 'EE' };
const fmtPct = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

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

function TopicDetails({ id, row, onSave, onDrill }) {
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => onDrill(row)}>
          <Crosshair size={14} strokeWidth={1.75} aria-hidden="true" /> Drill this topic
        </Button>
        <Button type="submit" size="sm" loading={saving}>Save dates and note</Button>
      </div>
    </form>
  );
}

const TopicRow = memo(function TopicRow({ row, onSave, onDrill }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  // A tick has no form to show a field error in, so it gets a toast. (A
  // refused request was already toasted by onSave.)
  const tick = (field) => onSave(row.topicId, { [field]: !row[field] }).catch((err) => {
    if (err?.fields) toast.error(err.message);
  });
  const answers = `${row.attempts} ${row.attempts === 1 ? 'answer' : 'answers'}`;

  return (
    <li className="rounded-xl border border-border bg-surface2/30 p-3.5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-textMain break-words">{row.name}</h3>
        {isTopicCovered(row) && <StatusPill tone="success" dot={false}>Covered</StatusPill>}
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`${row.name}: checklist`}>
        <Tick pressed={row.read} onClick={() => tick('read')}>Read</Tick>
        <Tick pressed={row.watched} onClick={() => tick('watched')}>Watched</Tick>
        {row.autoDrilled ? (
          <Tick pressed disabled title="Ticked from your answers in this topic">Drilled · {answers}</Tick>
        ) : (
          <Tick pressed={row.drilled} onClick={() => tick('drilled')}>
            Drilled{row.attempts > 0 ? ` · ${answers}` : ''}
          </Tick>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((o) => !o)}
          className="ml-auto inline-flex items-center gap-1 min-h-11 px-2 rounded-md text-xs text-muted2 hover:text-textMain"
        >
          Dates and note
          <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {/* Keyed on the saved values: when they change underneath an open form
          (a refetch, another device), the form starts again from them
          instead of saving a stale copy back over them. */}
      {open && (
        <TopicDetails
          key={`${row.startedOn}|${row.finishedOn}|${row.note}`}
          id={detailsId}
          row={row}
          onSave={onSave}
          onDrill={onDrill}
        />
      )}
    </li>
  );
});

function StatusLine({ status, queuedCount, hasTopics }) {
  let text = null;
  if (queuedCount > 0) text = `${queuedCount} ${queuedCount === 1 ? 'topic' : 'topics'} saved on this device, waiting to sync.`;
  else if (status === 'offline') text = 'Offline. Showing the checklist saved on this device.';
  else if (status === 'unreachable') text = 'Couldn’t reach the server. Showing the checklist saved on this device.';
  else if (status === 'error' && hasTopics) text = 'Couldn’t refresh. Showing the checklist saved on this device.';
  if (!text) return null;
  return (
    <p role="status" className="flex items-center gap-2 text-xs text-muted2">
      <CloudOff size={14} strokeWidth={1.75} aria-hidden="true" /> {text}
    </p>
  );
}

/** @param {{ examDate?: string|null }} props */
export default function SyllabusTab({ examDate = null }) {
  const navigate = useNavigate();
  const { topics, weights, status, queuedCount, saveTopic, reload } = useSyllabus();
  const [subject, setSubject] = useState('Mathematics');

  // Rows are memoised, so they get a callback that never changes identity.
  // The ref is refreshed in a LAYOUT effect, during the commit: a passive
  // effect runs after paint, and a tick in between used the previous render's
  // saveTopic (which may not know the topic yet) and failed silently.
  const saveRef = useRef(saveTopic);
  useLayoutEffect(() => { saveRef.current = saveTopic; }, [saveTopic]);
  const onSave = useCallback(async (topicId, patch) => {
    try {
      return await saveRef.current(topicId, patch);
    } catch (err) {
      if (!err?.fields) toast.error(err?.message ? `Couldn’t save: ${err.message}` : 'Couldn’t save. Try again.');
      throw err;
    }
  }, []);
  const onDrill = useCallback((row) => {
    launchPractice(navigate, drillPreset({ topicId: row.topicId, topic: row.name, subject: row.subject }));
  }, [navigate]);

  const coverage = useMemo(() => syllabusCoverage(topics || [], weights || undefined), [topics, weights]);
  const visible = useMemo(() => (topics || []).filter((t) => t.subject === subject), [topics, subject]);

  if (!topics && status === 'error') {
    return (
      <EmptyState
        icon={ListChecks}
        title="Couldn’t load your syllabus checklist"
        description="The server turned the request down. Try again in a moment."
        action={<Button size="sm" variant="secondary" onClick={() => reload()}><RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" /> Try again</Button>}
      />
    );
  }
  if (!topics && (status === 'offline' || status === 'unreachable')) {
    return (
      <EmptyState
        icon={CloudOff}
        title={status === 'offline' ? 'You’re offline' : 'Couldn’t reach the server'}
        description="The checklist loads once over a connection; after that it works offline."
        action={<Button size="sm" variant="secondary" onClick={() => reload()}><RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" /> Try again</Button>}
      />
    );
  }
  if (!topics) {
    return (
      <div role="status" aria-live="polite" className="flex flex-col gap-4">
        <span className="sr-only">Loading the syllabus…</span>
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (topics.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No syllabus topics yet"
        description="The topic list comes from the board’s table of specifications, and none is set up yet."
      />
    );
  }

  const { overall } = coverage;
  const pace = paceLine(overall.total - overall.covered, daysToExam(examDate));
  // Shares of the exam, from the weights as stored (fractions or percents).
  const weightSum = coverage.subjects.reduce((s, x) => s + (x.weight > 0 ? x.weight : 0), 0);
  const share = (w) => (weightSum > 0 ? Math.round((w / weightSum) * 100) : 0);

  return (
    <div className="flex flex-col gap-6">
      <Panel icon={ListChecks} eyebrow="Checklist" title="Syllabus coverage" bodyClassName="flex flex-col gap-4">
        <StatusLine status={status} queuedCount={queuedCount} hasTopics />
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-4xl text-display tabular-nums text-textMain">{fmtPct(overall.percent)}</span>
          <span className="text-sm text-muted2">covered · {overall.covered} of {overall.total} topics</span>
        </div>
        {pace && <p className="text-sm text-muted2">{pace}</p>}
        <ul className="flex flex-col gap-3">
          {coverage.subjects.filter((s) => s.total > 0).map((s) => (
            <li key={s.subject} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-textMain font-medium">
                  {s.subject}
                  <span className="text-muted2 font-normal"> · {share(s.weight)}% of the exam</span>
                </span>
                <span className="tabular-nums text-muted2 shrink-0">{s.covered} of {s.total}</span>
              </div>
              <ProgressIndicator value={s.covered} max={s.total} size="sm" ariaLabel={`${s.subject}: ${s.covered} of ${s.total} topics covered`} />
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted2 leading-relaxed">
          A topic counts as covered once you’ve read it and drilled it. Drilled ticks itself after 20 answers in the topic, or 10 at Developing mastery or better. Watched is for your own tracking. None of this changes your readiness, forecast or rankings.
        </p>
      </Panel>

      <Panel icon={BookOpen} eyebrow="By subject" title="Topics" bodyClassName="flex flex-col gap-4">
        <SegmentedControl
          label="Subject"
          options={SYLLABUS_SUBJECTS.map((s) => {
            const c = coverage.subjects.find((x) => x.subject === s);
            return { value: s, label: SUBJECT_LABEL[s], hint: `${c.covered}/${c.total} covered` };
          })}
          value={subject}
          onChange={setSubject}
          fullWidth
        />
        {visible.length === 0 ? (
          <p className="text-sm text-muted2">No topics in this subject yet.</p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label={`${subject} topics`}>
            {visible.map((row) => <TopicRow key={row.topicId} row={row} onSave={onSave} onDrill={onDrill} />)}
          </ul>
        )}
      </Panel>
    </div>
  );
}
