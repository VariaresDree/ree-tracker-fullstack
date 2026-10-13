// src/features/account/ExamPlanForm.jsx
//
// The one place to set the exam date and the daily target. They had three
// editors — Profile's edit form, the Daily targets "Config" panel and the
// planner — that wrote the same fields. Account keys this form on the saved
// values, so a change from another device re-seeds it (no prop→state effect).
//
// The placement result and Today's first-run card reuse it (`onSaved`,
// `submitLabel`), and there it can also make the study plan the placement
// prompt promises (`offerPlan`). Offline, the plan is queued on the device.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import { apportionItems, DEFAULT_SYLLABUS_WEIGHTS } from '@ree/shared';
import { useStore } from '../../store/useStore';
import { Button, FormField, Input } from '../../components/ui';
import { daysToExam } from '../today/todayActions';
import { generateStudyPlan } from '../../services/dbQueries';
import { planTopics } from '../study-plan/planTopics';

const MIN_TARGET = 10;
const MAX_TARGET = 500;

export default function ExamPlanForm({ onDirtyChange, onSaved, submitLabel = 'Save exam plan', offerPlan = false }) {
  const { stats, saveExamConfig, dynamicTOS } = useStore(useShallow((s) => ({ stats: s.stats, saveExamConfig: s.saveExamConfig, dynamicTOS: s.dynamicTOS })));
  const [examDate, setExamDate] = useState(stats?.examDate || '');
  const [dailyTarget, setDailyTarget] = useState(String(stats?.dailyTarget || 50));
  // Ticked for a first exam plan only: someone who already has a date may
  // have a plan they've been working through, and saving shouldn't replace it
  // unasked.
  const [makePlan, setMakePlan] = useState(() => !stats?.examDate);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const target = Number(dailyTarget);
  const validTarget = Number.isInteger(target) && target >= MIN_TARGET && target <= MAX_TARGET;
  const split = validTarget ? apportionItems(target, DEFAULT_SYLLABUS_WEIGHTS) : null;
  const days = examDate ? daysToExam(examDate) : null;

  const save = async (e) => {
    e.preventDefault();
    if (!validTarget) {
      setError(`Daily target must be a whole number between ${MIN_TARGET} and ${MAX_TARGET}.`);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const saved = await saveExamConfig({ examDate: examDate || null, dailyTarget: target });
      onDirtyChange?.(false);
      let planned = null;
      // The plan needs the date and a connection; the exam plan itself doesn't.
      if (offerPlan && makePlan && examDate && days > 0 && !saved?.queued) {
        planned = await generateStudyPlan(examDate, planTopics(dynamicTOS)).catch(() => null);
      }
      if (saved?.queued) toast.success('Saved on this device. It syncs when you reconnect.');
      else if (planned) toast.success(`Exam plan saved, and ${planned.tasksCreated} study tasks added to Progress › Study plan.`);
      else toast.success('Exam plan saved.');
      onSaved?.({ examDate: examDate || null, dailyTarget: target, planned: !!planned });
    } catch {
      toast.error('Couldn’t save — try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Exam date" hint={days == null ? 'Not set yet. Clear the date to remove it.' : days > 1 ? `${days} days to go` : days === 1 ? '1 day to go' : days === 0 ? 'Today' : 'This date has passed'}>
          <Input type="date" value={examDate} onChange={(e) => { setExamDate(e.target.value); onDirtyChange?.(true); }} />
        </FormField>
        <FormField
          label="Daily target"
          hint={split ? `Questions a day — Mathematics ${split.Mathematics} · ESAS ${split.ESAS} · EE ${split.EE}` : `Questions a day (${MIN_TARGET}–${MAX_TARGET})`}
          error={error || undefined}
        >
          <Input type="number" inputMode="numeric" min={MIN_TARGET} max={MAX_TARGET} value={dailyTarget} onChange={(e) => { setDailyTarget(e.target.value); onDirtyChange?.(true); }} />
        </FormField>
      </div>
      {offerPlan && (
        <label className="flex items-start gap-2 text-sm text-textMain cursor-pointer pointer-coarse:min-h-11">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--accent)]" checked={makePlan} onChange={(e) => setMakePlan(e.target.checked)} />
          <span>
            Plan my weeks to the exam
            <span className="block text-xs text-muted2">Daily drills by topic, weighted the way the board is. Needs the date and a connection.</span>
          </span>
        </label>
      )}
      <Button type="submit" loading={saving} disabled={saving} className="self-start">{submitLabel}</Button>
    </form>
  );
}
