// Exams › Assigned: the exams the admin (the reviewer) has published from the
// question bank. Each card says what it is and how the learner has done; Take
// exam opens "Before you start", then runs it in the simulator as a timed
// sitting (the retake path, features/exams/review/retake.js), so its results,
// review and Past sittings entry are a mock's. The server tags the sitting with
// the exam when it finalises it, which is what the reviewer's results read.
// Battle with friends hosts a battle on the exam (its questions and time, set
// by the server) and opens its lobby, where friends join with the code.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { toDisplaySubject } from '@ree/shared';
import { useAuth } from '../../contexts/AuthContext';
import { Badge, Button, Card, EmptyState, Modal, Skeleton, StatusPill } from '../../components/ui';
import { ClipboardList, Clock, FileText, Play, Swords } from '../../components/ui/icons';
import { createMultiplayerBattle } from '../../services/dbQueries';
import { plainError } from '../shared-quizzes/quizFilesApi';
import { getAssignedExamRun, listAssignedExams } from './assignedExamsApi';
import { availabilityLine, byAvailability, classLine, examLength, PASS, triesLine } from './examMath';

const day = (at) => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const subjectLabel = (s) => (s === 'Mixed' ? 'Mixed subjects' : toDisplaySubject(s));

// The pill for an exam a learner can't start now.
const SHUT = { locked: { tone: 'amber', label: 'Locked' }, upcoming: { tone: 'velocity', label: 'Not open yet' }, closed: { tone: 'neutral', label: 'Closed' } };

function ExamCard({ exam, onTake, onBattle, hosting }) {
  const shut = SHUT[exam.availability];
  const when = availabilityLine(exam);
  return (
    <li className="min-w-0">
      <Card as="article" padding="md" aria-labelledby={`exam-${exam.id}`} className="flex flex-col gap-3 h-full">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="signal">{subjectLabel(exam.subject)}</Badge>
          {exam.mine
            ? <StatusPill tone={exam.mine.best >= PASS ? 'success' : 'amber'}>{triesLine(exam.mine)}</StatusPill>
            : !shut && <StatusPill tone="velocity">New</StatusPill>}
          {shut && <StatusPill tone={shut.tone}>{shut.label}</StatusPill>}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <h3 id={`exam-${exam.id}`} className="font-semibold text-textMain break-words">{exam.title}</h3>
          <p className="text-sm text-muted2">{exam.itemCount} items · {examLength(exam.timeLimitSecs)} · posted {day(exam.publishedAt)}</p>
          {exam.description && <p className="text-sm text-muted2 line-clamp-2 break-words">{exam.description}</p>}
          {exam.class && <p className="text-sm text-muted2">{classLine(exam.class)}</p>}
          {when && <p className={shut ? 'text-sm text-textMain' : 'text-sm text-muted2'}>{when}</p>}
        </div>
        {!shut && (
        <div className="mt-auto pt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button onClick={() => onTake(exam)} className="w-full" disabled={hosting}>
            <Play size={16} strokeWidth={1.75} aria-hidden="true" /> {exam.mine ? 'Take again' : 'Take exam'}
          </Button>
          <Button variant="secondary" onClick={() => onBattle(exam)} className="w-full" loading={hosting} disabled={hosting}>
            <Swords size={16} strokeWidth={1.75} aria-hidden="true" /> Battle with friends
          </Button>
        </div>
        )}
      </Card>
    </li>
  );
}

/** "Before you start": what the sitting is, then into the simulator with its questions. */
export function StartSheet({ exam, onClose }) {
  const navigate = useNavigate();
  const uid = useAuth()?.currentUser?.uid;
  const [state, setState] = useState({ loading: false, error: '' });

  const start = async () => {
    setState({ loading: true, error: '' });
    try {
      const run = await getAssignedExamRun(exam.id);
      navigate('/simulator', {
        state: {
          retake: {
            ownerUid: uid,
            kind: 'assigned',
            sourceSessionId: null,
            assigned: { id: run.id, title: run.title, timeLimitSecs: run.timeLimitSecs },
            questions: run.questions,
          },
        },
      });
    } catch (err) {
      setState({ loading: false, error: plainError(err) });
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Before you start"
      icon={FileText}
      eyebrow={exam.title}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={state.loading}>Not now</Button>
          <Button onClick={start} loading={state.loading} disabled={state.loading}>Start</Button>
        </>
      )}
    >
      <ul className="flex flex-col gap-2 text-sm text-textMain">
        <li className="flex gap-2"><ClipboardList size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-0.5 text-muted2" /> {exam.itemCount} items, each with its own order of choices. Pass mark {PASS}%.</li>
        <li className="flex gap-2"><Clock size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-0.5 text-muted2" /> {examLength(exam.timeLimitSecs)} on the clock. When it runs out, your answers are submitted.</li>
        <li className="flex gap-2"><FileText size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-0.5 text-muted2" /> Answers and explanations show after you submit.</li>
      </ul>
      <p className="text-sm text-muted2 mt-3">
        {exam.mine ? 'Your reviewer sees your first attempt; this one counts toward your best.' : 'Your reviewer sees your first attempt, so take it when you’re ready.'}
      </p>
      {state.error && <p role="alert" className="text-sm text-[var(--accent-danger)] mt-3">{state.error}</p>}
    </Modal>
  );
}

export default function AssignedExamsTab() {
  const navigate = useNavigate();
  const [state, setState] = useState({ items: null, error: '' });
  const [taking, setTaking] = useState(null);
  const [hosting, setHosting] = useState(null);

  // The server takes the exam's questions and time; the lobby shows the code to share.
  const battle = async (exam) => {
    setHosting(exam.id);
    try {
      const id = await createMultiplayerBattle({ mode: 'assigned', assignedExamId: exam.id }, exam.timeLimitSecs);
      navigate(`/battle/${id}`);
    } catch (err) {
      toast.error(plainError(err));
      setHosting(null);
    }
  };

  const load = useCallback((fresh = false) => listAssignedExams({ fresh }).then(
    (items) => setState({ items, error: '' }),
    (err) => setState({ items: null, error: plainError(err) }),
  ), []);
  useEffect(() => { load(); }, [load]);

  if (state.error) {
    return <EmptyState title="Couldn’t load the assigned exams" description={state.error} action={<Button variant="secondary" onClick={() => load(true)}>Try again</Button>} />;
  }
  if (!state.items) return <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>;
  if (state.items.length === 0) {
    return <EmptyState icon={FileText} title="No assigned exams yet" description="When your reviewer posts one, it shows here." />;
  }

  return (
    <>
      <h2 className="sr-only">Assigned exams</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[...state.items].sort(byAvailability).map((exam) => <ExamCard key={exam.id} exam={exam} onTake={setTaking} onBattle={battle} hosting={hosting === exam.id} />)}
      </ul>
      {taking && <StartSheet exam={taking} onClose={() => setTaking(null)} />}
    </>
  );
}
