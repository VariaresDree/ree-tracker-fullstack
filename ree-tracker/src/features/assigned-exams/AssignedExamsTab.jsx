// Exams › Assigned: the exams the admin (the reviewer) has published from the
// question bank. Each card says what it is and how the learner has done; Take
// exam opens "Before you start", then runs it in the simulator as a timed
// sitting (the retake path, features/exams/review/retake.js), so its results,
// review and Past sittings entry are a mock's. The server tags the sitting with
// the exam when it finalises it, which is what the reviewer's results read.
// Battle with friends hosts a battle on the exam (its questions and time, set
// by the server) and opens its lobby, where friends join with the code.
//
// The list (2026-11-25): chips for each kind the reviewer posted (Exams,
// Quizzes, Problem sets, Practice sets) with counts, then four parts: To take,
// Taken, Coming up, Locked or closed. Each exam is a compact row. Subject and
// Topic pickers narrow it further (SubjectTopicFilters), and each row names
// the topics it covers.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { toDisplaySubject } from '@ree/shared';
import { useAuth } from '../../contexts/AuthContext';
import { Badge, Button, Card, EmptyState, Modal, Skeleton, StatusPill } from '../../components/ui';
import { ClipboardList, Clock, FileText, Play, Swords } from '../../components/ui/icons';
import { createMultiplayerBattle } from '../../services/dbQueries';
import { plainError } from '../shared-quizzes/quizFilesApi';
import { getAssignedExamRun, listAssignedExams } from './assignedExamsApi';
import { availabilityLine, classLine, coversFilter, examLength, kindCounts, kindOf, learnerSection, LEARNER_SECTIONS, PASS, sectionOrder, topicsLine, triesLine } from './examMath';
import SubjectTopicFilters from './SubjectTopicFilters';

const day = (at) => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const subjectLabel = (s) => (s === 'Mixed' ? 'Mixed subjects' : toDisplaySubject(s));

// The pill for an exam a learner can't start now.
const SHUT = { locked: { tone: 'amber', label: 'Locked' }, upcoming: { tone: 'velocity', label: 'Not open yet' }, closed: { tone: 'neutral', label: 'Closed' } };

function ExamRow({ exam, onTake, onBattle, hosting }) {
  const shut = SHUT[exam.availability];
  const when = availabilityLine(exam);
  const kind = kindOf(exam.kind);
  return (
    <li className="min-w-0">
      <Card as="article" padding="sm" aria-labelledby={`exam-${exam.id}`} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{kind.label}</Badge>
            <Badge tone="signal">{subjectLabel(exam.subject)}</Badge>
            {exam.mine
              ? <StatusPill tone={exam.mine.best >= PASS ? 'success' : 'amber'}>{triesLine(exam.mine)}</StatusPill>
              : !shut && <StatusPill tone="velocity">New</StatusPill>}
            {shut && <StatusPill tone={shut.tone}>{shut.label}</StatusPill>}
          </div>
          <p id={`exam-${exam.id}`} className="font-semibold text-textMain break-words">{exam.title}</p>
          <p className="text-sm text-muted2">{exam.itemCount} items · {examLength(exam.timeLimitSecs)} · posted {day(exam.publishedAt)}</p>
          {exam.topics?.length > 0 && <p className="text-sm text-muted2 break-words">{topicsLine(exam.topics)}</p>}
          {exam.description && <p className="text-sm text-muted2 line-clamp-2 break-words">{exam.description}</p>}
          {exam.class && <p className="text-sm text-muted2">{classLine(exam.class)}</p>}
          {when && <p className={shut ? 'text-sm text-textMain' : 'text-sm text-muted2'}>{when}</p>}
        </div>
        {!shut && (
          <div className="grid grid-cols-1 gap-2 shrink-0 sm:grid-cols-2 sm:w-auto">
            <Button size="sm" onClick={() => onTake(exam)} className="w-full" disabled={hosting}>
              <Play size={14} strokeWidth={1.75} aria-hidden="true" /> {exam.mine ? 'Take again' : `Take ${kind.label.toLowerCase()}`}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onBattle(exam)} className="w-full" loading={hosting} disabled={hosting}>
              <Swords size={14} strokeWidth={1.75} aria-hidden="true" /> Battle with friends
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
  const [kindFilter, setKindFilter] = useState('all');
  const [subject, setSubject] = useState('all');
  const [topic, setTopic] = useState('all');

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

  const items = state.items;
  const kinds = kindCounts(items);
  const sections = useMemo(() => {
    const shown = (items || []).filter((e) => (kindFilter === 'all' || kindOf(e.kind).value === kindFilter) && coversFilter(e, subject, topic));
    return LEARNER_SECTIONS
      .map((sec) => ({ ...sec, exams: shown.filter((e) => learnerSection(e) === sec.id).sort(sectionOrder) }))
      .filter((sec) => sec.exams.length > 0);
  }, [items, kindFilter, subject, topic]);
  const clear = () => { setKindFilter('all'); setSubject('all'); setTopic('all'); };

  if (state.error) {
    return <EmptyState title="Couldn’t load the assigned exams" description={state.error} action={<Button variant="secondary" onClick={() => load(true)}>Try again</Button>} />;
  }
  if (!state.items) return <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>;
  if (state.items.length === 0) {
    return <EmptyState icon={FileText} title="No assigned exams yet" description="When your reviewer posts one, it shows here." />;
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="sr-only">Assigned exams</h2>
      {kinds.length > 1 && (
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          {[{ value: 'all', plural: 'All', count: items.length }, ...kinds].map((k) => (
            <Button
              key={k.value}
              size="sm"
              variant={kindFilter === k.value ? 'primary' : 'secondary'}
              aria-pressed={kindFilter === k.value}
              onClick={() => setKindFilter(k.value)}
            >
              {k.plural} <span className="tabular-nums opacity-80">{k.count}</span>
            </Button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 empty:hidden min-[400px]:grid-cols-2 sm:max-w-xl">
        <SubjectTopicFilters items={items} subject={subject} topic={topic} onSubject={setSubject} onTopic={setTopic} />
      </div>
      {sections.length === 0 && (
        <EmptyState
          compact
          title="No exams match"
          description="Try another subject, topic or type."
          action={<Button variant="secondary" size="sm" onClick={clear}>Clear filters</Button>}
        />
      )}
      {sections.map((sec) => (
        <section key={sec.id} aria-labelledby={`section-${sec.id}`} className="flex flex-col gap-2">
          <h3 id={`section-${sec.id}`} className="text-eyebrow text-muted2 flex items-center gap-2">
            {sec.title} <Badge tone="neutral">{sec.exams.length}</Badge>
          </h3>
          <ul className="flex flex-col gap-2">
            {sec.exams.map((exam) => <ExamRow key={exam.id} exam={exam} onTake={setTaking} onBattle={battle} hosting={hosting === exam.id} />)}
          </ul>
        </section>
      ))}
      {taking && <StartSheet exam={taking} onClose={() => setTaking(null)} />}
    </div>
  );
}
