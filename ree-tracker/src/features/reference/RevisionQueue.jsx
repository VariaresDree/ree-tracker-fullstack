// Admin › Formula cards › Review: rewrites of live cards (2026-11-16). A rewrite
// waits here while the card keeps teaching what it says now; approving one
// changes the card in place, so learners' reviews stay with it. Each shows what
// changes, before and after, or that it retires the card.
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, Skeleton, StatusPill } from '../../components/ui';
import LatexRenderer from '../../components/LatexRenderer';
import { approveCardRevision, bulkApproveCardRevisions, fetchCardRevisions, rejectCardRevision } from '../../services/dbQueries';

// The fields a rewrite can change, in the order they read on a card.
const FIELDS = [
  ['name', 'Name'],
  ['symbol', 'Symbol'],
  ['formulaLatex', 'Formula'],
  ['valueUnit', 'Value or unit'],
  ['description', 'Description'],
  ['variables', 'Where'],
  ['purposeExamTip', 'Board tip'],
  ['subtopic', 'Subtopic'],
  ['subtopicTag', 'Group'],
];
const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

/** A card's value for a field, as a rewrite names it (the subtopic by name). */
const current = (card, key) => (key === 'subtopic' ? card.subtopic?.name ?? null : card[key] ?? null);
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function Value({ field, value }) {
  if (value == null || value === '') return <span className="text-muted2">none</span>;
  if (field === 'variables') {
    return (
      <ul className="flex flex-col gap-0.5">
        {(value || []).map((v, i) => (
          <li key={i}><LatexRenderer inline content={`${v.symbol} · ${v.meaning}${v.unit ? ` (${v.unit})` : ''}`} /></li>
        ))}
      </ul>
    );
  }
  return <span className="min-w-0 math-scroll-mobile"><LatexRenderer inline content={String(value)} /></span>;
}

function RevisionCard({ item, busy, onApprove, onReject }) {
  const { card } = item;
  const changes = FIELDS.filter(([key]) => key in (item.content || {}) && !same(item.content[key], current(card, key)));
  return (
    <li>
      <Card padding="md" className="flex flex-col gap-3 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={item.retire ? 'danger' : 'amber'}>{item.retire ? 'Retire' : 'Rewrite'}</StatusPill>
          <span className="text-sm font-semibold text-textMain min-w-0">{item.retire ? '' : 'Rewrite of '}{card.name}</span>
          <Badge tone="neutral">{card.subject}{card.topic?.name ? ` · ${card.topic.name}` : ''}</Badge>
        </div>
        {item.note && <p className="text-xs text-muted2">{item.note}</p>}
        {!item.retire && (changes.length === 0 ? (
          <p className="text-xs text-muted2">Nothing differs from the card as it is now.</p>
        ) : (
          <dl className="flex flex-col gap-2 text-sm min-w-0">
            {changes.map(([key, label]) => (
              <div key={key} className="grid grid-cols-1 sm:grid-cols-[7rem_1fr_1fr] gap-x-3 gap-y-1 min-w-0 border-t border-border pt-2">
                <dt className="text-eyebrow">{label}</dt>
                <dd className="min-w-0 text-muted2"><span className="sr-only">Before: </span><Value field={key} value={current(card, key)} /></dd>
                <dd className="min-w-0 text-textMain"><span className="sr-only">After: </span><Value field={key} value={item.content[key]} /></dd>
              </div>
            ))}
          </dl>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" tone="success" onClick={() => onApprove(item)} disabled={busy}>{item.retire ? 'Retire it' : 'Approve'}</Button>
          <Button size="sm" variant="outline" tone="danger" onClick={() => onReject(item)} disabled={busy}>Reject</Button>
        </div>
      </Card>
    </li>
  );
}

export default function RevisionQueue() {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null); // an id, or 'all'

  const load = useCallback(() => fetchCardRevisions().then((list) => setItems(list || [])).catch(() => setItems([])), []);
  useEffect(() => { load(); }, [load]);

  const drop = (ids) => setItems((list) => list.filter((x) => !ids.includes(x.id)));
  const approve = async (item) => {
    setBusy(item.id);
    try {
      await approveCardRevision(item.id);
      drop([item.id]);
      toast.success(item.retire ? `${item.card.name} retired.` : `${item.card.name} rewritten.`);
    } catch (err) {
      toast.error(err?.body?.reasons ? `Not applied: ${err.body.reasons.join(', ')}` : (err.message || 'Not applied.'));
    } finally { setBusy(null); }
  };
  const reject = async (item) => {
    setBusy(item.id);
    try {
      await rejectCardRevision(item.id);
      drop([item.id]);
      toast.success('Rewrite rejected: the card stays as it is.');
    } catch { toast.error('Reject failed.'); } finally { setBusy(null); }
  };
  const approveAll = async () => {
    setBusy('all');
    try {
      const res = await bulkApproveCardRevisions(items.map((x) => x.id));
      drop(res?.approved || []);
      if (res?.approved?.length) toast.success(`${plural(res.approved.length, 'rewrite')} applied.`);
      if (res?.failed?.length) toast.error(`${plural(res.failed.length, 'rewrite')} not applied; they stay here.`);
    } catch { toast.error('Nothing was applied. Try again.'); } finally { setBusy(null); }
  };

  if (items === null) return <Skeleton className="h-16" />;
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="card-rewrites" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap border border-border bg-surface2/40 rounded-[var(--radius-default)] px-4 py-3">
        <h3 id="card-rewrites" className="text-sm text-muted2 font-normal">
          <span className="font-bold text-textMain">{plural(items.length, 'rewrite')}</span> of live cards. Each card keeps what it says now until you approve.
        </h3>
        <Button size="sm" tone="success" onClick={approveAll} loading={busy === 'all'} disabled={!!busy}>Approve all {items.length}</Button>
      </div>
      <ol className="flex flex-col gap-3">
        {items.map((item) => <RevisionCard key={item.id} item={item} busy={!!busy} onApprove={approve} onReject={reject} />)}
      </ol>
    </section>
  );
}
