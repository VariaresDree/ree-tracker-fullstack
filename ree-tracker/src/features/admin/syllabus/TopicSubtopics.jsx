// src/features/admin/syllabus/TopicSubtopics.jsx
//
// One topic's suggested table of contents, which learners see in Progress ›
// Syllabus. Every edit saves at once and reaches everyone following the list; a
// learner's own changes stay theirs. Retiring keeps the row, because a learner's
// tick points at it, and it can be restored.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiRequest } from '../../../services/dbQueries';
import { Button, Card, FormField, Input, StatusPill, Textarea } from '../../../components/ui';
import { ChevronDown, ChevronUp, Pencil } from '../../../components/ui/icons';

const ENDPOINT = '/api/admin/subtopics';
const LONG_MS = 30_000;

function Row({ row, position, count, busy, onMove, onRename, onSetActive }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);

  const save = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== row.name) await onRename(row, trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="px-4 py-3">
        <form onSubmit={save} className="flex flex-wrap items-end gap-2">
          <FormField label="Subtopic name" className="flex-1 min-w-48">
            <Input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} autoFocus />
          </FormField>
          <Button type="submit" size="sm" disabled={busy}>Save</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { setName(row.name); setEditing(false); }}>Cancel</Button>
        </form>
      </li>
    );
  }

  return (
    <li className="px-4 py-2 flex flex-wrap items-center gap-2">
      <span className="flex-1 min-w-40 text-sm text-textMain [overflow-wrap:anywhere]">{row.name}</span>
      <Button variant="ghost" size="icon" aria-label={`Move ${row.name} up`} disabled={busy || position === 0} onClick={() => onMove(position, -1)}>
        <ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Move ${row.name} down`} disabled={busy || position === count - 1} onClick={() => onMove(position, 1)}>
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Rename ${row.name}`} disabled={busy} onClick={() => setEditing(true)}>
        <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => onSetActive(row, false)}>Retire</Button>
    </li>
  );
}

/**
 * @param {string} topicId
 * @param {Array} rows this topic's subtopics, retired ones included
 * @param {(items: Array) => void} onRows replaces the topic's rows with what the server now says
 * @param {(item: object) => void} onRow replaces one row
 */
export default function TopicSubtopics({ topicId, rows, onRows, onRow }) {
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const live = rows.filter((s) => s.active);
  const retired = rows.filter((s) => !s.active);

  const run = async (work, fallback) => {
    setBusy(true);
    try {
      await work();
    } catch (err) {
      toast.error(err.message || fallback);
    } finally {
      setBusy(false);
    }
  };

  const add = (e) => {
    e.preventDefault();
    const names = pasted.split('\n').map((l) => l.trim()).filter(Boolean);
    if (names.length === 0) return undefined;
    return run(async () => {
      const res = await apiRequest(ENDPOINT, 'POST', { topicId, names }, { timeoutMs: LONG_MS, idempotencyKey: crypto.randomUUID() });
      onRows(res.items);
      setPasted('');
      toast.success(res.added === 1 ? 'Added 1 subtopic.' : `Added ${res.added} subtopics.`);
    }, 'Could not add the subtopics.');
  };

  const move = (position, by) => run(async () => {
    const ids = live.map((s) => s.id);
    [ids[position], ids[position + by]] = [ids[position + by], ids[position]];
    // Retired rows keep their place after the live ones.
    const res = await apiRequest(`${ENDPOINT}/reorder`, 'POST', { topicId, ids: [...ids, ...retired.map((s) => s.id)] }, { timeoutMs: LONG_MS, idempotencyKey: crypto.randomUUID() });
    onRows(res.items);
  }, 'Could not move that subtopic.');

  const rename = (row, name) => run(async () => {
    const res = await apiRequest(`${ENDPOINT}/${encodeURIComponent(row.id)}`, 'PUT', { name }, { timeoutMs: LONG_MS });
    onRow(res.item);
  }, 'Could not rename that subtopic.');

  const setActive = (row, active) => run(async () => {
    const res = await apiRequest(`${ENDPOINT}/${encodeURIComponent(row.id)}`, 'PUT', { active }, { timeoutMs: LONG_MS });
    onRow(res.item);
  }, 'Could not save that subtopic.');

  return (
    <div className="flex flex-col gap-4">
      {live.length === 0 ? (
        <p className="text-sm text-muted2">This topic has no subtopics yet. Add some below.</p>
      ) : (
        <Card as="ol" aria-label="Subtopics, in order" className="divide-y divide-border">
          {live.map((row, i) => (
            <Row key={row.id} row={row} position={i} count={live.length} busy={busy} onMove={move} onRename={rename} onSetActive={setActive} />
          ))}
        </Card>
      )}

      <form onSubmit={add} className="flex flex-col gap-3">
        <FormField label="Add subtopics" hint="One per line. A name the topic already has is skipped.">
          <Textarea rows={3} value={pasted} onChange={(e) => setPasted(e.target.value)} />
        </FormField>
        <Button type="submit" size="sm" variant="secondary" className="self-start" loading={busy} disabled={!pasted.trim()}>Add to this topic</Button>
      </form>

      {retired.length > 0 && (
        <section aria-label="Retired subtopics" className="flex flex-col gap-2">
          <Card as="ul" className="divide-y divide-border">
            {retired.map((row) => (
              <li key={row.id} className="px-4 py-2 flex flex-wrap items-center gap-2">
                <span className="flex-1 min-w-40 text-sm text-muted2 [overflow-wrap:anywhere]">{row.name}</span>
                <StatusPill tone="neutral" dot={false}>Retired</StatusPill>
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => setActive(row, true)}>Restore</Button>
              </li>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
