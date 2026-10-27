// src/features/paper-sets/PaperSetsTab.jsx
//
// Exams > Paper sets: the papers you printed from the mock board setup, each
// with its answer sheets scanned so far. From here: print a set (again), scan
// its sheets, see its results, or delete it with its sheets. Lazy (its own
// chunk, like the hub's other tabs).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatPrintId } from '@ree/shared';
import {
  Button, Card, EmptyState, Grid, Modal, SectionHeader, Skeleton, StatusPill,
} from '../../components/ui';
import {
  CloudOff, FileText, ListChecks, Printer, ScanLine, Trash2,
} from '../../components/ui/icons';
import { usePrintedSets } from './usePrintedSets';

const sheetsLine = (n) => (n === 1 ? '1 sheet scanned' : `${n} sheets scanned`);
const dateOf = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const sheetsOf = (s) => s?._count?.sheets ?? 0;
const icon = (Icon) => <Icon size={16} strokeWidth={1.75} aria-hidden="true" />;

function SetCard({ set, onDelete }) {
  const count = sheetsOf(set);
  const name = `${set.label}, ${set.title}`;
  return (
    <Card as="li" padding="md" className="flex flex-col gap-3 min-w-0">
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-eyebrow">{set.label}</p>
        <h3 className="text-base font-semibold text-textMain [overflow-wrap:anywhere]">{set.title}</h3>
        <p className="text-xs text-muted2 tabular-nums">
          {`${dateOf(set.createdAt)} \u00B7 `}
          <span className="font-mono">{formatPrintId(set.id)}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-textMain tabular-nums">{sheetsLine(count)}</span>
        {!set.printedAt && <StatusPill tone="neutral">Not printed yet</StatusPill>}
        {set.edited && <StatusPill tone="signal">Edited</StatusPill>}
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <Button as={Link} size="sm" variant="secondary" to={`/print/${set.id}`} aria-label={`Print ${name}`}>
          {icon(Printer)}
          Print
        </Button>
        <Button as={Link} size="sm" variant="secondary" to={`/scan/${set.id}?for=taker`} aria-label={`Scan sheets for ${name}`}>
          {icon(ScanLine)}
          Scan
        </Button>
        <Button as={Link} size="sm" variant="secondary" to={`/exams/paper-sets/${set.id}`} aria-label={`Results for ${name}`}>
          {icon(ListChecks)}
          Results
        </Button>
        <Button size="sm" variant="ghost" tone="danger" onClick={() => onDelete(set)} aria-label={`Delete ${name}`}>
          {icon(Trash2)}
          Delete
        </Button>
      </div>
    </Card>
  );
}

export default function PaperSetsTab() {
  const { sets, status, queuedCount, remove } = usePrintedSets();
  const [confirm, setConfirm] = useState(null);

  const confirmDelete = async () => {
    const set = confirm;
    setConfirm(null);
    try {
      await remove(set.id);
    } catch (err) {
      toast.error(`${set.label} wasn\u2019t deleted. ${err?.message || 'Try again.'}`);
    }
  };

  const list = sets || [];
  const count = confirm ? sheetsOf(confirm) : 0;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="paper-sets-title">
      <SectionHeader
        id="paper-sets-title"
        title="Paper sets"
        description="Mock boards printed on paper. Scan the answer sheets with your phone to score them: each taker, or your own as a self-check."
        actions={(
          <>
            <Button as={Link} size="sm" variant="secondary" to="/simulator">
              {icon(Printer)}
              Print a new paper
            </Button>
            <Button as={Link} size="sm" to="/scan?for=taker">
              {icon(ScanLine)}
              Scan a sheet
            </Button>
          </>
        )}
      />

      {(queuedCount > 0 || status === 'offline' || status === 'unreachable') && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted2">
          {icon(CloudOff)}
          {queuedCount > 0
            ? `${queuedCount} change${queuedCount === 1 ? '' : 's'} saved on this device, waiting to sync.`
            : 'Offline. Showing the paper sets saved on this device.'}
        </p>
      )}

      {sets == null ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : list.length === 0 ? (
        <Card padding="md">
          <EmptyState
            compact
            icon={FileText}
            title={status === 'error' ? 'Your paper sets couldn\u2019t load' : 'No paper sets yet'}
            description={status === 'error'
              ? 'Try again in a moment.'
              : 'Set up a mock board and choose Print this paper. Each printed set keeps its answer key, so you can scan its sheets here and see the results.'}
            action={<Button as={Link} size="sm" to="/simulator">Print a new paper</Button>}
          />
        </Card>
      ) : (
        <Grid kind="cards" as="ul">
          {list.map((s) => <SetCard key={s.id} set={s} onDelete={setConfirm} />)}
        </Grid>
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        tone="danger"
        icon={Trash2}
        size="sm"
        title={confirm ? (count ? `Delete ${confirm.label} and its ${count === 1 ? '1 scanned sheet' : `${count} scanned sheets`}?` : `Delete ${confirm.label}?`) : ''}
        footer={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={confirmDelete}>Delete</Button>
          </>
        )}
      >
        <p className="text-sm text-muted2">
          {count
            ? 'The set, its answer key and every scanned sheet are removed from your account. Self-checks already in your history stay there.'
            : 'The set and its answer key are removed from your account.'}
          {' This can\u2019t be undone.'}
        </p>
      </Modal>
    </section>
  );
}
