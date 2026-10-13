// src/features/notebook/NoteButton.jsx
//
// The note icon on a question or formula card: filled when you have a note
// on it, and opens the editor. `NoteView` shows the note itself (under a
// solution, or below a card in study mode), with Edit.
import { useState } from 'react';
import { Button } from '../../components/ui';
import { StickyNote } from '../../components/ui/icons';
import NoteEditor from './NoteEditor';
import { useNotes } from './notesStore';

export default function NoteButton({ type, targetId, target, className, withLabel = false }) {
  const { noteFor } = useNotes();
  const [open, setOpen] = useState(false);
  if (!targetId) return null;
  const note = noteFor(type, targetId);
  const label = note ? 'Edit your note' : 'Add a note';
  return (
    <>
      <Button
        size={withLabel ? 'sm' : 'icon'}
        variant="ghost"
        tone="amber"
        onClick={() => setOpen(true)}
        aria-label={withLabel ? undefined : label}
        title={label}
        className={note ? className : `text-muted ${className || ''}`}
      >
        <StickyNote size={16} strokeWidth={1.75} fill={note ? 'currentColor' : 'none'} aria-hidden="true" />
        {withLabel && (note ? 'Your note' : 'Add a note')}
      </Button>
      {open && (
        <NoteEditor open onClose={() => setOpen(false)} type={type} targetId={targetId} target={target} initial={note?.body || ''} />
      )}
    </>
  );
}

/** The note on a question or card, if there is one, with Edit. */
export function NoteView({ type, targetId, target, className }) {
  const { noteFor } = useNotes();
  const [open, setOpen] = useState(false);
  const note = targetId ? noteFor(type, targetId) : null;
  if (!note) return null;
  return (
    <section
      aria-label="Your note"
      className={`rounded-[var(--radius-default)] border p-4 flex flex-col gap-2 ${className || ''}`}
      style={{ borderColor: 'color-mix(in srgb, var(--color-reeAmber) 35%, transparent)', background: 'color-mix(in srgb, var(--color-reeAmber) 6%, transparent)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-eyebrow inline-flex items-center gap-1.5" style={{ color: 'var(--color-reeAmber-text)' }}>
          <StickyNote size={12} strokeWidth={1.75} aria-hidden="true" /> Your note
        </span>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Edit</Button>
      </div>
      <p className="text-sm text-textMain whitespace-pre-wrap [overflow-wrap:anywhere]">{note.body}</p>
      {open && (
        <NoteEditor open onClose={() => setOpen(false)} type={type} targetId={targetId} target={target} initial={note.body} />
      )}
    </section>
  );
}
