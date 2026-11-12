// Admin › Question bank › Subtopics › In the background: the switch for the
// server's hourly tagging run (services/subtopicAutoTag.js), how far the bank
// has got, and the questions the AI wasn't sure of, kept on the server so
// nothing is lost when the page closes.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, FormField, ProgressIndicator, SegmentedControl, Select } from '../../../components/ui';
import LatexRenderer from '../../../components/LatexRenderer';
import { apiRequest } from '../../../services/dbQueries';

const FLAG = 'subtopic-autotag';
const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const n = (x) => Number(x || 0).toLocaleString();

const fetchStatus = () => apiRequest('/api/questions/auto-tag-status', 'GET', null, { timeoutMs: 30_000 });
const fetchOpen = () => apiRequest('/api/questions/tag-suggestions?limit=50', 'GET', null, { timeoutMs: 30_000 });
const resolve = (items) => apiRequest('/api/questions/tag-suggestions/resolve', 'POST', { items }, { timeoutMs: 30_000, idempotencyKey: newKey() });

function guessLine(row) {
  if (!row.guess) return 'AI: none of these';
  if (!row.subtopicId) return `AI named one not on the list: ${row.guess}`;
  return `AI: ${row.guess} · not sure`;
}

function SuggestionRow({ row, topic, onAnswer, busy }) {
  const [pick, setPick] = useState(row.subtopicId || '');
  return (
    <li className="bg-bg border border-border rounded-[var(--radius-lg)] p-4 flex flex-col gap-3 min-w-0">
      <p className="text-eyebrow">{topic ? `${topic.subject} › ${topic.name}` : 'Topic'}</p>
      <div className="text-sm text-textMain math-scroll-mobile min-w-0 line-clamp-4 [&_p]:!m-0"><LatexRenderer content={row.text} /></div>
      <div className="flex flex-wrap items-end gap-2">
        <Badge tone="neutral">{guessLine(row)}</Badge>
        <FormField label="Subtopic" className="min-w-0 flex-1 basis-56">
          <Select value={pick} onChange={(e) => setPick(e.target.value)} disabled={busy}>
            <option value="">Choose…</option>
            {(topic?.subtopics || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </FormField>
        <Button size="sm" onClick={() => onAnswer(row, pick)} disabled={busy || !pick}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => onAnswer(row, null)} disabled={busy}>None fits</Button>
      </div>
    </li>
  );
}

export default function AutoTagPanel() {
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(null); // { items, topics }
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.all([fetchStatus(), fetchOpen()])
      .then(([s, o]) => { if (live) { setStatus(s); setOpen(o); } })
      .catch((err) => toast.error(err.message || "Couldn't load the tagging status."));
    return () => { live = false; };
  }, [reload]);

  const change = async (value) => {
    const enabled = value === 'on';
    setSaving(true);
    try {
      await apiRequest(`/api/config/flags/${FLAG}`, 'PUT', { enabled, description: 'Subtopic tagging by the in-app AI, a few batches an hour.' });
      setStatus((s) => s && { ...s, enabled });
      toast.success(enabled ? 'Tagging in the background is on. It starts at the next hour.' : 'Tagging in the background is off.');
    } catch (err) {
      toast.error(err.message || 'Couldn’t change it. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const answer = async (row, subtopicId) => {
    setBusy(true);
    try {
      const res = await resolve([{ id: row.id, subtopicId: subtopicId || null }]);
      if (res.refused?.length) { toast.error("That subtopic isn't in this question's topic any more."); return; }
      setOpen((o) => ({ ...o, items: o.items.filter((r) => r.id !== row.id) }));
      setStatus((s) => s && { ...s, toReview: Math.max(0, s.toReview - 1), tagged: s.tagged + (res.saved || 0) });
    } catch (err) {
      toast.error(err.message || 'Nothing was saved. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const topicOf = new Map((open?.topics || []).map((t) => [t.id, t]));
  const perHour = status ? status.callsPerRun * status.batch : 0;

  return (
    <Card as="section" elevated padding="md" className="flex flex-col gap-4 min-w-0" aria-labelledby="autotag-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 id="autotag-title" className="text-h3 text-textMain">In the background</h3>
          <p className="text-xs text-muted2 mt-1">
            The in-app AI tags {perHour ? `about ${n(perHour)}` : 'a few batches of'} questions an hour, 6 AM to 11 PM, with nobody on this page. Sure picks save at once; the rest wait below. It goes slowly on purpose: it shares the free AI with learners.
          </p>
        </div>
        {status && (
          <SegmentedControl
            size="sm"
            label="Tagging in the background"
            value={status.enabled ? 'on' : 'off'}
            onChange={change}
            options={[{ value: 'on', label: 'On', disabled: saving }, { value: 'off', label: 'Off', disabled: saving }]}
          />
        )}
      </div>

      {status && (
        <>
          <ProgressIndicator value={status.tagged} max={status.total || 1} label={`${n(status.tagged)} of ${n(status.total)} questions tagged`} />
          <p className="text-sm text-muted2" role="status">
            {status.notAsked > 0 ? `${n(status.notAsked)} not looked at yet` : 'Every question has been looked at'} · {n(status.toReview)} to review
          </p>
        </>
      )}

      {open?.items?.length > 0 && (
        <section aria-label="To review" className="flex flex-col gap-3 min-w-0 border-t border-border pt-4">
          <p className="text-eyebrow">To review · {n(status?.toReview ?? open.items.length)}</p>
          <p className="text-xs text-muted2">The AI wasn&rsquo;t sure of these. Pick a subtopic, or None fits to leave one untagged for good.</p>
          <ol className="flex flex-col gap-3">
            {open.items.map((row) => (
              <SuggestionRow key={row.id} row={row} topic={topicOf.get(row.topicId)} onAnswer={answer} busy={busy} />
            ))}
          </ol>
          {status?.toReview > open.items.length && (
            <Button variant="ghost" onClick={() => setReload((k) => k + 1)} disabled={busy} className="self-start">Load more</Button>
          )}
        </section>
      )}
    </Card>
  );
}
