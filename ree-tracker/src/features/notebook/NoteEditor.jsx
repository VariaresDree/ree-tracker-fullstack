// src/features/notebook/NoteEditor.jsx
//
// Write, change or delete your note on a question or formula card. Saving
// works offline (it's sent when you reconnect); a note saved empty is deleted.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { NOTE_MAX } from '@ree/shared';
import { Button, FormField, Modal, Textarea } from '../../components/ui';
import { NotebookPen } from '../../components/ui/icons';
import { saveNote } from './notesStore';

export default function NoteEditor({ open, onClose, type, targetId, target, initial = '' }) {
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const what = type === 'card' ? 'formula card' : 'question';

  const save = async (value) => {
    setSaving(true);
    try {
      const status = await saveNote(type, targetId, value, target);
      if (status === 'queued') toast.success("Saved on this device. It's sent when you're back online.");
      onClose();
    } catch (err) {
      toast.error(err?.status === 404 ? `That ${what} is no longer available.` : "Couldn't save your note. Try again.");
    }
    setSaving(false);
  };

  const left = NOTE_MAX - text.length;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Your note' : 'Add a note'}
      icon={NotebookPen}
      size="md"
      footer={(
        <>
          {initial && (
            <Button variant="ghost" tone="danger" className="mr-auto" onClick={() => save('')} disabled={saving}>Delete note</Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => save(text)} loading={saving} disabled={saving || (!text.trim() && !initial)}>Save note</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-3">
        {target?.title && <p className="text-sm text-muted2 line-clamp-2">On: {target.title}</p>}
        <FormField
          label={`Your note on this ${what}`}
          hint={<span className="tabular-nums" aria-live="polite">{left < 100 ? `${left} characters left` : `Up to ${NOTE_MAX} characters`}</span>}
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, NOTE_MAX))}
            maxLength={NOTE_MAX}
            rows={6}
            placeholder="The trick, the trap, the formula to remember…"
          />
        </FormField>
      </div>
    </Modal>
  );
}
