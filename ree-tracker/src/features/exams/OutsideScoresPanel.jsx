// src/features/exams/OutsideScoresPanel.jsx
//
// Exams › Past sittings: the scores the learner got OUTSIDE the app — review
// center preboards, book drills, other sites' mocks — next to the app's own
// mock boards. The psychometrician tracker's "Score Tracker" sheet, retests
// included, for the REE board.
//
// Self-reported and display only: shown beside the in-app numbers, never
// mixed into readiness, the forecast or the rankings.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { outsideScorePercent, outsideScoreSummary, retestDelta } from '@ree/shared';
import { Panel, Button, Modal, EmptyState, StatusPill, Sparkline, Skeleton } from '../../components/ui';
import { ClipboardList, Plus, Pencil, Trash2, ShieldAlert, CloudOff, RotateCcw } from '../../components/ui/icons';
import { useOutsideScores } from './useOutsideScores';
import OutsideScoreForm from './OutsideScoreForm';
import { subjectLabel } from './outsideScoreLabels';

const fmtPct = (n) => (n == null ? '—' : `${Number.isInteger(n) ? n : n.toFixed(1)}%`);
const fmtPts = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)} pt${Math.abs(n) === 1 ? '' : 's'}`;
const fmtDate = (day) => new Date(`${day}T00:00:00+08:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });

function SubjectTile({ s }) {
  return (
    <div className="rounded-xl border border-border bg-surface2/30 p-3.5 flex flex-col gap-1 min-w-0">
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
    </div>
  );
}

function EntryRow({ entry, firstTry, onEdit, onDelete }) {
  const pct = outsideScorePercent(entry);
  const delta = firstTry ? retestDelta(entry, firstTry) : null;
  // A retest often shares its first try's name: the date tells them apart.
  const name = `${entry.title}, ${fmtDate(entry.takenOn)}`;
  return (
    <li className="rounded-xl border border-border bg-surface2/30 p-3.5 flex items-start gap-3">
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-textMain break-words">{entry.title}</h3>
        <p className="text-xs text-muted2">
          {fmtDate(entry.takenOn)} · {subjectLabel(entry.subject)}{entry.source ? ` · ${entry.source}` : ''}
        </p>
        {firstTry && (
          <div>
            <StatusPill tone={delta > 0 ? 'success' : delta < 0 ? 'danger' : 'neutral'} dot={false}>
              Retest{delta != null ? ` · ${fmtPts(delta)} vs first try` : ''}
            </StatusPill>
          </div>
        )}
        {entry.note && <p className="text-xs text-muted line-clamp-2 break-words">{entry.note}</p>}
      </div>
      <div className="text-right shrink-0">
        <div className="text-base font-semibold tabular-nums text-textMain">{fmtPct(pct)}</div>
        <div className="text-xs text-muted2 tabular-nums">{entry.score}/{entry.total}</div>
      </div>
      <div className="flex flex-col sm:flex-row gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onEdit(entry)}
          aria-label={`Edit ${name}`}
          className="touch-target inline-flex items-center justify-center p-1.5 rounded-md text-muted hover:text-textMain hover:bg-surface2 transition-colors"
        >
          <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(entry)}
          aria-label={`Delete ${name}`}
          className="touch-target inline-flex items-center justify-center p-1.5 rounded-md text-muted hover:text-[var(--accent-danger)] hover:bg-[color-mix(in_srgb,var(--accent-danger)_10%,transparent)] transition-colors"
        >
          <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

/**
 * @param {{ inAppAverage?: number|null, inAppCount?: number }} props
 *   the app's own mock boards, for the one-line comparison.
 */
export default function OutsideScoresPanel({ inAppAverage = null, inAppCount = 0 }) {
  const { items, status, queuedCount, add, update, remove, reload } = useOutsideScores();
  // `key` makes each opening a fresh form, starting from the entry being edited.
  const [form, setForm] = useState({ open: false, entry: null, key: 0 });
  const [confirm, setConfirm] = useState(null);

  const openForm = (entry = null) => setForm((f) => ({ open: true, entry, key: f.key + 1 }));
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

  return (
    <Panel
      icon={ClipboardList}
      eyebrow="Self-reported"
      title="Outside scores"
      action={
        <Button size="sm" onClick={() => openForm()}>
          <Plus size={14} strokeWidth={2} aria-hidden="true" /> Add score
        </Button>
      }
      bodyClassName="flex flex-col gap-4"
    >
      <p className="text-xs text-muted2 leading-relaxed">
        Review-center preboards, book drills and other mocks. These are yours to track: they don’t count toward your readiness, forecast or rankings.
      </p>

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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {usedSubjects.map((s) => <SubjectTile key={s.subject} s={s} />)}
          </div>

          <ul className="flex flex-col gap-2" aria-label="Outside scores, newest first">
            {list.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                firstTry={entry.retestOfId ? byId.get(entry.retestOfId) : null}
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
          entries={list}
          onClose={closeForm}
          onSave={save}
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
