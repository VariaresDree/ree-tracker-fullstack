// src/components/exam/SubmitDialog.jsx
//
// "Submit this exam?" — with what is still open: how many items are
// unanswered and how many are marked for review, each a link back to the item.
// Two dialogs said less than this (one behind "Exit exam"), and Submit was
// reachable only from the last item.
import { useEffect, useState } from 'react';
import { Button, Modal } from '../ui';
import { TriangleAlert } from '../ui/icons';

// A long list of blanks makes this dialog tall enough for its confirm to land
// under the finger that just tapped "Review and submit", so a double tap would
// submit the exam. The confirm ignores taps this long after opening. It's a class,
// not `disabled`, so keyboard users lose nothing.
const ARM_MS = 400;

function ItemLinks({ label, indices, onJump }) {
  if (indices.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-textMain">
        <span className="font-semibold tabular-nums">{indices.length}</span> {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {indices.map((idx) => (
          <Button key={idx} size="sm" variant="secondary" onClick={() => onJump(idx)} aria-label={`Go to item ${idx + 1}`}>
            {idx + 1}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function SubmitDialog({ open, onClose, onSubmit, unanswered = [], marked = [], total, onJump, submitting = false, title = 'Submit this exam?', submitLabel = 'Submit exam' }) {
  const jump = (idx) => { onClose(); onJump(idx); };
  const allDone = unanswered.length === 0 && marked.length === 0;
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => setArmed(true), ARM_MS);
    return () => { clearTimeout(timer); setArmed(false); };
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone={allDone ? 'default' : 'amber'}
      icon={TriangleAlert}
      title={title}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Keep working</Button>
          <Button tone="danger" className={armed ? undefined : 'pointer-events-none'} loading={submitting} disabled={submitting} onClick={() => { onClose(); onSubmit(); }}>{submitLabel}</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        {allDone
          ? <p className="text-sm text-muted2">Every item is answered. You can’t change your answers after submitting.</p>
          : <p className="text-sm text-muted2">You can’t change your answers after submitting. Blank items count as wrong.</p>}
        {!allDone && total != null && (
          <p className="text-sm font-semibold text-textMain tabular-nums">{total - unanswered.length} of {total} answered</p>
        )}
        <ItemLinks label={unanswered.length === 1 ? 'item is left blank' : 'items are left blank'} indices={unanswered} onJump={jump} />
        <ItemLinks label={marked.length === 1 ? 'item is marked for review' : 'items are marked for review'} indices={marked} onJump={jump} />
      </div>
    </Modal>
  );
}
