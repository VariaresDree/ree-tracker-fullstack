// src/features/exams/OutsideScoresPanel.jsx
//
// Exams › Past sittings: the scores the learner got OUTSIDE the app — review
// center preboards, book drills, other sites' mocks — next to the app's own
// mock boards. The psychometrician tracker's "Score Tracker" sheet, retests
// included, for the REE board.
//
// Self-reported and display only: shown beside the in-app numbers, never
// mixed into readiness, the forecast or the rankings. The one exception: a
// topic flagged "to improve" is drilled sooner by the study plan.
//
// Each entry is also the CELE tracker's assessment log row: the remark (the
// board verdict, or where one subject stands), the time used against the
// board's pace, the items guessed and skipped, and the topics to improve.
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  VERDICT, flaggedTopics, outsidePace, outsideScorePercent, outsideScoreRemark, outsideScoreSummary, retestDelta, todayManila,
} from '@ree/shared';
import { Card, Panel, Button, Grid, Modal, EmptyState, StatusPill, Sparkline, Skeleton } from '../../components/ui';
import { ClipboardList, Plus, Pencil, Trash2, ShieldAlert, CloudOff, RotateCcw, Calculator, Crosshair } from '../../components/ui/icons';
import { useOutsideScores } from './useOutsideScores';
import OutsideScoreForm from './OutsideScoreForm';
import RatingCalculator from './RatingCalculator';
import { subjectLabel } from './outsideScoreLabels';
import { useSyllabus } from '../syllabus/useSyllabus';
import { drillPreset, launchPractice } from '../active-recall/presets';
import { usePlanCalendar } from '../study-plan/usePlanCalendar';

const fmtPct = (n) => (n == null ? '—' : `${Number.isInteger(n) ? n : n.toFixed(1)}%`);
const fmtPts = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)} pt${Math.abs(n) === 1 ? '' : 's'}`;
const fmtDuration = (min) => (min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : `${min}m`);
// The topic list is read at most this often here (Today's syllabus line does the same).
const SYLLABUS_FRESH_MS = 30 * 60 * 1000;
const FLAG_SUMMARY_DAYS = 60;

const REMARK = {
  [VERDICT.PASSED]: { tone: 'success', label: 'Passed' },
  [VERDICT.CONDITIONAL]: { tone: 'amber', label: 'Conditional pass' },
  [VERDICT.FAILED]: { tone: 'danger', label: 'Not passed' },
  mark: { tone: 'success', label: '70 or more' },
  under: { tone: 'amber', label: 'Under 70' },
  floor: { tone: 'danger', label: 'Under the 50% floor' },
};

/** The CELE log's "Remarks": the board verdict and rating, or where one subject stands. */
function remarkOf(entry) {
  const r = outsideScoreRemark(entry);
  if (!r) return null;
  if (r.kind !== 'verdict') return REMARK[r.kind];
  const shown = REMARK[r.verdict];
  return { ...shown, label: `${shown.label} · rating ${Math.round(r.generalAverage * 100) / 100}` };
}

const daysBefore = (ymd, n) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - n * 86400000).toISOString().slice(0, 10);
};
const fmtDate = (day) => new Date(`${day}T00:00:00+08:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });

function SubjectTile({ s }) {
  return (
    <Card variant="inset" className="p-3.5 flex flex-col gap-1 min-w-0">
      <span className="text-eyebrow">{subjectLabel(s.subject)}</span>
      <span className="text-2xl text-display tabular-nums">{fmtPct(s.average)}</span>
      <span className="text-xs text-muted2">
        {s.count === 0 ? 'No entries' : `${s.count} ${s.count === 1 ? 'entry' : 'entries'} · average`}
      </span>
      {s.points.length > 1 && (
        <div className="flex items-center gap-2 mt-1">
          <Sparkline scores={s.points} width={72} height={22} color="var(--accent-text)" />
          <span className="text-xs tabular-nums text-muted2">{fmtPts(s.change)} since first</span>
        </div>
      )}
    </Card>
  );
}

function TopicChip({ topic, label = topic.name, onDrill }) {
  return (
    <li className="inline-flex items-center gap-1 rounded-full border border-border bg-surface2/40 pl-3 pr-1 text-xs text-textMain">
      <span className="[overflow-wrap:anywhere]">{label}</span>
      <Button type="button" size="sm" variant="ghost" onClick={() => onDrill(topic)} aria-label={`Drill ${topic.name}`}>
        <Crosshair size={13} strokeWidth={1.75} aria-hidden="true" /> Drill
      </Button>
    </li>
  );
}

function EntryRow({ entry, firstTry, topicsById, onDrill, onEdit, onDelete }) {
  const pct = outsideScorePercent(entry);
  const delta = firstTry ? retestDelta(entry, firstTry) : null;
  const remark = remarkOf(entry);
  const pace = outsidePace(entry);
  const details = [
    entry.parts?.length > 0 ? entry.parts.map((p) => `${subjectLabel(p.subject)} ${p.score}/${p.total}`).join(' · ') : null,
    pace ? `${fmtDuration(entry.minutesUsed)}, ${pace.perItem} min an item${pace.boardPerItem != null ? ` (board pace ${pace.boardPerItem})` : ''}` : null,
    entry.guessed != null ? `${entry.guessed} guessed` : null,
    entry.skipped != null ? `${entry.skipped} skipped` : null,
  ].filter(Boolean);
  const topics = (entry.improveTopicIds || []).map((id) => topicsById.get(id)).filter(Boolean);
  // A retest often shares its first try's name: the date tells them apart.
  const name = `${entry.title}, ${fmtDate(entry.takenOn)}`;
  return (
    <li className="rounded-[var(--radius-default)] border border-border bg-surface2/30 p-3.5 flex items-start gap-3">
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <h3 className="text-h3 text-textMain [overflow-wrap:anywhere]">{entry.title}</h3>
        <p className="text-xs text-muted2 [overflow-wrap:anywhere]">
          {fmtDate(entry.takenOn)} · {subjectLabel(entry.subject)}{entry.source ? ` · ${entry.source}` : ''}
        </p>
        {(remark || firstTry) && (
          <div className="flex flex-wrap gap-1.5">
            {remark && <StatusPill tone={remark.tone} dot={false}>{remark.label}</StatusPill>}
            {firstTry && (
              <StatusPill tone={delta > 0 ? 'success' : delta < 0 ? 'danger' : 'neutral'} dot={false}>
                Retest{delta != null ? ` · ${fmtPts(delta)} vs first try` : ''}
              </StatusPill>
            )}
          </div>
        )}
        {details.length > 0 && (
          <p className="text-xs text-muted2 tabular-nums [overflow-wrap:anywhere]">{details.join(' · ')}</p>
        )}
        {topics.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 mt-0.5" aria-label={`Topics to improve after ${entry.title}`}>
            {topics.map((t) => <TopicChip key={t.topicId} topic={t} onDrill={onDrill} />)}
          </ul>
        )}
        {entry.note && <p className="text-xs text-muted line-clamp-2 [overflow-wrap:anywhere]">{entry.note}</p>}
      </div>
      <div className="text-right shrink-0">
        <div className="text-base font-semibold tabular-nums text-textMain">{fmtPct(pct)}</div>
        <div className="text-xs text-muted2 tabular-nums">{entry.score}/{entry.total}</div>
      </div>
      <div className="flex flex-col sm:flex-row gap-1 shrink-0">
        <Button type="button" size="icon" variant="ghost" onClick={() => onEdit(entry)} aria-label={`Edit ${name}`}>
          <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <Button type="button" size="icon" variant="ghost" tone="danger" onClick={() => onDelete(entry)} aria-label={`Delete ${name}`}>
          <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

/**
 * @param {{ inAppAverage?: number|null, inAppCount?: number }} props
 *   the app's own mock boards, for the one-line comparison.
 */
// `extraAction`: another button beside Add score (Past sittings puts "Check a
// paper sheet" there: a scanned self-check lands in this list).
export default function OutsideScoresPanel({ inAppAverage = null, inAppCount = 0, extraAction = null }) {
  const { items, status, queuedCount, add, update, remove, reload } = useOutsideScores();
  // The syllabus topics name the "to improve" chips and feed the form's picker.
  const { topics } = useSyllabus({ fetchIfOlderThanMs: SYLLABUS_FRESH_MS });
  const navigate = useNavigate();
  // `?log=<key date id>` (Today's "Log your preboard score") opens the form
  // filled in from that preboard, once.
  const [searchParams, setSearchParams] = useSearchParams();
  const logId = searchParams.get('log');
  const calendar = usePlanCalendar({ fetchIfOlderThanMs: SYLLABUS_FRESH_MS });
  const [handledLog, setHandledLog] = useState(null);
  const logDate = logId && handledLog !== logId ? (calendar.items || []).find((e) => e.id === logId) || null : null;
  const closeLog = () => {
    setHandledLog(logId);
    setSearchParams((params) => { params.delete('log'); return params; }, { replace: true });
  };
  // `key` makes each opening a fresh form, starting from the entry being edited.
  const [form, setForm] = useState({ open: false, entry: null, prefill: null, key: 0 });
  const [confirm, setConfirm] = useState(null);
  // Mounted per opening, so the calculator starts empty each time.
  const [calc, setCalc] = useState({ open: false, key: 0 });

  const openForm = (entry = null, prefill = null) => setForm((f) => ({ open: true, entry, prefill, key: f.key + 1 }));
  const drill = (t) => launchPractice(navigate, drillPreset({ topicId: t.topicId, topic: t.name, subject: t.subject }));
  const closeForm = () => setForm((f) => ({ ...f, open: false }));

  const explain = (err, action) => toast.error(err?.message ? `Couldn’t ${action}: ${err.message}` : `Couldn’t ${action}. Try again.`);
  const saved = (result) => {
    if (result !== 'queued') return;
    toast(navigator.onLine
      ? 'Saved. It syncs in a moment, after your earlier changes.'
      : 'Saved on this device. It syncs when you’re back online.');
  };

  const save = async (payload) => {
    try {
      saved(form.entry ? await update(form.entry.id, payload) : await add(payload));
    } catch (err) {
      explain(err, 'save the score');
      throw err; // keep the form open
    }
  };

  const confirmDelete = async () => {
    const entry = confirm;
    setConfirm(null);
    try {
      saved(await remove(entry.id));
    } catch (err) {
      explain(err, 'delete the score');
    }
  };

  const list = items || [];
  const byId = new Map(list.map((e) => [e.id, e]));
  const summary = outsideScoreSummary(list);
  const usedSubjects = summary.subjects.filter((s) => s.count > 0);
  const topicsById = new Map((topics || []).map((t) => [t.topicId, t]));
  const flaggedMost = flaggedTopics(list, daysBefore(todayManila(), FLAG_SUMMARY_DAYS))
    .map((f) => ({ topic: topicsById.get(f.topicId), count: f.count }))
    .filter((f) => f.topic)
    .slice(0, 3);

  return (
    <Panel
      icon={ClipboardList}
      eyebrow="Self-reported"
      title="Outside scores"
      action={
        <>
          {extraAction}
          <Button size="sm" onClick={() => openForm()}>
            <Plus size={14} strokeWidth={2} aria-hidden="true" /> Add score
          </Button>
        </>
      }
      bodyClassName="flex flex-col gap-4"
    >
      <p className="text-xs text-muted2 leading-relaxed">
        Review-center preboards, book drills and other mocks. These are yours to track: they don’t count toward your readiness, forecast or rankings.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-xs text-muted2 leading-relaxed min-w-0 flex-1 basis-56">
          Got a preboard’s three scores? Rate them the PRC way, or see what the subject you haven’t sat needs.
        </p>
        <Button size="sm" variant="secondary" onClick={() => setCalc((c) => ({ open: true, key: c.key + 1 }))}>
          <Calculator size={14} strokeWidth={1.75} aria-hidden="true" /> Rating calculator
        </Button>
      </div>

      {(queuedCount > 0 || status === 'offline' || status === 'unreachable' || (status === 'error' && list.length > 0)) && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted2">
          <CloudOff size={14} strokeWidth={1.75} aria-hidden="true" />
          {queuedCount > 0
            ? `${queuedCount} change${queuedCount === 1 ? '' : 's'} saved on this device, waiting to sync.`
            : status === 'offline'
              ? 'Offline. Showing the scores saved on this device.'
              : status === 'unreachable'
                ? 'Couldn’t reach the server. Showing the scores saved on this device.'
                : 'Couldn’t refresh. Showing the scores saved on this device.'}
        </p>
      )}

      {status === 'error' && list.length === 0 ? (
        <EmptyState
          compact
          icon={ClipboardList}
          title="Couldn’t load your outside scores"
          description="The server turned the request down. Try again in a moment."
          action={<Button size="sm" variant="secondary" onClick={() => reload()}><RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" /> Try again</Button>}
        />
      ) : items === null ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          compact
          icon={ClipboardList}
          title="No outside scores yet"
          description="Log your review center’s preboards and drills to see them next to your mock boards here, with your retests."
          action={<Button size="sm" variant="secondary" onClick={() => openForm()}>Add your first score</Button>}
        />
      ) : (
        <>
          <p className="text-sm text-muted2">
            Outside average <strong className="text-textMain tabular-nums">{fmtPct(summary.overall.average)}</strong>
            {' '}({summary.overall.count})
            {inAppCount > 0 && (
              <>
                {' · '}In-app mock average <strong className="text-textMain tabular-nums">{fmtPct(inAppAverage)}</strong> ({inAppCount})
              </>
            )}
          </p>

          <Grid kind="kpi" gap="sm">
            {usedSubjects.map((s) => <SubjectTile key={s.subject} s={s} />)}
          </Grid>

          {flaggedMost.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <h3 className="text-eyebrow">Topics you flag most, last {FLAG_SUMMARY_DAYS} days</h3>
              <ul className="flex flex-wrap gap-1.5" aria-label="Topics you flag most">
                {flaggedMost.map(({ topic, count }) => (
                  <TopicChip key={topic.topicId} topic={topic} label={`${topic.name} (${count})`} onDrill={drill} />
                ))}
              </ul>
            </div>
          )}

          <ul className="flex flex-col gap-2" aria-label="Outside scores, newest first">
            {list.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                firstTry={entry.retestOfId ? byId.get(entry.retestOfId) : null}
                topicsById={topicsById}
                onDrill={drill}
                onEdit={openForm}
                onDelete={setConfirm}
              />
            ))}
          </ul>
        </>
      )}

      {form.open && (
        <OutsideScoreForm
          key={form.key}
          open={form.open}
          entry={form.entry}
          prefill={form.prefill}
          entries={list}
          topics={topics}
          onClose={closeForm}
          onSave={save}
        />
      )}

      {logDate && !form.open && (
        <OutsideScoreForm
          key={`log-${logDate.id}`}
          open
          prefill={{
            title: logDate.title,
            takenOn: logDate.startsOn < todayManila() ? logDate.startsOn : todayManila(),
            subject: logDate.subject || 'ALL',
          }}
          entries={list}
          topics={topics}
          onClose={closeLog}
          onSave={async (payload) => {
            try {
              saved(await add(payload));
            } catch (err) {
              explain(err, 'save the score');
              throw err;
            }
          }}
        />
      )}

      {calc.open && (
        <RatingCalculator
          key={calc.key}
          open={calc.open}
          onClose={() => setCalc((c) => ({ ...c, open: false }))}
          onSaveAsScore={(parts) => {
            setCalc((c) => ({ ...c, open: false }));
            openForm(null, { subject: 'ALL', parts });
          }}
        />
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete this score?"
        icon={ShieldAlert}
        tone="danger"
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button type="button" variant="danger" size="sm" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-muted2 leading-relaxed">
          Delete <strong className="text-textMain">{confirm?.title}</strong>?
          {confirm && list.some((e) => e.retestOfId === confirm.id) ? ' Its retests stay, as ordinary entries.' : ''}
        </p>
      </Modal>
    </Panel>
  );
}
