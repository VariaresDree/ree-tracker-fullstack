// One group of the subtopic review pile (Admin › Question bank › Subtopics ›
// To review): the questions the AI pointed to one subtopic (or to none), each
// ticked, for the admin to skim, untick the odd one out, and tag the rest in
// one go. The subtopic starts at the group's suggestion and can be changed, so
// the "no suggestion" group is sorted the same way: tick those that belong
// together, pick their subtopic, tag them.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button, FormField, Select, Skeleton } from '../../../components/ui';
import LatexRenderer from '../../../components/LatexRenderer';
import { apiRequest } from '../../../services/dbQueries';

const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const n = (x) => Number(x || 0).toLocaleString();

export default function SuggestionGroup({ topic, group, onResolved }) {
  const [items, setItems] = useState(null);
  const [ticked, setTicked] = useState(() => new Set());
  const [subtopicId, setSubtopicId] = useState(group.subtopicId || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const q = new URLSearchParams({ topicId: topic.id, subtopicId: group.subtopicId || 'none' });
    apiRequest(`/api/questions/tag-suggestions?${q}`, 'GET', null, { timeoutMs: 30_000 })
      .then((res) => {
        if (!live) return;
        setItems(res.items);
        // A suggestion starts all ticked; with none, the admin picks which.
        setTicked(new Set(group.subtopicId ? res.items.map((i) => i.id) : []));
      })
      .catch((err) => toast.error(err.message || "Couldn't load these questions."));
    return () => { live = false; };
  }, [topic.id, group.subtopicId]);

  const toggle = (id) => setTicked((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allTicked = items && items.length > 0 && ticked.size === items.length;

  const resolve = async (asSubtopic) => {
    const ids = items.filter((i) => ticked.has(i.id)).map((i) => i.id);
    if (!ids.length) return;
    setBusy(true);
    try {
      const res = await apiRequest('/api/questions/tag-suggestions/resolve', 'POST', {
        items: ids.map((id) => ({ id, subtopicId: asSubtopic })),
      }, { timeoutMs: 30_000, idempotencyKey: newKey() });
      const refused = new Set((res.refused || []).map((r) => r.id));
      const done = ids.filter((id) => !refused.has(id));
      setItems((list) => list.filter((i) => !done.includes(i.id)));
      setTicked(new Set());
      onResolved?.({ resolved: done.length, saved: res.saved || 0 });
      if (refused.size) toast.error(`${n(refused.size)} couldn't be tagged: that subtopic isn't in their topic any more.`);
      else toast.success(asSubtopic ? `${n(res.saved)} tagged.` : `${n(done.length)} left untagged.`);
    } catch (err) {
      toast.error(err.message || 'Nothing was saved. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!items) return <Skeleton className="h-24" />;
  if (!items.length) return <p className="text-sm text-muted2">Nothing left in this group.</p>;

  const count = ticked.size;
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex flex-wrap items-end gap-2">
        <FormField label="Subtopic" className="min-w-0 flex-1 basis-56">
          <Select value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)} disabled={busy}>
            <option value="">Choose…</option>
            {topic.subtopics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </FormField>
        <Button onClick={() => resolve(subtopicId)} disabled={busy || !count || !subtopicId} loading={busy}>
          Tag {n(count)}
        </Button>
        <Button variant="ghost" onClick={() => resolve(null)} disabled={busy || !count}>None fits for {n(count)}</Button>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted2 cursor-pointer w-fit">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--accent)]"
          checked={allTicked}
          onChange={() => setTicked(allTicked ? new Set() : new Set(items.map((i) => i.id)))}
        />
        {allTicked ? 'Untick all' : 'Tick all'} · {n(count)} of {n(items.length)} ticked
      </label>
      <ul className="flex flex-col gap-2">
        {items.map((q) => (
          <li key={q.id}>
            <label className="flex items-start gap-3 bg-bg border border-border rounded-[var(--radius-lg)] p-3 cursor-pointer min-w-0">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                checked={ticked.has(q.id)}
                onChange={() => toggle(q.id)}
                aria-label={`Include: ${String(q.text || '').slice(0, 80)}`}
              />
              <span className="text-sm text-textMain math-scroll-mobile min-w-0 line-clamp-3 [&_p]:!m-0"><LatexRenderer content={q.text} /></span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
