// Admin › Question bank › Fix › Questions to check (2026-11-16): signs that a
// live key is wrong, and one tap to settle each (server services/keyCheck.js).
// Every question had been through "Fix questions with another AI", yet two EE
// keys were still wrong while their own explanations worked out the right
// option. The strongest sign leads: the explanation itself names another option.
//
// Settling many (2026-11-16): a filter by kind, a tick on each, "Tick all",
// and one bar to keep them as they are, use each explanation's answer, or take
// them out of the bank (POST /key-checks/resolve-bulk). Duplicates show which
// two options read the same, and can be marked "They differ".
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, EmptyState, SegmentedControl, Skeleton, StatusPill, StickyToolbar } from '../../components/ui';
import { Check, Pencil, RefreshCw, ShieldAlert, Trash2 } from '../../components/ui/icons';
import LatexRenderer from '../../components/LatexRenderer';
import ExplanationBody from '../quiz/ExplanationBody';
import QuestionEditModal from '../library/QuestionEditModal';
import { apiRequest, fetchQuestionById, updateQuestionInBank } from '../../services/dbQueries';

const fetchChecks = () => apiRequest('/api/questions/key-checks', 'GET', null, { timeoutMs: 30_000 });
const runScan = () => apiRequest('/api/questions/key-checks/scan', 'POST', {}, { timeoutMs: 120_000 });
const settle = (id, body) => apiRequest(`/api/questions/key-checks/${encodeURIComponent(id)}/resolve`, 'POST', body, {
  timeoutMs: 45_000,
  idempotencyKey: crypto?.randomUUID?.() ?? `${id}-${Date.now()}`,
});

const settleMany = (ids, action) => apiRequest('/api/questions/key-checks/resolve-bulk', 'POST', { ids, action }, {
  timeoutMs: 120_000,
  idempotencyKey: crypto?.randomUUID?.() ?? `bulk-${Date.now()}`,
});

const KEY_REASONS = ['explanation-names-other', 'learners-chose-other'];
const KINDS = [
  { value: 'explanation-names-other', label: 'Explanation disagrees' },
  { value: 'learners-chose-other', label: 'Learners disagree' },
  { value: 'duplicate-options', label: 'Same options' },
];
const n = (x) => Number(x || 0).toLocaleString();
const plural = (k, noun) => `${n(k)} ${noun}${k === 1 ? '' : 's'}`;
const letter = (i) => String.fromCharCode(65 + i);
const when = (at) => new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** What the finding says, in a line. */
function headline(item) {
  const d = item.detail || {};
  if (item.reason === 'explanation-names-other') return { tone: 'danger', text: 'Its explanation works out another option' };
  if (item.reason === 'learners-chose-other') return { tone: 'amber', text: `${n(d.chose)} of ${n(d.learners)} learners chose another option` };
  const [a, b] = Array.isArray(d.options) ? d.options : [];
  return { tone: 'neutral', text: a != null ? `Options ${letter(a)} and ${letter(b)} read the same` : 'Two options read the same' };
}
/** Whether a finding can take "use the explanation's answer" without a choice. */
const usesExplanation = (item) => item.reason === 'explanation-names-other' && item.question.options.includes(item.detail?.option);

function CheckCard({ item, busy, selected, onSelect, onSettle, onEdit }) {
  const { question: q, detail, reason, picks = [] } = item;
  const twins = reason === 'duplicate-options' && Array.isArray(detail?.options) ? detail.options : [];
  const [confirmRemove, setConfirmRemove] = useState(false);
  const named = reason === 'explanation-names-other' ? detail?.option : null;
  const crowd = reason === 'learners-chose-other' ? detail?.option : null;
  const learnersOn = (o) => picks.find((p) => p.option === o)?.learners || 0;
  const head = headline(item);
  const namedIndex = named ? q.options.indexOf(named) : -1;
  return (
    <li>
      <Card padding="md" className="flex flex-col gap-3 min-w-0">
        <div className="flex items-start gap-1">
          <label className="shrink-0 inline-flex items-center justify-center w-7 h-7 -ml-1.5 pointer-coarse:w-11 pointer-coarse:h-11 pointer-coarse:-my-2 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-[var(--accent)] cursor-pointer" checked={selected} onChange={(e) => onSelect(item.id, e.target.checked)} aria-label={`Tick: ${q.text.slice(0, 60)}`} />
          </label>
          <div className="flex flex-wrap items-center gap-1.5 min-w-0 pt-0.5">
            <StatusPill tone={head.tone}>{head.text}</StatusPill>
            <Badge tone="neutral">{q.subject} · {q.subtopic}</Badge>
          </div>
        </div>
        <div className="text-sm text-textMain math-scroll-mobile min-w-0 [&_p]:!m-0"><LatexRenderer content={q.text} /></div>
        <ol className="flex flex-col gap-1 text-xs min-w-0" aria-label="Options">
          {q.options.map((o, i) => {
            const isKey = o === q.answer;
            const twin = twins.includes(i) ? twins.find((j) => j !== i) : null;
            const flagged = o === named || o === crowd || twin != null;
            return (
              <li key={i} className={`flex flex-wrap items-center gap-2 min-w-0 rounded-[var(--radius-sm)] px-1.5 py-1 ${isKey ? 'font-semibold text-textMain' : 'text-muted2'}`}
                style={flagged ? { background: 'color-mix(in srgb, var(--color-reeAmber) 14%, transparent)' } : undefined}>
                <span className="font-mono opacity-60 shrink-0">{letter(i)}.</span>
                <span className="min-w-0 flex-1 math-scroll-mobile"><LatexRenderer inline content={o} /></span>
                {isKey && <Badge tone="success" className="shrink-0"><Check size={12} strokeWidth={2.5} aria-hidden="true" /> Key</Badge>}
                {o === named && <Badge tone="signal" className="shrink-0">Explanation’s answer</Badge>}
                {twin != null && <Badge tone="amber" className="shrink-0">Same as {letter(twin)}</Badge>}
                {learnersOn(o) > 0 && <span className="shrink-0 tabular-nums">{plural(learnersOn(o), 'learner')}</span>}
              </li>
            );
          })}
        </ol>
        {named && detail?.line && (
          <p className="text-xs text-muted2 min-w-0">
            <span className="text-eyebrow block mb-0.5">Its explanation ends</span>
            <span className="text-sm text-textMain math-scroll-mobile"><LatexRenderer inline content={detail.line} /></span>
          </p>
        )}
        {q.fixedExplanation && (
          <details className="text-xs text-muted2">
            <summary className="cursor-pointer font-medium text-textMain">Whole explanation</summary>
            <div className="mt-2 leading-relaxed min-w-0"><ExplanationBody text={q.fixedExplanation} /></div>
          </details>
        )}
        <div className="flex flex-wrap gap-2">
          {named && namedIndex >= 0 && (
            <Button size="sm" onClick={() => onSettle(item, { action: 'use-option', answer: named }, `Key changed to ${letter(namedIndex)}.`)} disabled={busy} loading={busy}>
              Make {letter(namedIndex)} the key
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => onSettle(item, { action: 'keep' }, 'Kept. It won’t come back unless the question changes.')} disabled={busy}>
            {reason === 'duplicate-options' ? 'They differ' : 'Key is right'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onEdit(item)} disabled={busy}><Pencil size={14} strokeWidth={1.75} aria-hidden="true" /> Edit</Button>
          {confirmRemove ? (
            <>
              <Button size="sm" variant="ghost" tone="danger" onClick={() => onSettle(item, { action: 'remove' }, 'Taken out of the bank.')} disabled={busy}>Take it out of the bank</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)} disabled={busy}>Keep it</Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" tone="danger" onClick={() => setConfirmRemove(true)} disabled={busy}><Trash2 size={14} strokeWidth={1.75} aria-hidden="true" /> Remove</Button>
          )}
        </div>
      </Card>
    </li>
  );
}

export default function KeyCheck() {
  const [state, setState] = useState({ status: 'loading', items: [], total: 0, lastScan: null });
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null); // { item, question }
  const [edit, setEdit] = useState({ saving: false, error: '' });
  const [kind, setKind] = useState('all');
  const [selected, setSelected] = useState(() => new Set());
  const [bulk, setBulk] = useState(null); // the bulk action running
  const [confirmBulkRemove, setConfirmBulkRemove] = useState(false);

  const load = useCallback(() => fetchChecks()
    .then((res) => setState({ status: 'done', ...res }))
    .catch(() => setState((s) => ({ ...s, status: 'error' }))), []);
  useEffect(() => { load(); }, [load]);

  const scan = async () => {
    setScanning(true);
    try {
      const res = await runScan();
      toast.success(res.added
        ? `${plural(res.scanned, 'question')} checked: ${n(res.added)} new to look at.`
        : `${plural(res.scanned, 'question')} checked: nothing new.`);
      await load();
    } catch (err) {
      toast.error(err.message || 'The check stopped. Try again.');
    } finally { setScanning(false); }
  };

  // What the server closed: "Key is right" closes only the key findings; the rest close all of the question's.
  const drop = (item, keyOnly = false) => setState((s) => {
    const closes = (x) => x.question.id === item.question.id && (!keyOnly || KEY_REASONS.includes(x.reason));
    const items = s.items.filter((x) => !closes(x));
    return { ...s, items, total: Math.max(0, s.total - (s.items.length - items.length)) };
  });

  const onSettle = async (item, body, message) => {
    setBusyId(item.id);
    try {
      const res = await settle(item.id, body);
      drop(item, body.action === 'keep' && KEY_REASONS.includes(item.reason));
      toast.success(res.regraded ? `${message} ${plural(res.regraded, 'past answer')} regraded.` : message);
    } catch (err) {
      toast.error(err.message || 'Nothing was changed. Try again.');
    } finally { setBusyId(null); }
  };

  const select = (id, on) => setSelected((s) => {
    const next = new Set(s);
    if (on) next.add(id); else next.delete(id);
    return next;
  });

  const BULK_DONE = { keep: 'kept as they are', remove: 'taken out of the bank', 'use-option': 'given their explanation’s answer' };
  const onBulk = async (action, list) => {
    setBulk(action);
    setConfirmBulkRemove(false);
    try {
      const res = await settleMany(list.map((x) => x.id), action);
      if (res.settled) toast.success(`${plural(res.settled, 'question')} ${BULK_DONE[action]}.${res.regraded ? ` ${plural(res.regraded, 'past answer')} regraded.` : ''}`);
      if (res.failed?.length) toast.error(`${plural(res.failed.length, 'question')} couldn’t be settled: ${res.failed[0].error}`);
      setSelected(new Set());
      await load();
    } catch (err) {
      toast.error(err.message || 'Nothing was changed. Try again.');
    } finally { setBulk(null); }
  };

  const onEdit = async (item) => {
    setBusyId(item.id);
    try {
      setEditing({ item, question: await fetchQuestionById(item.question.id) });
      setEdit({ saving: false, error: '' });
    } catch (err) {
      toast.error(`Couldn’t open that question: ${err.message}`);
    } finally { setBusyId(null); }
  };
  const saveEdit = async (q) => {
    setEdit({ saving: true, error: '' });
    try {
      await updateQuestionInBank(q.id, q);
      await settle(editing.item.id, { action: 'edited' });
      drop(editing.item);
      toast.success('Saved. The next check looks at it again.');
      setEditing(null);
    } catch (err) {
      setEdit({ saving: false, error: `Couldn’t save: ${err.message}` });
    }
  };

  const { status, items, total, lastScan, byReason = {} } = state;
  const kinds = KINDS.filter((k) => byReason[k.value] > 0);
  const shown = useMemo(() => (kind === 'all' ? items : items.filter((x) => x.reason === kind)), [items, kind]);
  const picked = shown.filter((x) => selected.has(x.id));
  const explained = picked.filter(usesExplanation);
  const allPicked = shown.length > 0 && picked.length === shown.length;
  return (
    <section aria-labelledby="key-check-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h3 id="key-check-title" className="text-h3 text-textMain flex items-center gap-2">
          <ShieldAlert size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--accent-danger)' }} /> Questions to check
        </h3>
        <p className="text-xs text-muted2">
          Signs that a key is wrong: the question’s own explanation works out another option, or most of the learners who answered it chose one; and options that read the same. Settle each in a tap, or tick several and settle them together. A key you change regrades past answers; “Key is right” and “They differ” hold until the question changes.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-textMain tabular-nums min-w-0" aria-live="polite">
          {lastScan
            ? <>Last checked {when(lastScan.startedAt)}{lastScan.summary?.scanned ? ` · ${plural(lastScan.summary.scanned, 'question')}` : ''}{status === 'done' ? ` · ${n(total)} to look at` : ''}</>
            : 'The bank hasn’t been checked yet.'}
        </p>
        <Button size="sm" variant={lastScan ? 'secondary' : 'primary'} className="ml-auto" onClick={scan} loading={scanning} disabled={scanning}>
          <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" /> {scanning ? 'Checking the bank…' : 'Check the bank'}
        </Button>
      </div>

      {status === 'loading' && <Skeleton className="h-40" />}
      {status === 'error' && <p role="alert" className="text-sm" style={{ color: 'var(--accent-danger)' }}>Couldn’t load the questions to check. Check the connection and open this again.</p>}
      {status === 'done' && items.length === 0 && lastScan && (
        <EmptyState compact title="Nothing to look at" description="No question shows a sign of a wrong key. Check again after adding or fixing questions." />
      )}
      {kinds.length > 1 && (
        <SegmentedControl
          label="Show"
          size="sm"
          value={kind}
          onChange={(v) => { setKind(v); setConfirmBulkRemove(false); }}
          options={[{ value: 'all', label: `All · ${n(total)}` }, ...kinds.map((k) => ({ value: k.value, label: `${k.label} · ${n(byReason[k.value])}` }))]}
        />
      )}
      {shown.length > 1 && (
        <StickyToolbar role="region" aria-label="Settle the ticked ones">
          <label className="inline-flex items-center gap-2 text-sm text-textMain pointer-coarse:min-h-11 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-[var(--accent)] cursor-pointer" checked={allPicked}
              onChange={(e) => setSelected(e.target.checked ? new Set(shown.map((x) => x.id)) : new Set())} />
            <span className="tabular-nums" aria-live="polite">{picked.length ? `${n(picked.length)} of ${n(shown.length)} ticked` : `Tick all ${n(shown.length)}`}</span>
          </label>
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {explained.length > 0 && (
                <Button size="sm" onClick={() => onBulk('use-option', explained)} loading={bulk === 'use-option'} disabled={!!bulk}>
                  Use the explanation’s answer · {n(explained.length)}
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => onBulk('keep', picked)} loading={bulk === 'keep'} disabled={!!bulk}>
                <Check size={14} strokeWidth={2} aria-hidden="true" /> Keep as is · {n(picked.length)}
              </Button>
              {confirmBulkRemove ? (
                <>
                  <Button size="sm" variant="ghost" tone="danger" onClick={() => onBulk('remove', picked)} loading={bulk === 'remove'} disabled={!!bulk}>Take {n(picked.length)} out of the bank</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmBulkRemove(false)} disabled={!!bulk}>Keep them</Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" tone="danger" onClick={() => setConfirmBulkRemove(true)} disabled={!!bulk}>
                  <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" /> Remove · {n(picked.length)}
                </Button>
              )}
            </div>
          )}
        </StickyToolbar>
      )}
      {shown.length > 0 && (
        <ol className="flex flex-col gap-3">
          {shown.map((item) => (
            <CheckCard key={item.id} item={item} busy={busyId === item.id || !!bulk} selected={selected.has(item.id)} onSelect={select} onSettle={onSettle} onEdit={onEdit} />
          ))}
        </ol>
      )}
      {items.length > 0 && total > items.length && (
        <p className="text-xs text-muted2">Showing {n(items.length)} of {n(total)}. More show as you settle these.</p>
      )}
      <QuestionEditModal
        question={editing?.question || null}
        onChange={(question) => setEditing((e) => ({ ...e, question }))}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
        saving={edit.saving}
        error={edit.error}
      />
    </section>
  );
}
