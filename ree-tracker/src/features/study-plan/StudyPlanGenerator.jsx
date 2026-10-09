// src/features/study-plan/StudyPlanGenerator.jsx
//
// Progress › Study plan: builds the next six weeks of tasks from mastery and
// the PRC weights. The exam date is read here and set in Account › Exam plan.
//
// "Clear plan" asks first (it deletes every generated task, ticked or not, in
// one tap), the subject chips say whether they're on, and it is built from the
// shared primitives (it was hand-rolled, with an emoji on its button).
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import { normalizeSubject, toDisplaySubject } from '@ree/shared';
import { useStore } from '../../store/useStore';
import { generateStudyPlan, clearStudyPlan } from '../../services/dbQueries';
import { TOS_WEIGHTS } from '../../utils/tosWeights';
import { Badge, Button, Card, Modal } from '../../components/ui';
import { CalendarDays, Check, TriangleAlert } from '../../components/ui/icons';

const PLAN_DAYS = 42;

export default function StudyPlanGenerator({ onPlanGenerated }) {
  const { dynamicTOS, stats } = useStore(
    useShallow((s) => ({ dynamicTOS: s.dynamicTOS, stats: s.stats })),
  );
  const safeTOS = dynamicTOS || {};

  // The exam date is set in one place, Account → Exam plan; the planner reads
  // it (it used to keep its own editable copy, a third editor for one field).
  const examDate = stats?.examDate || '';
  const [selectedSubjects, setSelectedSubjects] = useState(['Mathematics', 'ESAS', 'EE']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const daysUntilExam = useMemo(() => {
    if (!examDate) return null;
    const diff = new Date(examDate) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [examDate]);

  const topicsToGenerate = useMemo(() => {
    const topics = [];
    selectedSubjects.forEach((subject) => {
      const subtopics = safeTOS[subject] || [];
      const weight = TOS_WEIGHTS[normalizeSubject(subject)] || 0.33;
      subtopics.forEach((subtopic) => topics.push({ subject, subtopic, weight }));
    });
    // Heaviest PRC weight first (EE is 45%).
    return topics.sort((a, b) => b.weight - a.weight);
  }, [selectedSubjects, safeTOS]);

  const handleGenerate = async () => {
    if (!examDate) return toast.error('Set your exam date in Account first.');
    if (topicsToGenerate.length === 0) return toast.error('Pick at least one subject.');
    if (daysUntilExam <= 0) return toast.error('The exam date has to be in the future.');

    setIsGenerating(true);
    try {
      const result = await generateStudyPlan(examDate, topicsToGenerate);
      toast.success(`Added ${result.tasksCreated} study tasks.`);
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
      toast.success(`Removed ${result.deleted} plan tasks.`);
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

  return (
    <Card className="p-5 sm:p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-textMain">Study plan</h2>
          <p className="text-sm text-muted2 mt-1 max-w-prose">
            Plans the next six weeks from your mastery and the PRC weights: a targeted drill most days, a timed
            sitting each week, light review before the exam. Tasks tick themselves off from your answers.
          </p>
        </div>
        <Button size="sm" variant="ghost" tone="danger" onClick={() => setConfirmClear(true)} loading={isClearing}>
          Clear plan
        </Button>
      </div>

      <div>
        <p className="text-eyebrow mb-2">Board exam date</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-textMain tabular-nums">{examDate || 'Not set'}</span>
          {daysTone && <Badge tone={daysTone}>{daysUntilExam === 1 ? '1 day' : `${daysUntilExam} days`}</Badge>}
          <Link to="/account#exam-plan" className="text-sm text-[var(--accent-text)] hover:underline touch-target inline-flex items-center">
            {examDate ? 'Change' : 'Set your exam date'}
          </Link>
        </div>
      </div>

      <fieldset>
        <legend className="text-eyebrow mb-2">Subjects to include</legend>
        <div className="flex gap-2 flex-wrap">
          {Object.keys(safeTOS).map((subject) => {
            const weight = TOS_WEIGHTS[normalizeSubject(subject)];
            const on = selectedSubjects.includes(subject);
            const topicCount = (safeTOS[subject] || []).length;
            return (
              <Button
                key={subject}
                size="sm"
                variant={on ? 'outline' : 'secondary'}
                aria-pressed={on}
                onClick={() => toggleSubject(subject)}
              >
                {on && <Check size={14} strokeWidth={2} aria-hidden="true" />}
                {toDisplaySubject(subject)} · {Math.round((weight || 0) * 100)}%
                <span className="text-muted2 font-normal">{topicCount} topics</span>
              </Button>
            );
          })}
        </div>
      </fieldset>

      <dl className="grid grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-default)] bg-surface2 border border-border p-3 text-center">
          <dt className="text-eyebrow">Topics</dt>
          <dd className="text-xl font-semibold tabular-nums text-textMain mt-1">{topicsToGenerate.length}</dd>
        </div>
        <div className="rounded-[var(--radius-default)] bg-surface2 border border-border p-3 text-center">
          <dt className="text-eyebrow">Days left</dt>
          <dd className="text-xl font-semibold tabular-nums text-textMain mt-1">{daysUntilExam ?? '—'}</dd>
        </div>
        <div className="rounded-[var(--radius-default)] bg-surface2 border border-border p-3 text-center">
          <dt className="text-eyebrow">Days planned</dt>
          <dd className="text-xl font-semibold tabular-nums text-textMain mt-1">{daysUntilExam ? Math.min(daysUntilExam, PLAN_DAYS) : '—'}</dd>
        </div>
      </dl>

      <Button
        fullWidth
        size="lg"
        onClick={handleGenerate}
        loading={isGenerating}
        disabled={isGenerating || !examDate || daysUntilExam <= 0 || topicsToGenerate.length === 0}
      >
        {!isGenerating && <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />}
        {isGenerating ? 'Generating…' : 'Generate study plan'}
      </Button>

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
