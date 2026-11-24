// Admin › Assigned exams › Results: how the learners did on one exam. Each
// learner's FIRST sitting is the one that counts here (the honest one), with
// their best and how many tries beside it. Below, every question by the share
// right on first sittings, hardest first: under 30% is a hard question or a
// wrong key, and Edit opens it.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { toDisplaySubject, normalizeSubject } from '@ree/shared';
import { Button, Card, DataTable, EmptyState, Grid, KpiTile, SectionHeader, Skeleton, StatusPill } from '../../../components/ui';
import { ChevronLeft, Download, Pencil, TriangleAlert } from '../../../components/ui/icons';
import LatexRenderer from '../../../components/LatexRenderer';
import QuestionEditModal from '../../library/QuestionEditModal';
import { fetchQuestionById, updateQuestionInBank } from '../../../services/dbQueries';
import { plainError } from '../../shared-quizzes/quizFilesApi';
import { getAdminExamResults } from '../assignedExamsApi';
import { PASS } from '../examMath';
import { canDownloadFiles, copyText, downloadBlob } from '../../exam-export/deliver';
import { examResultsCsv, resultsFileName } from './resultsCsv';

const HARD = 30;
const day = (at) => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const tone = (pct) => (pct >= PASS ? 'success' : pct >= 50 ? 'amber' : 'danger');

const COLUMNS = [
  { key: 'displayName', label: 'Learner', sortable: true },
  { key: 'first', label: 'First try', align: 'right', sortable: true, render: (r) => <StatusPill tone={tone(r.first)}>{r.first}%</StatusPill> },
  { key: 'best', label: 'Best', align: 'right', sortable: true, render: (r) => `${r.best}%` },
  { key: 'attempts', label: 'Tries', align: 'right', sortable: true },
  { key: 'last', label: 'Last taken', align: 'right', sortable: true, render: (r) => day(r.last) },
  { key: 'firstMode', label: 'First taken', render: (r) => (r.firstMode === 'BATTLE' ? 'In a battle' : 'Alone') },
];

function ItemRow({ item, onEdit, busy }) {
  const q = item.question;
  const hard = item.pct < HARD;
  return (
    <li>
      <Card variant="inset" padding="sm" className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 sm:w-28">
          <StatusPill tone={tone(item.pct)}>{item.pct}% right</StatusPill>
          <span className="text-xs text-muted2 tabular-nums">{item.correct} of {item.answered}</span>
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
          {q ? (
            <>
              <p className="text-xs text-muted2">{toDisplaySubject(normalizeSubject(q.subject))} · {q.subtopic || 'Uncategorized'}</p>
              <div className="text-sm text-textMain leading-relaxed line-clamp-3 min-w-0 break-words"><LatexRenderer content={q.text} /></div>
            </>
          ) : <p className="text-sm text-muted2">This question was deleted from the bank.</p>}
          {hard && q && (
            <p className="text-xs text-textMain flex items-center gap-1.5">
              <TriangleAlert size={14} strokeWidth={1.75} aria-hidden="true" className="text-[var(--color-reeAmber-text)] shrink-0" />
              Hard, or a wrong key? Check it.
            </p>
          )}
        </div>
        {q && (
          <Button size="sm" variant="secondary" className="self-start" onClick={() => onEdit(item)} disabled={busy} aria-label={`Edit question: ${String(q.text || '').slice(0, 50)}`}>
            <Pencil size={14} strokeWidth={1.75} aria-hidden="true" /> Edit
          </Button>
        )}
      </Card>
    </li>
  );
}

export default function ExamResults({ examId, onBack }) {
  const [state, setState] = useState({ data: null, error: '' });
  const [editing, setEditing] = useState(null);
  const [edit, setEdit] = useState({ saving: false, error: '' });
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let live = true;
    getAdminExamResults(examId).then(
      (data) => { if (live) setState({ data, error: '' }); },
      (err) => { if (live) setState({ data: null, error: plainError(err) }); },
    );
    return () => { live = false; };
  }, [examId]);

  const onEdit = async (item) => {
    setBusyId(item.questionId);
    try {
      setEditing(await fetchQuestionById(item.questionId));
      setEdit({ saving: false, error: '' });
    } catch (err) {
      toast.error(`Couldn’t open that question: ${plainError(err)}`);
    }
    setBusyId(null);
  };
  const saveEdit = async (q) => {
    setEdit({ saving: true, error: '' });
    try {
      await updateQuestionInBank(q.id, q);
      toast.success('Question saved. New sittings get the change.');
      setEditing(null);
      setEdit({ saving: false, error: '' });
    } catch (err) {
      setEdit({ saving: false, error: `Couldn’t save: ${plainError(err)}` });
    }
  };

  const [saved, setSaved] = useState('');
  const deliver = async () => {
    const csv = examResultsCsv(state.data);
    const name = resultsFileName(state.data.exam);
    if (canDownloadFiles()) {
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), name);
      setSaved(`Downloaded ${name}.`);
    } else {
      setSaved((await copyText(csv)) ? `Copied ${name}. Paste it into a spreadsheet.` : `Couldn’t copy ${name}.`);
    }
  };

  const back = (
    <Button variant="ghost" size="sm" onClick={onBack}>
      <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" /> All assigned exams
    </Button>
  );
  if (state.error) return <EmptyState title="Couldn’t load the results" description={state.error} action={back} />;
  if (!state.data) return <div className="flex flex-col gap-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;

  const { exam, takers, average, passed, learners, items } = state.data;
  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title={exam.title}
        description={`Results · ${exam.itemCount} items. Each learner’s first try counts; best and tries are beside it.`}
        actions={(
          <>
            {takers > 0 && (
              <Button variant="secondary" size="sm" onClick={deliver}>
                <Download size={14} strokeWidth={1.75} aria-hidden="true" /> {canDownloadFiles() ? 'Download CSV' : 'Copy as CSV'}
              </Button>
            )}
            {back}
          </>
        )}
      />
      {saved && <p role="status" className="text-sm text-muted2">{saved}</p>}
      {takers === 0 ? (
        <EmptyState title="No one has taken it yet" description={exam.status === 'published' ? 'Results show here as learners finish it.' : 'It’s a draft: publish it so learners can take it.'} />
      ) : (
        <>
          <Grid kind="kpi" gap="sm">
            <KpiTile compact label="Took it" value={takers} />
            <KpiTile compact label="Average, first try" value={average} suffix="%" />
            <KpiTile compact label={`Passed (${PASS}%+)`} value={passed} hint={`of ${takers}`} />
          </Grid>
          <section aria-labelledby="results-learners" className="flex flex-col gap-3">
            <h3 id="results-learners" className="text-eyebrow text-muted2">Learners</h3>
            <DataTable columns={COLUMNS} rows={learners} rowKey={(r) => r.userId} initialSort={{ key: 'first', dir: 'desc' }} />
          </section>
          <section aria-labelledby="results-items" className="flex flex-col gap-3">
            <h3 id="results-items" className="text-eyebrow text-muted2">Questions, hardest first</h3>
            <ol className="flex flex-col gap-2">
              {items.map((item) => <ItemRow key={item.questionId} item={item} onEdit={onEdit} busy={busyId === item.questionId} />)}
            </ol>
          </section>
        </>
      )}
      <QuestionEditModal
        question={editing}
        onChange={setEditing}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
        saving={edit.saving}
        error={edit.error}
      />
    </div>
  );
}
