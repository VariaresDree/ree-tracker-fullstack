// src/features/sets/SetsPanel.jsx
//
// Progress › Syllabus › Sets: the papers the learner means to get through —
// past boards by date, a review center's numbered sets, book drills —
// grouped, ticked off, and each done set linked to the outside score it was
// logged as. The CELE tracker's "Progress check" sheet, for the REE board.
// Display only, like outside scores.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { outsideScorePercent, setCollections, todayManila } from '@ree/shared';
import { Button, Card, CardTitle, Disclosure, EmptyState, Modal, Skeleton } from '../../components/ui';
import { Check, ClipboardList, CloudOff, ListChecks, Plus, ShieldAlert, Trash2 } from '../../components/ui/icons';
import { usePracticeSets } from './usePracticeSets';
import AddSetsForm from './AddSetsForm';
import OutsideScoreForm from '../exams/OutsideScoreForm';
import { useOutsideScores, newEntryId } from '../exams/useOutsideScores';
import { subjectLabel } from '../exams/outsideScoreLabels';

const fmtPct = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

function SetRow({ set, score, onToggle, onLog, onDelete }) {
  const done = set.status === 'done';
  const pct = score ? outsideScorePercent(score) : null;
  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-default)] border border-border bg-surface2/30 p-2.5">
      <Button
        type="button"
        size="icon"
        variant={done ? 'primary' : 'secondary'}
        aria-pressed={done}
        aria-label={done ? `${set.title}: done. Mark not done` : `Mark ${set.title} done`}
        onClick={() => onToggle(set)}
      >
        {done && <Check size={16} strokeWidth={2.25} aria-hidden="true" />}
      </Button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm [overflow-wrap:anywhere] ${done ? 'text-muted2 line-through decoration-1' : 'text-textMain'}`}>{set.title}</p>
        <p className="text-xs text-muted2">{subjectLabel(set.subject)}{set.doneOn ? ` · done ${set.doneOn}` : ''}</p>
      </div>
      {done && pct != null && (
        <Link to="/exams?tab=history" className="text-sm font-semibold tabular-nums text-[var(--accent-text)] hover:underline touch-target inline-flex items-center" aria-label={`${set.title}: ${fmtPct(pct)}, view in Past sittings`}>
          {fmtPct(pct)}
        </Link>
      )}
      {done && pct == null && (
        <Button type="button" size="sm" variant="ghost" onClick={() => onLog(set)} aria-label={`Log the score for ${set.title}`}>
          <ClipboardList size={14} strokeWidth={1.75} aria-hidden="true" /> Log score
        </Button>
      )}
      <Button type="button" size="icon" variant="ghost" tone="danger" onClick={() => onDelete(set)} aria-label={`Delete ${set.title}`}>
        <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
      </Button>
    </li>
  );
}

export default function SetsPanel() {
  const { items, status, queuedCount, add, addMany, update, remove } = usePracticeSets();
  const outside = useOutsideScores();
  const [adding, setAdding] = useState({ open: false, key: 0 });
  const [logging, setLogging] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const explain = (err, action) => toast.error(err?.message ? `Couldn’t ${action}: ${err.message}` : `Couldn’t ${action}. Try again.`);
  const queued = (result) => {
    if (result === 'queued') toast(navigator.onLine ? 'Saved. It syncs in a moment.' : 'Saved on this device. It syncs when you’re back online.');
  };
  const entry = (s) => ({ collection: s.collection, title: s.title, subject: s.subject, status: s.status, doneOn: s.doneOn || null, outsideScoreId: s.outsideScoreId || null, sortOrder: s.sortOrder ?? 0 });

  const toggle = async (s) => {
    const done = s.status !== 'done';
    try {
      queued(await update(s.id, { ...entry(s), status: done ? 'done' : 'todo', doneOn: done ? todayManila() : null }));
    } catch (err) {
      explain(err, 'update the set');
    }
  };

  const saveNew = async (sets) => {
    try {
      queued(sets.length === 1 ? await add(sets[0]) : await addMany(sets));
    } catch (err) {
      explain(err, 'add the sets');
      throw err;
    }
  };

  // The score's id is made first, so the set can name it whether the two
  // writes go now or wait in the queue.
  const saveScore = async (payload) => {
    const s = logging;
    const id = newEntryId();
    try {
      queued(await outside.add({ ...payload, id }));
      await update(s.id, { ...entry(s), outsideScoreId: id });
    } catch (err) {
      explain(err, 'save the score');
      throw err;
    }
  };

  const confirmDelete = async () => {
    const s = confirm;
    setConfirm(null);
    try {
      queued(await remove(s.id));
    } catch (err) {
      explain(err, 'delete the set');
    }
  };

  const groups = setCollections(items || []);
  const scoresById = new Map((outside.items || []).map((e) => [e.id, e]));
  const total = (items || []).length;
  const done = (items || []).filter((s) => s.status === 'done').length;

  return (
    <div className="flex flex-col gap-4">
      <Card padding="md" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle size="lg">Sets to finish</CardTitle>
            <p className="text-sm text-muted2 mt-1 max-w-prose">
              The papers you mean to get through: past boards, your review center’s sets, book drills. Tick each one off, then log its score to see it beside your mock boards.
            </p>
          </div>
          <Button size="sm" onClick={() => setAdding((a) => ({ open: true, key: a.key + 1 }))}>
            <Plus size={14} strokeWidth={2} aria-hidden="true" /> Add sets
          </Button>
        </div>
        {total > 0 && (
          <p className="text-sm text-textMain tabular-nums">{done} of {total} done</p>
        )}
        {(queuedCount > 0 || status === 'offline' || status === 'unreachable') && (
          <p role="status" className="flex items-center gap-2 text-xs text-muted2">
            <CloudOff size={14} strokeWidth={1.75} aria-hidden="true" />
            {queuedCount > 0 ? `${queuedCount} change${queuedCount === 1 ? '' : 's'} saved on this device, waiting to sync.` : 'Showing the sets saved on this device.'}
          </p>
        )}
      </Card>

      {items === null ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No sets yet"
          description="Add your review center’s numbered sets, or past boards by year, and tick them off as you go."
          action={<Button size="sm" variant="secondary" onClick={() => setAdding((a) => ({ open: true, key: a.key + 1 }))}>Add sets</Button>}
        />
      ) : (
        groups.map((g) => (
          <Disclosure
            key={g.collection}
            title={g.collection}
            description={`${g.done} of ${g.sets.length} done`}
            defaultOpen={g.done < g.sets.length}
            bodyClassName="flex flex-col gap-2"
          >
            <div className="h-1.5 rounded-full bg-surface2 overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${Math.round((g.done / g.sets.length) * 100)}%`, background: 'var(--accent)' }} />
            </div>
            <ul className="flex flex-col gap-2" aria-label={g.collection}>
              {g.sets.map((s) => (
                <SetRow
                  key={s.id}
                  set={s}
                  score={s.outsideScoreId ? scoresById.get(s.outsideScoreId) : null}
                  onToggle={toggle}
                  onLog={setLogging}
                  onDelete={setConfirm}
                />
              ))}
            </ul>
          </Disclosure>
        ))
      )}

      {adding.open && (
        <AddSetsForm key={adding.key} open collections={groups.map((g) => g.collection)} onClose={() => setAdding((a) => ({ ...a, open: false }))} onSave={saveNew} />
      )}

      {logging && (
        <OutsideScoreForm
          key={logging.id}
          open
          prefill={{ title: `${logging.collection}: ${logging.title}`.slice(0, 80), subject: logging.subject, takenOn: logging.doneOn || todayManila() }}
          entries={outside.items || []}
          onClose={() => setLogging(null)}
          onSave={saveScore}
        />
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete this set?"
        icon={ShieldAlert}
        tone="danger"
        size="sm"
        footer={(
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button type="button" variant="danger" size="sm" onClick={confirmDelete}>Delete</Button>
          </>
        )}
      >
        <p className="text-sm text-muted2 leading-relaxed">
          Delete <strong className="text-textMain">{confirm?.title}</strong>? A score you logged for it stays in Past sittings.
        </p>
      </Modal>
    </div>
  );
}
