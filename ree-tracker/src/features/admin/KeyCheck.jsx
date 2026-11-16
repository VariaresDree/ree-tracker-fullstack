// Admin › Question bank › Fix › Questions to check (2026-11-16): signs that a
// live key is wrong, and one tap to settle each (server services/keyCheck.js).
// Every question had been through "Fix questions with another AI", yet two EE
// keys were still wrong while their own explanations worked out the right
// option. The strongest sign leads: the explanation itself names another option.
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, EmptyState, Skeleton, StatusPill } from '../../components/ui';
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

const KEY_REASONS = ['explanation-names-other', 'learners-chose-other'];
const n = (x) => Number(x || 0).toLocaleString();
const plural = (k, noun) => `${n(k)} ${noun}${k === 1 ? '' : 's'}`;
const letter = (i) => String.fromCharCode(65 + i);
const when = (at) => new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** What the finding says, in a line. */
function headline(item) {
  const d = item.detail || {};
  if (item.reason === 'explanation-names-other') return { tone: 'danger', text: 'Its explanation works out another option' };
  if (item.reason === 'learners-chose-other') return { tone: 'amber', text: `${n(d.chose)} of ${n(d.learners)} learners chose another option` };
  return { tone: 'neutral', text: 'Two options read the same' };
}

function CheckCard({ item, busy, onSettle, onEdit }) {
  const { question: q, detail, reason, picks = [] } = item;
  const [confirmRemove, setConfirmRemove] = useState(false);
  const named = reason === 'explanation-names-other' ? detail?.option : null;
  const crowd = reason === 'learners-chose-other' ? detail?.option : null;
  const learnersOn = (o) => picks.find((p) => p.option === o)?.learners || 0;
  const head = headline(item);
  const namedIndex = named ? q.options.indexOf(named) : -1;
  return (
    <li>
      <Card padding="md" className="flex flex-col gap-3 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={head.tone}>{head.text}</StatusPill>
          <Badge tone="neutral">{q.subject} · {q.subtopic}</Badge>
        </div>
        <div className="text-sm text-textMain math-scroll-mobile min-w-0 [&_p]:!m-0"><LatexRenderer content={q.text} /></div>
        <ol className="flex flex-col gap-1 text-xs min-w-0" aria-label="Options">
          {q.options.map((o, i) => {
            const isKey = o === q.answer;
            const flagged = o === named || o === crowd;
            return (
              <li key={i} className={`flex flex-wrap items-center gap-2 min-w-0 rounded-[var(--radius-sm)] px-1.5 py-1 ${isKey ? 'font-semibold text-textMain' : 'text-muted2'}`}
                style={flagged ? { background: 'color-mix(in srgb, var(--color-reeAmber) 14%, transparent)' } : undefined}>
                <span className="font-mono opacity-60 shrink-0">{letter(i)}.</span>
                <span className="min-w-0 flex-1 math-scroll-mobile"><LatexRenderer inline content={o} /></span>
                {isKey && <Badge tone="success" className="shrink-0"><Check size={12} strokeWidth={2.5} aria-hidden="true" /> Key</Badge>}
                {o === named && <Badge tone="signal" className="shrink-0">Explanation’s answer</Badge>}
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
          {reason !== 'duplicate-options' && (
            <Button size="sm" variant="secondary" onClick={() => onSettle(item, { action: 'keep' }, 'Kept. It won’t come back unless the question changes.')} disabled={busy}>
              Key is right
            </Button>
          )}
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

  const { status, items, total, lastScan } = state;
  return (
    <section aria-labelledby="key-check-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h3 id="key-check-title" className="text-h3 text-textMain flex items-center gap-2">
          <ShieldAlert size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--accent-danger)' }} /> Questions to check
        </h3>
        <p className="text-xs text-muted2">
          Signs that a key is wrong: the question’s own explanation works out another option, or most of the learners who answered it chose one. Settle each in a tap; a key you change regrades past answers. “Key is right” holds until the question changes.
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
      {items.length > 0 && (
        <ol className="flex flex-col gap-3">
          {items.map((item) => (
            <CheckCard key={item.id} item={item} busy={busyId === item.id} onSettle={onSettle} onEdit={onEdit} />
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
