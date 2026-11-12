// Admin › Question bank › Reports: every question a learner reported, with how
// many did and why, and the three ways to close it. Before, a report only
// reached an admin once three learners agreed (it then left the bank), so the
// 65 reports learners had made by 2026-11-12 had never been seen.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, EmptyState, FormField, Input, SegmentedControl, Skeleton, StatusPill } from '../../components/ui';
import { Check, Flag, Pencil, Trash2 } from '../../components/ui/icons';
import LatexRenderer from '../../components/LatexRenderer';
import ExplanationBody from '../quiz/ExplanationBody';
import QuestionEditModal from '../library/QuestionEditModal';
import { apiRequest, fetchQuestionById, updateQuestionInBank } from '../../services/dbQueries';

const SUBJECTS = [
  { value: 'All', label: 'All' },
  { value: 'Mathematics', label: 'Math' },
  { value: 'ESAS', label: 'ESAS' },
  { value: 'EE', label: 'EE' },
];
const DONE = { fixed: 'Fixed, and the reports closed.', dismissed: 'Reports closed: nothing to fix.', removed: 'Taken out of the bank.' };

const fetchReports = (subject, offset) => apiRequest(`/api/questions/reports?${new URLSearchParams({ subject, offset })}`, 'GET', null, { timeoutMs: 30_000 });
const resolve = (id, resolution, note = '') => apiRequest(`/api/questions/${encodeURIComponent(id)}/reports/resolve`, 'POST', { resolution, ...(note.trim() ? { note: note.trim() } : {}) }, { timeoutMs: 30_000 });
export const NOTE_MAX = 300;
const day = (at) => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

function ReportCard({ item, busy, onEdit, onResolve }) {
  const { question: q, reports, reasons, firstAt, lastAt } = item;
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [note, setNote] = useState('');
  return (
    <li>
      <Card padding="md" className="flex flex-col gap-3 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={reports > 1 ? 'danger' : 'amber'}>{plural(reports, 'report')}</StatusPill>
          <Badge tone="neutral">{q.subject} · {q.subtopic}</Badge>
          {q.isFlagged && <Badge tone="signal">Out of the bank</Badge>}
          <span className="ml-auto text-xs text-muted2 tabular-nums">
            {reports > 1 ? `${day(firstAt)} to ${day(lastAt)}` : day(lastAt)}
          </span>
        </div>
        <ul className="flex flex-col gap-0.5 text-sm text-textMain">
          {Object.entries(reasons).map(([why, n]) => (
            <li key={why} className="flex items-center gap-1.5">
              <Flag size={13} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-reeAmber-text)' }} />
              {why}{n > 1 ? ` · ${n}` : ''}
            </li>
          ))}
        </ul>
        <div className="text-sm text-textMain math-scroll-mobile min-w-0 [&_p]:!m-0"><LatexRenderer content={q.text} /></div>
        <ol className="flex flex-col gap-1 text-xs min-w-0">
          {(q.options || []).map((o, i) => (
            <li key={i} className={`flex items-center gap-2 min-w-0 ${o === q.answer ? 'font-semibold text-textMain' : 'text-muted2'}`}>
              <span className="font-mono opacity-60 shrink-0">{String.fromCharCode(65 + i)}.</span>
              <span className="min-w-0 flex-1 math-scroll-mobile [&_p]:!m-0"><LatexRenderer content={o} /></span>
              {o === q.answer && <><Check size={13} strokeWidth={2.5} className="shrink-0" style={{ color: 'var(--accent-success)' }} aria-hidden="true" /><span className="sr-only">Answer key</span></>}
            </li>
          ))}
        </ol>
        {q.fixedExplanation && (
          <details className="text-xs text-muted2">
            <summary className="cursor-pointer font-medium text-textMain">Explanation</summary>
            <div className="mt-2 leading-relaxed min-w-0"><ExplanationBody text={q.fixedExplanation} /></div>
          </details>
        )}
        <FormField label="Note to the learners (optional)" hint="They see it in Account › Your reports, with what you did.">
          <Input value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} placeholder="The key is now B: the old one used the wrong formula." />
        </FormField>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onEdit(item, note)} disabled={busy}><Pencil size={14} strokeWidth={1.75} aria-hidden="true" /> Edit</Button>
          <Button size="sm" variant="secondary" onClick={() => onResolve(item, 'dismissed', note)} disabled={busy}>No problem</Button>
          {confirmRemove ? (
            <>
              <Button size="sm" variant="ghost" tone="danger" onClick={() => onResolve(item, 'removed', note)} disabled={busy}>Take it out of the bank</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)} disabled={busy}>Keep it</Button>
            </>
          ) : (
            !q.isFlagged && <Button size="sm" variant="ghost" tone="danger" onClick={() => setConfirmRemove(true)} disabled={busy}><Trash2 size={14} strokeWidth={1.75} aria-hidden="true" /> Remove</Button>
          )}
        </div>
      </Card>
    </li>
  );
}

/** @param {{ onCount?: (n: number) => void, onClosed?: () => void }} props  the open count when loaded, and each one closed */
export default function QuestionReports({ onCount, onClosed }) {
  const [subject, setSubject] = useState('All');
  const [page, setPage] = useState({ status: 'loading', items: [], total: 0 });
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null); // { item, question }
  const [edit, setEdit] = useState({ saving: false, error: '' });

  useEffect(() => {
    let live = true;
    fetchReports(subject, 0)
      .then((res) => {
        if (!live) return;
        setPage({ status: 'done', items: res.items, total: res.total });
        if (subject === 'All') onCount?.(res.total);
      })
      .catch(() => { if (live) setPage((p) => ({ ...p, status: 'error' })); });
    return () => { live = false; };
  }, [subject, onCount]);
  const showMore = async () => {
    try {
      const res = await fetchReports(subject, page.items.length);
      setPage((p) => ({ status: 'done', items: [...p.items, ...res.items], total: res.total }));
    } catch {
      toast.error('Couldn’t load more. Try again.');
    }
  };

  const closed = (item, resolution) => {
    setPage((p) => ({ ...p, items: p.items.filter((x) => x.question.id !== item.question.id), total: Math.max(0, p.total - 1) }));
    onClosed?.();
    toast.success(DONE[resolution]);
  };

  const onResolve = async (item, resolution, note) => {
    setBusyId(item.question.id);
    try {
      await resolve(item.question.id, resolution, note);
      closed(item, resolution);
    } catch (err) {
      toast.error(err.message || 'Nothing was changed. Try again.');
    } finally { setBusyId(null); }
  };

  const onEdit = async (item, note = '') => {
    setBusyId(item.question.id);
    try {
      setEditing({ item, note, question: await fetchQuestionById(item.question.id) });
      setEdit({ saving: false, error: '' });
    } catch (err) {
      toast.error(`Couldn’t open that question: ${err.message}`);
    } finally { setBusyId(null); }
  };
  const saveEdit = async (q) => {
    setEdit({ saving: true, error: '' });
    try {
      // Back in the bank once it's fixed, then the reports close.
      await updateQuestionInBank(q.id, { ...q, isFlagged: false });
      await resolve(q.id, 'fixed', editing.note || '');
      closed(editing.item, 'fixed');
      setEditing(null);
    } catch (err) {
      setEdit({ saving: false, error: `Couldn’t save: ${err.message}` });
    }
  };

  return (
    <section aria-labelledby="reports-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h3 id="reports-title" className="text-h3 text-textMain flex items-center gap-2">
          <Flag size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-reeAmber-text)' }} /> Learners’ reports
        </h3>
        <p className="text-xs text-muted2">
          Every question a learner reported, most-reported first. Three reports take a question out of the bank on their own; one or two wait here. Closing them keeps the record, and the learners see what you did in Account › Your reports.
        </p>
      </header>
      <SegmentedControl label="Subject" size="sm" value={subject} onChange={(s) => { setPage({ status: 'loading', items: [], total: 0 }); setSubject(s); }} options={SUBJECTS} />

      {page.status === 'loading' && <Skeleton className="h-40" />}
      {page.status === 'error' && <p role="alert" className="text-sm" style={{ color: 'var(--accent-danger)' }}>Couldn’t load the reports. Check the connection and open this again.</p>}
      {page.status === 'done' && page.items.length === 0 && (
        <EmptyState title="No open reports" description="When a learner reports a question, it shows here." />
      )}
      {page.items.length > 0 && (
        <>
          <p className="text-sm text-textMain tabular-nums">{plural(page.total, 'question')} reported</p>
          <ol className="flex flex-col gap-3">
            {page.items.map((item) => (
              <ReportCard key={item.question.id} item={item} busy={busyId === item.question.id} onEdit={onEdit} onResolve={onResolve} />
            ))}
          </ol>
          {page.items.length < page.total && (
            <Button variant="ghost" className="self-start" onClick={showMore}>Show more</Button>
          )}
        </>
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
