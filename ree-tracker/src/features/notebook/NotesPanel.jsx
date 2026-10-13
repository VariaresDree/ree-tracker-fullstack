// src/features/notebook/NotesPanel.jsx
//
// Library › Notebook › My notes: every note you've written on a question or a
// formula card, newest first, with what it's on. Edit or delete in place; a
// card's note opens the card in Formula cards.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toDisplaySubject } from '@ree/shared';
import { Badge, Button, Card, EmptyState, SegmentedControl, Skeleton } from '../../components/ui';
import { CloudOff, StickyNote, TriangleAlert } from '../../components/ui/icons';
import SmartText from '../../components/SmartText';
import NoteEditor from './NoteEditor';
import { useNotes } from './notesStore';

const shortDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function NoteCard({ note }) {
  const [editing, setEditing] = useState(false);
  const isCard = note.targetType === 'card';
  return (
    <Card as="li" className="p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted2">
        <Badge tone={isCard ? 'velocity' : 'signal'}>{isCard ? 'Formula card' : 'Question'}</Badge>
        {note.target?.subject && <span>{toDisplaySubject(note.target.subject)}</span>}
        {note.target?.topic && <span className="truncate max-w-[14rem]">· {note.target.topic}</span>}
        {note.updatedAt && <span className="tabular-nums">· {shortDate(note.updatedAt)}</span>}
      </div>
      <div className="text-sm font-medium text-textMain line-clamp-2 overflow-hidden">
        {note.target ? <SmartText text={note.target.title} /> : <span className="text-muted2">No longer in the app</span>}
      </div>
      <p className="text-sm text-textMain whitespace-pre-wrap [overflow-wrap:anywhere] border-l-2 pl-3" style={{ borderColor: 'var(--color-reeAmber)' }}>
        {note.body}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
        {isCard && note.target?.name && (
          <Button as={Link} size="sm" variant="ghost" to="/library?tab=formulas" state={{ search: note.target.name }}>Open card</Button>
        )}
      </div>
      {editing && (
        <NoteEditor open onClose={() => setEditing(false)} type={note.targetType} targetId={note.targetId} target={note.target} initial={note.body} />
      )}
    </Card>
  );
}

export default function NotesPanel({ isOnline }) {
  const { items, status, reload } = useNotes({ fresh: true });
  const [kind, setKind] = useState('all');
  const shown = useMemo(() => (items || []).filter((n) => kind === 'all' || n.targetType === kind), [items, kind]);

  if (items == null) {
    if (status === 'loading' || status === 'idle') {
      return (
        <div role="status" className="flex flex-col gap-3">
          <span className="sr-only">Loading your notes…</span>
          {[0, 1].map((i) => <Skeleton key={i} className="h-24 rounded-[var(--radius-lg)]" />)}
        </div>
      );
    }
    return (
      <EmptyState
        icon={isOnline ? TriangleAlert : CloudOff}
        title={isOnline ? "Couldn't load your notes" : 'Your notes need a connection'}
        description={isOnline ? 'Something went wrong on our side or the connection dropped.' : 'Reconnect once and they open offline after that.'}
        action={<Button onClick={reload}>Try again</Button>}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={StickyNote}
        title="No notes yet"
        description="Tap the note icon on a question (in Practice, a review, Bookmarks or Mistakes) or under a formula card to write down the trick or the trap in your own words."
        action={<Button as={Link} to="/practice">Open Practice</Button>}
      />
    );
  }

  const count = (t) => items.filter((n) => n.targetType === t).length;
  return (
    <div className="flex flex-col gap-5">
      <SegmentedControl
        label="Notes on"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'all', label: `All ${items.length}` },
          { value: 'question', label: `Questions ${count('question')}` },
          { value: 'card', label: `Formula cards ${count('card')}` },
        ]}
      />
      {shown.length === 0 ? (
        <EmptyState compact icon={StickyNote} title="Nothing here" description="No notes of this kind yet." />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((n) => <NoteCard key={`${n.targetType}:${n.targetId}`} note={n} />)}
        </ul>
      )}
    </div>
  );
}
