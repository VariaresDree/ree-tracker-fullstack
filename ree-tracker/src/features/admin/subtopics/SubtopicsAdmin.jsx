// src/features/admin/subtopics/SubtopicsAdmin.jsx
//
// Admin › Subtopics: the suggested table of contents learners see in Progress ›
// Syllabus. Every edit reaches everyone following the list; a learner's own
// changes stay theirs. Retiring keeps the row, because a learner's tick points
// at it, and it can be restored.
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { SYLLABUS_SUBJECTS } from '@ree/shared';
import { apiRequest } from '../../../services/dbQueries';
import { Button, Card, EmptyState, FormField, Input, SectionHeader, SegmentedControl, Select, Skeleton, StatusPill, Textarea } from '../../../components/ui';
import { ChevronDown, ChevronUp, ListChecks, Pencil, RotateCcw } from '../../../components/ui/icons';

const ENDPOINT = '/api/admin/subtopics';
const SUBJECT_LABEL = { Mathematics: 'Math', ESAS: 'ESAS', EE: 'EE' };
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

export default function SubtopicsAdmin() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(null);
  const [nonce, setNonce] = useState(0);
  const [subject, setSubject] = useState('Mathematics');
  const [chosenTopic, setChosenTopic] = useState(null);
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    apiRequest(ENDPOINT, 'GET', null, { timeoutMs: LONG_MS })
      .then((res) => { if (live) { setData(res); setFailed(null); } })
      .catch((err) => { if (live) setFailed(err.message || 'Could not load the subtopics.'); });
    return () => { live = false; };
  }, [nonce]);

  const topics = useMemo(() => (data?.topics || []).filter((t) => t.subject === subject), [data, subject]);
  const topicId = topics.some((t) => t.id === chosenTopic) ? chosenTopic : topics[0]?.id ?? null;
  const counts = useMemo(() => {
    const out = new Map();
    for (const s of data?.items || []) if (s.active) out.set(s.topicId, (out.get(s.topicId) || 0) + 1);
    return out;
  }, [data]);
  const rows = (data?.items || []).filter((s) => s.topicId === topicId);
  const live = rows.filter((s) => s.active);
  const retired = rows.filter((s) => !s.active);

  // Replaces one topic's rows with what the server now says.
  const putTopic = (id, items) => setData((d) => ({ ...d, items: [...d.items.filter((s) => s.topicId !== id), ...items] }));
  const putRow = (item) => setData((d) => ({ ...d, items: d.items.map((s) => (s.id === item.id ? item : s)) }));

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
    if (names.length === 0 || !topicId) return undefined;
    return run(async () => {
      const res = await apiRequest(ENDPOINT, 'POST', { topicId, names }, { timeoutMs: LONG_MS, idempotencyKey: crypto.randomUUID() });
      putTopic(topicId, res.items);
      setPasted('');
      toast.success(res.added === 1 ? 'Added 1 subtopic.' : `Added ${res.added} subtopics.`);
    }, 'Could not add the subtopics.');
  };

  const move = (position, by) => run(async () => {
    const ids = live.map((s) => s.id);
    [ids[position], ids[position + by]] = [ids[position + by], ids[position]];
    // Retired rows keep their place after the live ones.
    const res = await apiRequest(`${ENDPOINT}/reorder`, 'POST', { topicId, ids: [...ids, ...retired.map((s) => s.id)] }, { timeoutMs: LONG_MS, idempotencyKey: crypto.randomUUID() });
    putTopic(topicId, res.items);
  }, 'Could not move that subtopic.');

  const rename = (row, name) => run(async () => {
    const res = await apiRequest(`${ENDPOINT}/${encodeURIComponent(row.id)}`, 'PUT', { name }, { timeoutMs: LONG_MS });
    putRow(res.item);
  }, 'Could not rename that subtopic.');

  const setActive = (row, active) => run(async () => {
    const res = await apiRequest(`${ENDPOINT}/${encodeURIComponent(row.id)}`, 'PUT', { active }, { timeoutMs: LONG_MS });
    putRow(res.item);
  }, 'Could not save that subtopic.');

  const header = (
    <SectionHeader
      title="Subtopics"
      description="The suggested table of contents for each topic in Progress › Syllabus. Your edits reach everyone following the list. Learners can rename, switch off and add their own."
    />
  );

  if (failed && !data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          icon={ListChecks}
          title="Could not load the subtopics"
          description={failed}
          action={<Button size="sm" variant="secondary" onClick={() => setNonce((n) => n + 1)}><RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" /> Try again</Button>}
        />
      </div>
    );
  }
  if (!data) {
    return <div className="flex flex-col gap-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="flex flex-col gap-3">
        <SegmentedControl label="Subject" options={SYLLABUS_SUBJECTS.map((s) => ({ value: s, label: SUBJECT_LABEL[s] }))} value={subject} onChange={setSubject} fullWidth />
        <FormField label="Topic">
          <Select value={topicId || ''} onChange={(e) => setChosenTopic(e.target.value)}>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name} ({counts.get(t.id) || 0})</option>)}
          </Select>
        </FormField>
      </div>

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
          <Textarea rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} />
        </FormField>
        <Button type="submit" size="sm" className="self-start" loading={busy} disabled={!pasted.trim() || !topicId}>Add to this topic</Button>
      </form>

      {retired.length > 0 && (
        <section aria-labelledby="subtopics-retired" className="flex flex-col gap-3">
          <h3 id="subtopics-retired" className="text-h3 text-textMain">Retired</h3>
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
