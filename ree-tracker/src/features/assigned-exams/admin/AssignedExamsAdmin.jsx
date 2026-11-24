// Admin › Assigned exams: the exams the admin has put together from the bank,
// drafts and published, the builder for a new one or an edit (?exam=new or
// ?exam=<id>, so Back leaves it) and one exam's results (?results=<id>).
// Learners see only published ones.
//
// The list (2026-11-25): search by title, filter by kind (Exam, Quiz, Problem
// set, Practice set) and by draft or published, grouped under each kind with
// its count. A row shows what it is and how it went; Results and Edit (and
// Publish, for a draft) are on it, and More holds the rest: the kind, Lock,
// Unpublish and Delete.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { toDisplaySubject } from '@ree/shared';
import { Badge, Button, Card, EmptyState, FormField, Input, SectionHeader, SegmentedControl, Select, Skeleton, StatusPill } from '../../../components/ui';
import { BarChart3, ClipboardList, Lock, LockOpen, Ellipsis, Pencil, Plus, Trash2 } from '../../../components/ui/icons';
import { EXAM_KINDS, examLength, kindCounts, kindOf, whenLabel } from '../examMath';
import { plainError } from '../../shared-quizzes/quizFilesApi';
import { deleteAdminExam, listAdminExams, setAdminExamKind, setAdminExamLocked, setAdminExamStatus } from '../assignedExamsApi';
import ExamBuilder from './ExamBuilder';
import ExamResults from './ExamResults';

const day = (at) => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const STATUS_FILTERS = [{ value: 'all', label: 'All' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Drafts' }];

function ExamRow({ exam, busy, onEdit, onResults, onStatus, onLock, onKind, onDelete }) {
  const [more, setMore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const published = exam.status === 'published';
  const subject = exam.subject === 'Mixed' ? 'Mixed subjects' : toDisplaySubject(exam.subject);
  const moreId = `more-${exam.id}`;
  return (
    <li>
      <Card padding="sm" className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill tone={published ? 'success' : 'neutral'}>{published ? 'Published' : 'Draft'}</StatusPill>
              {exam.locked && <StatusPill tone="amber">Locked</StatusPill>}
              {!exam.locked && exam.availability === 'upcoming' && <StatusPill tone="velocity">Scheduled</StatusPill>}
              {!exam.locked && exam.availability === 'closed' && <StatusPill tone="neutral">Closed</StatusPill>}
            </div>
            <p className="font-semibold text-textMain break-words min-w-0">{exam.title}</p>
            <p className="text-sm text-muted2">
              {subject} · {exam.itemCount} items · {examLength(exam.timeLimitSecs)}
              {' · '}{published ? `posted ${day(exam.publishedAt)}` : `saved ${day(exam.updatedAt)}`}
            </p>
            {(exam.opensAt || exam.closesAt) && (
              <p className="text-sm text-muted2">
                {[exam.opensAt && `Opens ${whenLabel(exam.opensAt)}`, exam.closesAt && `Closes ${whenLabel(exam.closesAt)}`].filter(Boolean).join(' · ')}
              </p>
            )}
            {exam.takers > 0 && (
              <p className="text-sm text-textMain">
                {exam.takers} {exam.takers === 1 ? 'learner' : 'learners'} took it · average {exam.average}% on the first try
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {published && (
              <Button size="sm" variant="secondary" onClick={() => onResults(exam)} disabled={busy}>
                <BarChart3 size={14} strokeWidth={1.75} aria-hidden="true" /> Results
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => onEdit(exam)} disabled={busy}>
              <Pencil size={14} strokeWidth={1.75} aria-hidden="true" /> Edit
            </Button>
            {!published && (
              <Button size="sm" onClick={() => onStatus(exam, 'published')} loading={busy} disabled={busy}>Publish</Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => { setMore((m) => !m); setConfirmDelete(false); }} aria-expanded={more} aria-controls={moreId} aria-label={`More for ${exam.title}`}>
              <Ellipsis size={16} strokeWidth={1.75} aria-hidden="true" />
            </Button>
          </div>
        </div>
        {more && (
          <div id={moreId} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
            <FormField label="Type" className="w-40">
              <Select value={exam.kind || 'exam'} onChange={(e) => onKind(exam, e.target.value)} disabled={busy}>
                {EXAM_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </Select>
            </FormField>
            {published && (
              <Button size="sm" variant="secondary" onClick={() => onLock(exam, !exam.locked)} disabled={busy}>
                {exam.locked ? <LockOpen size={14} strokeWidth={1.75} aria-hidden="true" /> : <Lock size={14} strokeWidth={1.75} aria-hidden="true" />}
                {exam.locked ? 'Unlock' : 'Lock'}
              </Button>
            )}
            {published && (
              <Button size="sm" variant="secondary" onClick={() => onStatus(exam, 'draft')} disabled={busy}>Unpublish</Button>
            )}
            {confirmDelete ? (
              <>
                <Button size="sm" variant="ghost" tone="danger" onClick={() => onDelete(exam)} loading={busy} disabled={busy}>Delete for good</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>Keep it</Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" tone="danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
                <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" /> Delete
              </Button>
            )}
          </div>
        )}
      </Card>
    </li>
  );
}

export default function AssignedExamsAdmin() {
  const [params, setParams] = useSearchParams();
  const editing = params.get('exam');
  const viewing = params.get('results');
  const [state, setState] = useState({ items: null, error: '' });
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('all');

  const load = useCallback(() => listAdminExams().then(
    (items) => setState({ items, error: '' }),
    (err) => setState({ items: null, error: plainError(err) }),
  ), []);
  useEffect(() => { if (!editing && !viewing) load(); }, [editing, viewing, load]);

  const show = (key, id) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    next.delete('exam');
    next.delete('results');
    if (id) next.set(key, id);
    return next;
  });
  const open = (id) => show('exam', id);

  const patch = (exam, saved) => setState((s) => ({ ...s, items: s.items.map((e) => (e.id === exam.id ? { ...e, ...saved } : e)) }));
  const act = async (exam, fn) => {
    setBusyId(exam.id);
    try {
      await fn();
    } catch (err) {
      toast.error(plainError(err));
    }
    setBusyId(null);
  };

  const onStatus = (exam, next) => act(exam, async () => {
    patch(exam, await setAdminExamStatus(exam.id, next));
    toast.success(next === 'published' ? 'Published for every learner.' : 'Back to draft. Learners no longer see it.');
  });
  const onLock = (exam, locked) => act(exam, async () => {
    patch(exam, { ...(await setAdminExamLocked(exam.id, locked)), availability: locked ? 'locked' : undefined });
    toast.success(locked ? 'Locked. Learners see it but can’t start it.' : 'Unlocked.');
    if (!locked) load();
  });
  const onKind = (exam, next) => act(exam, async () => {
    patch(exam, await setAdminExamKind(exam.id, next));
    toast.success(`Moved to ${kindOf(next).plural}.`);
  });
  const onDelete = (exam) => act(exam, async () => {
    await deleteAdminExam(exam.id);
    setState((s) => ({ ...s, items: s.items.filter((e) => e.id !== exam.id) }));
    toast.success('Exam deleted. Past sittings keep their results.');
  });

  const items = state.items;
  const shown = useMemo(() => {
    const words = search.trim().toLowerCase();
    return (items || []).filter((e) => (kind === 'all' || kindOf(e.kind).value === kind)
      && (status === 'all' || e.status === status)
      && (!words || e.title.toLowerCase().includes(words)));
  }, [items, search, kind, status]);
  const groups = kindCounts(shown).map((k) => ({ ...k, exams: shown.filter((e) => kindOf(e.kind).value === k.value) }));
  const counts = kindCounts(items);

  if (viewing) return <ExamResults key={viewing} examId={viewing} onBack={() => show('results', null)} />;
  if (editing) return <ExamBuilder key={editing} examId={editing === 'new' ? null : editing} onDone={() => open(null)} />;

  const newButton = (
    <Button onClick={() => open('new')}>
      <Plus size={16} strokeWidth={2} aria-hidden="true" /> New exam
    </Button>
  );
  const filtering = search.trim() || kind !== 'all' || status !== 'all';

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Assigned exams"
        description="Put an exam, quiz, problem set or practice set together from the question bank. Once published, every learner finds it in Exams › Assigned and can take it alone or as a battle."
        actions={items?.length ? newButton : null}
      />
      {state.error ? (
        <EmptyState title="Couldn’t load the exams" description={state.error} action={<Button variant="secondary" onClick={load}>Try again</Button>} />
      ) : !items ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-12" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No exams yet" description="Pick questions from the bank, set the time, and publish it for your learners." action={newButton} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end" role="search" aria-label="Find an exam">
            <FormField label="Search">
              <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title" />
            </FormField>
            <FormField label="Type" className="sm:w-48">
              <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="all">All types · {items.length}</option>
                {counts.map((k) => <option key={k.value} value={k.value}>{k.plural} · {k.count}</option>)}
              </Select>
            </FormField>
            <SegmentedControl label="Show" size="sm" value={status} onChange={setStatus} options={STATUS_FILTERS} />
          </div>

          {groups.length === 0 ? (
            <EmptyState
              compact
              title="No exams match"
              description="Try another type, or fewer words."
              action={filtering && <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setKind('all'); setStatus('all'); }}>Clear filters</Button>}
            />
          ) : groups.map((g) => (
            <section key={g.value} aria-labelledby={`kind-${g.value}`} className="flex flex-col gap-2">
              <h3 id={`kind-${g.value}`} className="text-eyebrow text-muted2 flex items-center gap-2">
                {g.plural} <Badge tone="neutral">{g.count}</Badge>
              </h3>
              <ul className="flex flex-col gap-2">
                {g.exams.map((exam) => (
                  <ExamRow
                    key={exam.id}
                    exam={exam}
                    busy={busyId === exam.id}
                    onEdit={(e) => open(e.id)}
                    onResults={(e) => show('results', e.id)}
                    onStatus={onStatus}
                    onLock={onLock}
                    onKind={onKind}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
