// src/features/board-simulator/SubmitDialog.jsx
//
// "Submit this exam?" — with what is still open: how many items are
// unanswered and how many are marked for review, each a link back to the item.
// Two dialogs said less than this (one behind "Exit exam", one on the last
// item), and Submit was reachable only from the last item.
import { Button, Modal } from '../../components/ui';
import { TriangleAlert } from '../../components/ui/icons';

const MAX_LINKS = 20;

function ItemLinks({ label, indices, onJump }) {
  if (indices.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-textMain">
        <span className="font-semibold tabular-nums">{indices.length}</span> {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {indices.slice(0, MAX_LINKS).map((idx) => (
          <Button key={idx} size="sm" variant="secondary" onClick={() => onJump(idx)} aria-label={`Go to item ${idx + 1}`}>
            {idx + 1}
          </Button>
        ))}
        {indices.length > MAX_LINKS && <span className="text-xs text-muted2 self-center">and {indices.length - MAX_LINKS} more</span>}
      </div>
    </div>
  );
}

export default function SubmitDialog({ open, onClose, onSubmit, unanswered = [], marked = [], onJump, submitting = false }) {
  const jump = (idx) => { onClose(); onJump(idx); };
  const allDone = unanswered.length === 0 && marked.length === 0;
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone={allDone ? 'default' : 'amber'}
      icon={TriangleAlert}
      title="Submit this exam?"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Keep working</Button>
          <Button tone="danger" loading={submitting} disabled={submitting} onClick={() => { onClose(); onSubmit(); }}>Submit exam</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        {allDone
          ? <p className="text-sm text-muted2">Every item is answered. You can’t change your answers after submitting.</p>
          : <p className="text-sm text-muted2">You can’t change your answers after submitting. Blank items count as wrong.</p>}
        <ItemLinks label={unanswered.length === 1 ? 'item is unanswered' : 'items are unanswered'} indices={unanswered} onJump={jump} />
        <ItemLinks label={marked.length === 1 ? 'item is marked for review' : 'items are marked for review'} indices={marked} onJump={jump} />
      </div>
    </Modal>
  );
}
