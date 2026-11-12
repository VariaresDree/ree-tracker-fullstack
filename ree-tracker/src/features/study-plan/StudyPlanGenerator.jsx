// src/features/study-plan/StudyPlanGenerator.jsx
//
// Progress › Study plan: builds the next six weeks of tasks from mastery and
// the PRC weights. The exam date is read here and set in Account › Exam plan.
//
// "Clear plan" asks first (it deletes every generated task, ticked or not, in
// one tap), the subject chips say whether they're on, and it is built from the
// shared primitives (it was hand-rolled, with an emoji on its button).
//
// The server also weighs open mistakes and the formula cards due, and says
// what it used; focus time is shown beside it, never fed in (it's display
// only by design: self-reported minutes don't steer the engine).
//
// With a plan (2026-11-12) the card says what it holds from today, when it
// runs out and when it was made, from the tasks already loaded, and asks for a
// re-plan when it is a week old or about to run out before the exam. Before,
// a made plan looked exactly like no plan: the same pitch, a toast, and
// "Clear plan" offered with nothing to clear.
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import { normalizeSubject, toDisplaySubject } from '@ree/shared';
import { useStore } from '../../store/useStore';
import { generateStudyPlan, clearStudyPlan } from '../../services/dbQueries';
import { planTopics } from './planTopics';
import { useDeepAnalytics } from '../analytics/useDeepAnalytics';
import { focusGapLine } from '../analytics/sections/focusGap';
import { TOS_WEIGHTS } from '../../utils/tosWeights';
import { manilaDateOf, todayManila } from '../../utils/manilaDate';
import { daysToExam } from '../today/todayActions';
import { planSummary } from '../profile/plannerTasks';
import { dayLabel } from './keyDateLabels';
import { Badge, Button, Card, CardTitle, Modal, cn } from '../../components/ui';
import { CalendarDays, Check, TriangleAlert } from '../../components/ui/icons';

const PLAN_DAYS = 42;
// One empty syllabus for every render (a fresh `{}` re-ran the topic memo).
const NO_TOS = {};
const NO_TASKS = [];
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function PlanStatus({ summary, topicCount }) {
  const parts = [
    summary.drills > 0 && `${plural(summary.drills, 'drill')} on ${summary.topics === topicCount ? `all ${topicCount}` : `${summary.topics} of ${topicCount}`} topics`,
    summary.sittings > 0 && plural(summary.sittings, 'timed sitting'),
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-1" data-plan-status>
      <p className="text-sm text-textMain">
        {summary.over
          ? <>Your last plan ended {dayLabel(summary.endsOn)}.</>
          : <>Runs to <span className="font-semibold">{dayLabel(summary.endsOn)}</span> · {plural(summary.left, 'task')} left</>}
      </p>
      {!summary.over && parts.length > 0 && <p className="text-sm text-muted2 tabular-nums">{parts.join(' · ')}</p>}
      {summary.madeOn && <p className="text-xs text-muted2">Made {summary.ageDays === 0 ? 'today' : dayLabel(summary.madeOn)}.</p>}
    </div>
  );
}

// `calendarChanged`: key dates or rest days changed since the plan was made,
// so the plan offers to re-plan (a plan doesn't follow them on its own).
// `tasks`: the planner's tasks (StrategicPlannerTab loads them).
export default function StudyPlanGenerator({ onPlanGenerated, calendarChanged = false, tasks = NO_TASKS, className }) {
  const { dynamicTOS, stats } = useStore(
    useShallow((s) => ({ dynamicTOS: s.dynamicTOS, stats: s.stats })),
  );
  const safeTOS = dynamicTOS || NO_TOS;

  // The exam date is set in one place, Account → Exam plan; the planner reads
  // it (it used to keep its own editable copy, a third editor for one field).
  const examDate = stats?.examDate || '';
  const [selectedSubjects, setSelectedSubjects] = useState(['Mathematics', 'ESAS', 'EE']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  // What the last plan was built from (the generate response).
  const [builtFrom, setBuiltFrom] = useState(null);
  const { data: focus } = useDeepAnalytics('focus-time');
  const focusLine = focus?.boardMinutes > 0 ? focusGapLine(focus.shares) : null;

  // Manila days, as the server and Today count them (the browser's clock
  // could be a day off near midnight).
  const today = todayManila();
  const daysUntilExam = useMemo(() => {
    const n = daysToExam(examDate);
    return n === null ? null : Math.max(0, n);
  }, [examDate]);
  const topicsToGenerate = useMemo(() => planTopics(safeTOS, selectedSubjects), [selectedSubjects, safeTOS]);
  const summary = useMemo(() => planSummary(tasks, today, examDate, manilaDateOf), [tasks, today, examDate]);
  const hasPlan = !!summary && !summary.over;

  const handleGenerate = async () => {
    if (!examDate) return toast.error('Set your exam date in Account first.');
    if (topicsToGenerate.length === 0) return toast.error('Pick at least one subject.');
    if (daysUntilExam <= 0) return toast.error('The exam date has to be in the future.');

    setIsGenerating(true);
    try {
      const result = await generateStudyPlan(examDate, topicsToGenerate);
      setBuiltFrom({
        openMistakes: result.openMistakes || 0,
        cardsDue: result.cardsDue || 0,
        restDays: result.restDays || 0,
        keyDates: result.keyDates || 0,
        lectures: result.lectures || 0,
      });
      const kept = result.kept ? ` Kept ${plural(result.kept, 'task')} you'd done.` : '';
      const from = result.startsOn && result.startsOn !== today ? ' Today’s is done, so it starts tomorrow.' : '';
      toast.success(`Planned ${plural(result.tasksCreated, 'task')}.${kept}${from}`);
      onPlanGenerated?.();
    } catch (error) {
      toast.error(error?.message?.includes('[OFFLINE]') ? 'Generating a plan needs a connection.' : "Couldn't generate the plan. Try again.");
    }
    setIsGenerating(false);
  };

  const handleClear = async () => {
    setConfirmClear(false);
    setIsClearing(true);
    try {
      const result = await clearStudyPlan();
      toast.success(`Removed ${plural(result.deleted, 'plan task')}.`);
      setBuiltFrom(null);
      onPlanGenerated?.();
    } catch {
      toast.error("Couldn't clear the plan. Try again.");
    }
    setIsClearing(false);
  };

  const toggleSubject = (subject) => {
    setSelectedSubjects((prev) => (prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]));
  };

  const daysTone = daysUntilExam === null ? null : daysUntilExam <= 30 ? 'danger' : daysUntilExam <= 90 ? 'amber' : 'success';
  // Why to re-plan now, the most pressing first.
  const nudge = calendarChanged
    ? 'Your key dates or rest days changed. Re-plan so the plan works around them.'
    : hasPlan && summary.runsOut
      ? `It runs out ${dayLabel(summary.endsOn)}, before your exam. Re-plan to set the next weeks.`
      : hasPlan && summary.stale
        ? `Made ${summary.ageDays} days ago. Re-plan so it follows how you’ve done since.`
        : null;
  const canGenerate = !isGenerating && !!examDate && daysUntilExam > 0 && topicsToGenerate.length > 0;

  return (
    <Card padding="md" className={cn('flex flex-col gap-4', className)}>
      <div className="min-w-0">
        <CardTitle size="lg">{hasPlan ? 'Your study plan' : 'Study plan'}</CardTitle>
        {!hasPlan && (
          <p className="text-sm text-muted2 mt-1 max-w-prose">
            Six weeks of tasks from your mastery and the PRC weights: a drill most days (two topics a day when there are more topics than days),
            a timed sitting each week, and formula cards when they’re due. Tasks tick themselves off as you answer.
          </p>
        )}
      </div>

      {summary && <PlanStatus summary={summary} topicCount={topicsToGenerate.length} />}

      <div>
        <p className="text-eyebrow mb-2">Board exam date</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-textMain tabular-nums">{examDate || 'Not set'}</span>
          {daysTone && <Badge tone={daysTone} className="tabular-nums">{daysUntilExam === 1 ? '1 day' : `${daysUntilExam} days`}</Badge>}
          <Link to="/account#exam-plan" className="text-sm text-[var(--accent-text)] hover:underline touch-target inline-flex items-center">
            {examDate ? 'Change' : 'Set your exam date'}
          </Link>
        </div>
      </div>

      <fieldset>
        <legend className="text-eyebrow mb-2">Subjects to include</legend>
        {/* Three across, even on a phone (one per row there took 300px). */}
        <div className="grid grid-cols-3 gap-2">
          {Object.keys(safeTOS).map((subject) => {
            const weight = TOS_WEIGHTS[normalizeSubject(subject)];
            const on = selectedSubjects.includes(subject);
            const topicCount = (safeTOS[subject] || []).length;
            return (
              <Button
                key={subject}
                size="sm"
                variant={on ? 'outline' : 'secondary'}
                className="tabular-nums h-auto min-w-0 flex-col gap-0.5 py-2"
                aria-pressed={on}
                onClick={() => toggleSubject(subject)}
              >
                <span className="inline-flex items-center gap-1">
                  {on && <Check size={14} strokeWidth={2} aria-hidden="true" />}
                  {toDisplaySubject(subject)}
                </span>
                <span className="text-muted2 font-normal text-xs">{Math.round((weight || 0) * 100)}% · {topicCount} topics</span>
              </Button>
            );
          })}
        </div>
      </fieldset>

      {(builtFrom || focusLine) && (
        <div className="flex flex-col gap-1 text-sm">
          {builtFrom && (
            <p className="text-textMain">
              Built from your mastery, {builtFrom.openMistakes} open mistake{builtFrom.openMistakes === 1 ? '' : 's'} and {builtFrom.cardsDue} formula card{builtFrom.cardsDue === 1 ? '' : 's'} due in the next two weeks.
              {(builtFrom.restDays > 0 || builtFrom.keyDates > 0 || builtFrom.lectures > 0) && (
                <>
                  {' '}Planned around {[
                    builtFrom.restDays > 0 && `${builtFrom.restDays} rest day${builtFrom.restDays === 1 ? '' : 's'}`,
                    builtFrom.keyDates > 0 && `${builtFrom.keyDates} key date${builtFrom.keyDates === 1 ? '' : 's'}`,
                    builtFrom.lectures > 0 && `${builtFrom.lectures} lecture day${builtFrom.lectures === 1 ? '' : 's'}`,
                  ].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' and $1')}.
                </>
              )}
            </p>
          )}
          {focusLine && <p className="text-muted2">From your focus time: {focusLine}</p>}
        </div>
      )}

      {/* One line instead of three tiles: "Days left" repeated the badge
          beside the exam date. */}
      {!hasPlan && daysUntilExam > 0 && topicsToGenerate.length > 0 && (
        <p className="text-sm text-muted2 tabular-nums" data-plan-scope>
          Plans the next <span className="font-semibold text-textMain">{Math.min(daysUntilExam, PLAN_DAYS)} days</span> across{' '}
          <span className="font-semibold text-textMain">{topicsToGenerate.length} topics</span>.
        </p>
      )}

      {nudge && (
        <p role="status" className="text-sm text-[var(--color-reeAmber-text)]">{nudge}</p>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <Button
          fullWidth
          size="lg"
          variant={hasPlan && !nudge ? 'secondary' : 'primary'}
          onClick={handleGenerate}
          loading={isGenerating}
          disabled={!canGenerate}
        >
          {!isGenerating && <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />}
          {isGenerating ? 'Planning…' : hasPlan || calendarChanged ? 'Re-plan' : 'Generate study plan'}
        </Button>
      </div>
      {summary && (
        <div className="flex items-center justify-between gap-3 -mt-2">
          <p className="text-xs text-muted2">{hasPlan ? 'Re-planning keeps what you’ve done and plans the rest from your mastery now.' : ''}</p>
          <Button size="sm" variant="ghost" tone="danger" className="shrink-0" onClick={() => setConfirmClear(true)} loading={isClearing}>
            Clear plan
          </Button>
        </div>
      )}

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear your study plan?"
        icon={TriangleAlert}
        tone="danger"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>Keep it</Button>
            <Button tone="danger" onClick={handleClear}>Clear plan</Button>
          </>
        )}
      >
        <p className="text-sm text-muted2">Every task the plan added is removed, done or not. Tasks you added yourself stay.</p>
      </Modal>
    </Card>
  );
}
