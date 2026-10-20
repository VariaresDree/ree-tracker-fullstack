// src/features/analytics/sections/RecentFocusBlocks.jsx
//
// Progress › Habits › Focus time › Recent blocks: the newest logged blocks,
// each one fixable (what it was for, how many minutes were focus) or
// deletable, so one wrong block doesn't skew the split for a month. Minutes
// can't go past the time the block spanned (the server checks it too).
import { useState } from 'react';
import toast from 'react-hot-toast';
import { FOCUS_MAX_MINUTES, FOCUS_SUBJECTS, toDisplaySubject } from '@ree/shared';
import { Button, Input, Select } from '../../../components/ui';
import { apiRequest } from '../../../services/dbQueries';

const subjectLabel = (s) => (s === 'General' ? 'General' : toDisplaySubject(s));
const when = (iso) => {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
};

function BlockRow({ block, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(block.subject);
  const [minutes, setMinutes] = useState(String(block.minutes));
  const [busy, setBusy] = useState(false);
  const max = block.maxMinutes || FOCUS_MAX_MINUTES;
  const n = Number(minutes);
  const valid = Number.isInteger(n) && n >= 1 && n <= max;

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await apiRequest(`/api/user/focus-blocks/${encodeURIComponent(block.id)}`, 'PATCH', { subject, minutes: n });
      toast.success('Focus block updated.');
      setEditing(false);
      onChanged();
    } catch {
      toast.error('Could not update that block. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await apiRequest(`/api/user/focus-blocks/${encodeURIComponent(block.id)}`, 'DELETE');
      toast.success('Focus block deleted.');
      onChanged();
    } catch {
      toast.error('Could not delete that block. Try again.');
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-b-0">
        <span className="text-sm text-textMain">
          {when(block.endedAt)} · {subjectLabel(block.subject)} · <span className="tabular-nums">{block.minutes} min</span>
        </span>
        <span className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={busy}
            aria-label={`Edit the ${subjectLabel(block.subject)} block from ${when(block.endedAt)}`}>Edit</Button>
          <Button size="sm" variant="ghost" tone="danger" onClick={remove} disabled={busy}
            aria-label={`Delete the ${subjectLabel(block.subject)} block from ${when(block.endedAt)}`}>Delete</Button>
        </span>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-end gap-2 py-2 border-b border-border last:border-b-0">
      <span className="text-sm text-muted2 w-full">{when(block.endedAt)}</span>
      <Select aria-label="What this block was for" value={subject} onChange={(e) => setSubject(e.target.value)} wrapperClassName="w-40">
        {FOCUS_SUBJECTS.map((s) => <option key={s} value={s}>{subjectLabel(s)}</option>)}
      </Select>
      <Input type="number" inputMode="numeric" min={1} max={max} aria-label={`Focus minutes, up to ${max}`}
        value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-24" />
      <Button size="sm" onClick={save} disabled={busy || !valid}>Save</Button>
      <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setSubject(block.subject); setMinutes(String(block.minutes)); }} disabled={busy}>Cancel</Button>
      {!valid && <p className="text-xs text-[var(--accent-danger)] w-full">Enter 1 to {max} minutes, the time this block lasted.</p>}
    </li>
  );
}

export default function RecentFocusBlocks({ blocks, onChanged }) {
  if (!blocks?.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-eyebrow">Recent blocks</h3>
      <p className="text-xs text-muted2">Logged the wrong subject, or left the timer running? Fix or delete a block here.</p>
      <ul className="flex flex-col">
        {blocks.map((b) => <BlockRow key={b.id} block={b} onChanged={onChanged} />)}
      </ul>
    </div>
  );
}
