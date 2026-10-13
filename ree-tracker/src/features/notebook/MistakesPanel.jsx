// src/features/notebook/MistakesPanel.jsx
//
// Library › Notebook › Mistakes: every question you got wrong (not left
// blank), newest first, built from your answers, so there's no list to keep
// up. Each shows your answer beside the key, the solution and an AI
// explanation, how many times you've missed it, and why: tag the cause, and
// the top line says what most of your misses come down to. A mistake reads
// Fixed once you answer it right again, or you mark it fixed; missing it again
// reopens it. "Practise these" runs the ones on screen as a Practice session.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MISTAKE_CAUSES, MISTAKE_CAUSE_LABELS, isMarkedFixed, toDisplaySubject } from '@ree/shared';
import { Badge, Button, Card, EmptyState, FormField, SegmentedControl, Select, Skeleton } from '../../components/ui';
import { CheckCircle2, CloudOff, Play, RotateCcw, TriangleAlert, NotebookPen } from '../../components/ui/icons';
import LatexRenderer from '../../components/LatexRenderer';
import SmartText from '../../components/SmartText';
import SolutionPanel from '../quiz/SolutionPanel';
import { useAiExplanation } from '../quiz/useAiExplanation';
import { explanationKey } from '../../services/aiExplanations';
import { itemsPreset, launchPractice } from '../active-recall/presets';
import { reviewItemToQuestion } from '../exams/review/retake';
import { useMistakes } from './useMistakes';
import CauseChips from './CauseChips';
import NoteButton, { NoteView } from './NoteButton';
import { questionTarget } from './targets';
import { causeSummary } from './causeSummary';

const PAGE = 10;
const PRACTICE_MAX = 20;
const SUBJECTS = ['Mathematics', 'ESAS', 'EE'];
const UNTAGGED = 'untagged';

const shortDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function MistakeCard({ item, expanded, onToggle, onTag, isOnline, ai }) {
  const question = reviewItemToQuestion(item);
  const [busy, setBusy] = useState(false);
  const tag = async (next) => {
    setBusy(true);
    try {
      await onTag(item.questionId, next);
    } catch {
      toast.error("Couldn't save that. Try again.");
    }
    setBusy(false);
  };
  // Marked fixed, and no miss since (a later miss reopens it).
  const resolved = isMarkedFixed(item);

  return (
    <Card as="li" className="p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2 items-center text-xs text-muted2 min-w-0">
          <Badge tone="signal">{toDisplaySubject(item.subject) || 'General'}</Badge>
          {item.topic && <span className="truncate max-w-[14rem]">{item.topic}</span>}
          <span className="tabular-nums">Missed {item.timesWrong === 1 ? 'once' : `${item.timesWrong} times`} · last {shortDate(item.lastWrongAt)}</span>
          {item.fixed && <Badge tone="success">Fixed</Badge>}
        </div>
        <NoteButton type="question" targetId={item.questionId} target={questionTarget(question)} className="shrink-0" />
      </div>

      <div className={`text-sm text-textMain leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
        <SmartText text={item.text} />
      </div>

      {expanded && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-[var(--radius-default)] border" style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 40%, transparent)' }}>
              <span className="text-eyebrow block mb-1" style={{ color: 'var(--accent-danger)' }}>Your last answer</span>
              <div className="text-sm text-textMain [&_p]:!m-0 overflow-x-auto">
                {item.lastAnswer
                  ? <span className="line-through"><LatexRenderer inline content={item.lastAnswer} /></span>
                  : <span className="text-muted2">Not recorded</span>}
              </div>
            </div>
            <div className="p-3 rounded-[var(--radius-default)] border" style={{ borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)' }}>
              <span className="text-eyebrow block mb-1" style={{ color: 'var(--accent-success)' }}>Correct answer</span>
              <div className="text-sm font-semibold text-textMain [&_p]:!m-0 overflow-x-auto"><LatexRenderer content={item.correctAnswer || '—'} /></div>
            </div>
          </div>
          <SolutionPanel
            key={explanationKey(question)}
            question={question}
            isOnline={isOnline}
            aiText={ai.textFor(question)}
            aiLoading={ai.isLoading(question)}
            onExplain={(force) => ai.explain(question, { force })}
            showAnswer
          />
          <NoteView type="question" targetId={item.questionId} target={questionTarget(question)} />
        </div>
      )}

      <CauseChips value={item.cause} suggested={item.suggestedCause} disabled={busy} onChange={(cause) => tag({ cause, resolved })} />

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button size="sm" variant="secondary" aria-expanded={expanded} onClick={() => onToggle(item.questionId)}>
          {expanded ? 'Hide answer' : 'Show answer and solution'}
        </Button>
        {!item.fixed ? (
          <Button size="sm" variant="ghost" tone="success" disabled={busy} onClick={() => tag({ cause: item.cause, resolved: true })}>
            <CheckCircle2 size={14} strokeWidth={1.75} aria-hidden="true" /> Mark fixed
          </Button>
        ) : resolved && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => tag({ cause: item.cause, resolved: false })}>
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" /> Reopen
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function MistakesPanel({ currentUser, isOnline }) {
  const navigate = useNavigate();
  const ai = useAiExplanation(currentUser?.uid);
  const { items, truncated, status, setTag, reload } = useMistakes();
  const [show, setShow] = useState('open');
  const [subject, setSubject] = useState('all');
  const [cause, setCause] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [limit, setLimit] = useState(PAGE);

  const all = useMemo(() => items || [], [items]);
  const bySubject = useMemo(() => all.filter((i) => subject === 'all' || i.subject === subject), [all, subject]);
  const counts = useMemo(() => ({
    open: bySubject.filter((i) => !i.fixed).length,
    fixed: bySubject.filter((i) => i.fixed).length,
    all: bySubject.length,
  }), [bySubject]);
  const shown = useMemo(() => bySubject
    .filter((i) => (show === 'all' ? true : show === 'fixed' ? i.fixed : !i.fixed))
    .filter((i) => (cause === 'all' ? true : cause === UNTAGGED ? !i.cause : i.cause === cause)), [bySubject, show, cause]);
  const summary = useMemo(() => causeSummary(all.filter((i) => !i.fixed)), [all]);
  const reset = (fn) => (v) => { fn(v); setLimit(PAGE); };

  if (items == null) {
    if (status === 'loading') {
      return (
        <div role="status" className="flex flex-col gap-3">
          <span className="sr-only">Loading your mistakes…</span>
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-[var(--radius-lg)]" />)}
        </div>
      );
    }
    const offline = status === 'offline' || !isOnline;
    return (
      <EmptyState
        icon={offline ? CloudOff : TriangleAlert}
        title={offline ? 'Your mistakes need a connection' : "Couldn't load your mistakes"}
        description={offline ? 'Reconnect once and they open offline after that.' : 'Something went wrong on our side or the connection dropped.'}
        action={<Button onClick={reload}>Try again</Button>}
      />
    );
  }

  if (all.length === 0) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="No mistakes yet"
        description="Questions you answer wrong in Practice, a mock board, a battle or the Gauntlet collect here, with the solution and a place to note why."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted2">
          {counts.open} open · {counts.fixed} fixed{truncated ? ' (your newest 300)' : ''}. A mistake reads Fixed once you answer it right again.
        </p>
        {summary && <p className="text-sm text-textMain">{summary}</p>}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <SegmentedControl
          label="Show"
          value={show}
          onChange={reset(setShow)}
          options={[
            { value: 'open', label: `Open ${counts.open}` },
            { value: 'fixed', label: `Fixed ${counts.fixed}` },
            { value: 'all', label: `All ${counts.all}` },
          ]}
        />
        <SegmentedControl
          label="Subject"
          value={subject}
          onChange={reset(setSubject)}
          options={[{ value: 'all', label: 'All subjects' }, ...SUBJECTS.map((s) => ({ value: s, label: toDisplaySubject(s) }))]}
        />
        <FormField label="Cause" className="lg:w-48">
          <Select value={cause} onChange={(e) => reset(setCause)(e.target.value)}>
            <option value="all">Any cause</option>
            {MISTAKE_CAUSES.map((c) => <option key={c} value={c}>{MISTAKE_CAUSE_LABELS[c]}</option>)}
            <option value={UNTAGGED}>Not tagged yet</option>
          </Select>
        </FormField>
        <Button
          className="lg:ml-auto"
          onClick={() => launchPractice(navigate, itemsPreset(shown.slice(0, PRACTICE_MAX).map(reviewItemToQuestion)))}
          disabled={shown.length === 0}
        >
          <Play size={14} strokeWidth={2} aria-hidden="true" /> Practise these{shown.length > PRACTICE_MAX ? ` (first ${PRACTICE_MAX})` : ''}
        </Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          compact
          icon={CheckCircle2}
          title={show === 'open' ? 'Nothing open here' : 'Nothing here'}
          description={show === 'open' ? 'Every mistake in this view is fixed. Change the filters to see them.' : 'Change the filters to see more.'}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {shown.slice(0, limit).map((item) => (
              <MistakeCard
                key={item.questionId}
                item={item}
                expanded={expandedId === item.questionId}
                onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                onTag={setTag}
                isOnline={isOnline}
                ai={ai}
              />
            ))}
          </ul>
          {shown.length > limit && (
            <Button variant="ghost" className="self-start" onClick={() => setLimit((n) => n + PAGE)}>
              Show {Math.min(PAGE, shown.length - limit)} more
            </Button>
          )}
        </>
      )}
    </div>
  );
}
