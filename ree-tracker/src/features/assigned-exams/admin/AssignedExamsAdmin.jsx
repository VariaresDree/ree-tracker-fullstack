// Admin › Assigned exams: the exams the admin has put together from the bank,
// drafts and published, and the builder for a new one or an edit (?exam=new
// or ?exam=<id>, so Back leaves the builder). Learners see only published ones.
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { toDisplaySubject } from '@ree/shared';
import { Button, Card, EmptyState, SectionHeader, Skeleton, StatusPill } from '../../../components/ui';
import { ClipboardList, Pencil, Plus, Trash2 } from '../../../components/ui/icons';
import { examLength } from '../examMath';
import { plainError } from '../../shared-quizzes/quizFilesApi';
import { deleteAdminExam, listAdminExams, setAdminExamStatus } from '../assignedExamsApi';
import ExamBuilder from './ExamBuilder';

const day = (at) => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function ExamRow({ exam, busy, onEdit, onStatus, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const published = exam.status === 'published';
  const subject = exam.subject === 'Mixed' ? 'Mixed subjects' : toDisplaySubject(exam.subject);
  return (
    <li>
      <Card padding="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h3 className="font-semibold text-textMain break-words min-w-0">{exam.title}</h3>
            <StatusPill tone={published ? 'success' : 'neutral'}>{published ? 'Published' : 'Draft'}</StatusPill>
          </div>
          <p className="text-sm text-muted2">
            {exam.itemCount} items · {examLength(exam.timeLimitSecs)} · {subject}
            {' · '}{published ? `posted ${day(exam.publishedAt)}` : `saved ${day(exam.updatedAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {confirmDelete ? (
            <>
              <Button size="sm" variant="ghost" tone="danger" onClick={() => onDelete(exam)} loading={busy} disabled={busy}>Delete for good</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>Keep it</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => onEdit(exam)} disabled={busy}>
                <Pencil size={14} strokeWidth={1.75} aria-hidden="true" /> Edit
              </Button>
              <Button size="sm" variant={published ? 'secondary' : 'primary'} onClick={() => onStatus(exam, published ? 'draft' : 'published')} loading={busy} disabled={busy}>
                {published ? 'Unpublish' : 'Publish'}
              </Button>
              <Button size="sm" variant="ghost" tone="danger" onClick={() => setConfirmDelete(true)} disabled={busy} aria-label={`Delete ${exam.title}`}>
                <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </Card>
    </li>
  );
}

export default function AssignedExamsAdmin() {
  const [params, setParams] = useSearchParams();
  const editing = params.get('exam');
  const [state, setState] = useState({ items: null, error: '' });
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => listAdminExams().then(
    (items) => setState({ items, error: '' }),
    (err) => setState({ items: null, error: plainError(err) }),
  ), []);
  useEffect(() => { if (!editing) load(); }, [editing, load]);

  const open = (id) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    if (id) next.set('exam', id); else next.delete('exam');
    return next;
  });

  const onStatus = async (exam, status) => {
    setBusyId(exam.id);
    try {
      const saved = await setAdminExamStatus(exam.id, status);
      setState((s) => ({ ...s, items: s.items.map((e) => (e.id === exam.id ? { ...e, ...saved } : e)) }));
      toast.success(status === 'published' ? 'Published for every learner.' : 'Back to draft. Learners no longer see it.');
    } catch (err) {
      toast.error(plainError(err));
    }
    setBusyId(null);
  };

  const onDelete = async (exam) => {
    setBusyId(exam.id);
    try {
      await deleteAdminExam(exam.id);
      setState((s) => ({ ...s, items: s.items.filter((e) => e.id !== exam.id) }));
      toast.success('Exam deleted. Past sittings keep their results.');
    } catch (err) {
      toast.error(plainError(err));
    }
    setBusyId(null);
  };

  if (editing) return <ExamBuilder key={editing} examId={editing === 'new' ? null : editing} onDone={() => open(null)} />;

  const newButton = (
    <Button onClick={() => open('new')}>
      <Plus size={16} strokeWidth={2} aria-hidden="true" /> New exam
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Assigned exams"
        description="Put an exam together from the question bank. Once published, every learner finds it in Exams › Assigned and can take it alone or as a battle."
        actions={state.items?.length ? newButton : null}
      />
      {state.error ? (
        <EmptyState title="Couldn’t load the exams" description={state.error} action={<Button variant="secondary" onClick={load}>Try again</Button>} />
      ) : !state.items ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : state.items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No exams yet" description="Pick questions from the bank, set the time, and publish it for your learners." action={newButton} />
      ) : (
        <ul className="flex flex-col gap-3">
          {state.items.map((exam) => (
            <ExamRow key={exam.id} exam={exam} busy={busyId === exam.id} onEdit={(e) => open(e.id)} onStatus={onStatus} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}
