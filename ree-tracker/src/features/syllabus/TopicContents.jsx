// src/features/syllabus/TopicContents.jsx
//
// One topic's table of contents: a tick per subtopic, and Customize, where a
// learner renames, switches off and moves rows, adds their own, starts blank or
// goes back to the suggested list. Ticks survive all of it. Finishing every
// switched-on subtopic ticks the topic's Read; unticking later leaves Read alone.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { SUBTOPIC_LIMITS, subtopicProgress } from '@ree/shared/subtopics';
import { Button, FormField, Input, Skeleton, StatusPill, cn } from '../../components/ui';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from '../../components/ui/icons';

const failed = (err) => toast.error(err?.message ? `Couldn’t save: ${err.message}` : 'Couldn’t save. Try again.');

function CustomizeRow({ row, index, count, onRename, onOff, onMove, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  const save = (e) => {
    e.preventDefault();
    if (name.trim() !== row.name && (name.trim() || !row.own)) onRename(row, name);
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="py-2">
        <form onSubmit={save} className="flex flex-wrap items-end gap-2">
          <FormField label="Name" hint={row.own ? undefined : `Leave it empty to go back to “${row.suggestedName}”.`} className="flex-1 min-w-40">
            <Input value={name} maxLength={SUBTOPIC_LIMITS.name} onChange={(e) => setName(e.target.value)} autoFocus />
          </FormField>
          <Button type="submit" size="sm">Save</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { setName(row.name); setEditing(false); }}>Cancel</Button>
        </form>
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center gap-1.5 py-1.5">
      <span className={cn('flex-1 min-w-32 text-sm [overflow-wrap:anywhere]', row.off ? 'text-muted line-through' : 'text-textMain')}>
        {row.name}
        {row.own && <span className="ml-2 text-xs text-muted2">yours</span>}
        {row.renamed && <span className="ml-2 text-xs text-muted2">was {row.suggestedName}</span>}
      </span>
      <Button variant="ghost" size="icon" aria-label={`Move ${row.name} up`} disabled={index === 0} onClick={() => onMove(index, -1)}>
        <ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Move ${row.name} down`} disabled={index === count - 1} onClick={() => onMove(index, 1)}>
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Rename ${row.name}`} onClick={() => setEditing(true)}>
        <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      {row.own && (
        <Button variant="ghost" size="icon" tone="danger" aria-label={`Delete ${row.name}`} onClick={() => onDelete(row)}>
          <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={!row.off}
        aria-label={`Include ${row.name}`}
        onClick={() => onOff(row, !row.off)}
        className={cn(
          'min-h-11 w-14 rounded-full border text-xs font-medium cursor-pointer transition-colors',
          row.off ? 'border-border text-muted2' : 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] border-[color-mix(in_srgb,var(--accent)_45%,transparent)] text-[var(--accent-text)]',
        )}
      >
        {row.off ? 'Off' : 'On'}
      </button>
    </li>
  );
}

/** @param {{ topicId, name, rows, ready, status, actions, onFinished: () => void }} props */
export default function TopicContents({ topicId, name: topicName, rows, ready, status, actions, onFinished }) {
  const [customizing, setCustomizing] = useState(false);
  const [newName, setNewName] = useState('');
  const { done, total } = subtopicProgress(rows);
  const on = rows.filter((r) => !r.off);
  const offCount = rows.length - on.length;

  const tick = (row) => {
    const nowDone = !row.done;
    actions.setDone(row, topicId, nowDone).catch(failed);
    if (nowDone && !row.off && done + 1 === total) onFinished();
  };
  const markAll = () => {
    actions.markAll(rows, topicId).catch(failed);
    if (total > 0) onFinished();
  };
  const addOwn = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    actions.addOwn(topicId, newName).catch(failed);
    setNewName('');
  };

  return (
    <section aria-label={`${topicName}: table of contents`} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-eyebrow">Table of contents</span>
        {total > 0 && <span className="text-xs tabular-nums text-muted2">{done} of {total}</span>}
        <span className="ml-auto flex items-center gap-1">
          {!customizing && total > done && <Button size="sm" variant="ghost" onClick={markAll}>Mark all</Button>}
          <Button size="sm" variant="ghost" aria-pressed={customizing} onClick={() => setCustomizing((c) => !c)}>
            {customizing ? 'Done' : 'Customize'}
          </Button>
        </span>
      </div>

      {!ready && status === 'loading' && <Skeleton className="h-24" />}
      {!ready && status !== 'loading' && <p className="text-sm text-muted2">The suggested list loads once over a connection. Your own subtopics still work.</p>}

      {customizing ? (
        <div className="flex flex-col gap-3">
          {rows.length > 0 && (
            <ol className="flex flex-col divide-y divide-border" aria-label={`${topicName}: customize`}>
              {rows.map((row, i) => (
                <CustomizeRow
                  key={row.id}
                  row={row}
                  index={i}
                  count={rows.length}
                  onRename={(r, n) => actions.rename(r, topicId, n).catch(failed)}
                  onOff={(r, off) => actions.setOff(r, topicId, off).catch(failed)}
                  onMove={(index, by) => actions.move(rows, topicId, index, by).catch(failed)}
                  onDelete={(r) => actions.deleteOwn(r).catch(failed)}
                />
              ))}
            </ol>
          )}
          <form onSubmit={addOwn} className="flex flex-wrap items-end gap-2">
            <FormField label="Add your own" className="flex-1 min-w-40">
              <Input value={newName} maxLength={SUBTOPIC_LIMITS.name} onChange={(e) => setNewName(e.target.value)} />
            </FormField>
            <Button type="submit" size="sm" variant="secondary" disabled={!newName.trim()}>Add</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => actions.startBlank(rows, topicId).catch(failed)}>Start blank</Button>
            <Button size="sm" variant="secondary" onClick={() => actions.useSuggested(rows, topicId).catch(failed)}>Use the suggested list</Button>
          </div>
          <p className="text-xs text-muted2">Your ticks stay, whatever you change here. A subtopic that’s off doesn’t count toward this topic.</p>
        </div>
      ) : (
        <>
          {on.length > 0 && (
            <div className="@container">
              <ul className="grid grid-cols-1 @xl:grid-cols-2 gap-x-4" aria-label={`${topicName}: subtopics`}>
                {on.map((row) => (
                  <li key={row.id}>
                    <label className="flex items-center gap-3 min-h-11 py-1 cursor-pointer">
                      <input type="checkbox" className="size-5 shrink-0 accent-[var(--accent)] cursor-pointer" checked={row.done} onChange={() => tick(row)} />
                      <span className={cn('text-sm [overflow-wrap:anywhere]', row.done ? 'text-muted2' : 'text-textMain')}>{row.name}</span>
                      {row.own && <StatusPill tone="neutral" dot={false}>Yours</StatusPill>}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ready && on.length === 0 && <p className="text-sm text-muted2">No subtopics are on for this topic. Customize to add your own.</p>}
          {offCount > 0 && <p className="text-xs text-muted2">{offCount} switched off.</p>}
        </>
      )}
    </section>
  );
}
