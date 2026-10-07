// src/features/account/ExamPlanForm.jsx
//
// The one place to set the exam date and the daily target. They had three
// editors — Profile's edit form, the Daily targets "Config" panel and the
// planner — that wrote the same fields. Account keys this form on the saved
// values, so a change from another device re-seeds it (no prop→state effect).
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import { apportionItems, DEFAULT_SYLLABUS_WEIGHTS } from '@ree/shared';
import { useStore } from '../../store/useStore';
import { Button, FormField, Input } from '../../components/ui';
import { daysToExam } from '../today/todayActions';

const MIN_TARGET = 10;
const MAX_TARGET = 500;

export default function ExamPlanForm() {
  const { stats, saveExamConfig } = useStore(useShallow((s) => ({ stats: s.stats, saveExamConfig: s.saveExamConfig })));
  const [examDate, setExamDate] = useState(stats?.examDate || '');
  const [dailyTarget, setDailyTarget] = useState(String(stats?.dailyTarget || 50));
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
      await saveExamConfig({ examDate: examDate || undefined, dailyTarget: target });
      toast.success('Exam plan saved.');
    } catch (err) {
      toast.error(err?.message === '[OFFLINE]' ? 'Reconnect to save your exam plan.' : 'Couldn’t save — try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Exam date" hint={days == null ? 'Not set yet' : days > 0 ? `${days} days to go` : days === 0 ? 'Today' : 'This date has passed'}>
          <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </FormField>
        <FormField
          label="Daily target"
          hint={split ? `Questions a day — Mathematics ${split.Mathematics} · ESAS ${split.ESAS} · EE ${split.EE}` : `Questions a day (${MIN_TARGET}–${MAX_TARGET})`}
          error={error || undefined}
        >
          <Input type="number" inputMode="numeric" min={MIN_TARGET} max={MAX_TARGET} value={dailyTarget} onChange={(e) => setDailyTarget(e.target.value)} />
        </FormField>
      </div>
      <Button type="submit" loading={saving} disabled={saving} className="self-start">Save exam plan</Button>
    </form>
  );
}
