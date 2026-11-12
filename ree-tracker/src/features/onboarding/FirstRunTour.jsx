// src/features/onboarding/FirstRunTour.jsx
//
// Getting started: Today's first card until its steps are done or it's
// skipped. Three steps, the quickest first (2026-11-12): 10 questions that
// start with one tap, the exam date with the study plan made in the same
// save, and the placement test, optional. It led with the 19-question test
// and sent the date and the plan to two other pages: 8 of 20 accounts never
// answered a question (5 left on the day they signed up), 2 set a date and
// none made a plan. Each
// step ticks itself from what the app already knows. It sits in the page
// rather than over it, so nothing is covered and it can be left alone.
// Skipping is kept on the account (User.tourDoneAt, through the settings
// route), so another device doesn't show it again; Account › About this app
// brings it back. The device's own key stays as the offline fallback.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import { Button, Card, CardTitle, FormField, Input, ProgressIndicator } from '../../components/ui';
import { ArrowRight, Check, ChevronDown } from '../../components/ui/icons';
import { PRIMARY_NAV } from '../../layouts/navModel';
import { useStore } from '../../store/useStore';
import { cn } from '../../components/ui/cn';
import { tourKey } from './tourKey';
import { generateStudyPlan } from '../../services/dbQueries';
import { planTopics } from '../study-plan/planTopics';
import { launchPractice, quickReviewPreset } from '../active-recall/presets';
import { daysToExam } from '../today/todayActions';
import { todayManila } from '../../utils/manilaDate';

const FIRST_SET = 10;

function Place({ item }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        to={item.to}
        className="flex items-center gap-3 min-h-11 py-1.5 rounded-[var(--radius-default)] hover:bg-surface2"
      >
        <Icon size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-[var(--accent-text)]" />
        <span className="min-w-0 flex flex-col">
          <span className="text-sm font-semibold text-textMain">{item.label}</span>
          <span className="text-xs text-muted2">{item.desc}</span>
        </span>
      </Link>
    </li>
  );
}

function Step({ number, done, title, detail, to, action, children }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="shrink-0 mt-0.5 w-6 h-6 rounded-full border border-border2 flex items-center justify-center text-xs font-semibold text-textMain tabular-nums"
      >
        {done ? <Check size={14} strokeWidth={2.5} style={{ color: 'var(--accent-success)' }} /> : number}
      </span>
      <span className="min-w-0 flex-1 flex flex-col gap-0.5">
        <span className={cn('text-sm font-semibold', done ? 'text-muted2' : 'text-textMain')}>{title}{done && <span className="sr-only"> (done)</span>}</span>
        {!done && <span className="text-xs text-muted2">{detail}</span>}
        {!done && children}
        {!done && !children && to && (
          <Link to={to} className="touch-target inline-flex items-center gap-1 self-start text-sm font-semibold text-reeBlue-text">
            {action} <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        )}
      </span>
    </li>
  );
}

/**
 * The exam date and the study plan in one save: the date goes to the account
 * (queued offline), then the plan is made from every syllabus topic, as
 * Account › Exam plan does with "make my plan". With a date already set, only
 * the plan is left to make.
 */
function DateAndPlan({ hasDate, onPlanned }) {
  const { saveExamConfig, dynamicTOS } = useStore(useShallow((st) => ({ saveExamConfig: st.saveExamConfig, dynamicTOS: st.dynamicTOS })));
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const makePlan = async (examDate) => {
    const topics = planTopics(dynamicTOS);
    if (topics.length === 0) {
      setError('The syllabus hasn’t loaded yet. Make the plan in Progress › Study plan.');
      return false;
    }
    await generateStudyPlan(examDate, topics);
    onPlanned();
    return true;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!date || !(daysToExam(date) > 0)) { setError('Pick a date after today.'); return; }
    setBusy(true);
    setError('');
    try {
      const saved = await saveExamConfig({ examDate: date });
      if (saved?.queued) {
        toast('Saved on this device. Make your plan in Progress › Study plan once you’re online.');
      } else if (await makePlan(date)) {
        toast.success('Exam date saved, and your study plan is made. It’s in Progress › Study plan.');
      }
    } catch (err) {
      setError(err?.message?.includes('[OFFLINE]') ? 'Making the plan needs a connection. Your date is saved.' : 'Couldn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const planOnly = async () => {
    setBusy(true);
    setError('');
    try {
      const examDate = useStore.getState().stats?.examDate;
      if (examDate && await makePlan(examDate)) toast.success('Your study plan is made. It’s in Progress › Study plan.');
    } catch (err) {
      setError(err?.message?.includes('[OFFLINE]') ? 'Making the plan needs a connection.' : 'Couldn’t make the plan. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-1">
      {hasDate ? (
        <Button size="sm" className="self-start" onClick={planOnly} loading={busy}>Make my plan</Button>
      ) : (
        <form onSubmit={save} noValidate className="flex flex-wrap items-end gap-2">
          <FormField label="Board exam date" className="min-w-40 flex-1">
            <Input type="date" min={todayManila()} value={date} onChange={(e) => { setDate(e.target.value); setError(''); }} />
          </FormField>
          <Button type="submit" size="sm" loading={busy} disabled={!date}>Save and make my plan</Button>
        </form>
      )}
      {error && <p role="alert" className="text-xs" style={{ color: 'var(--accent-danger)' }}>{error}</p>}
    </div>
  );
}

/** @param {{ uid: string, placed: boolean, hasDate: boolean, hasPlan: boolean, practised: boolean, onDone: () => void }} props */
export default function FirstRunTour({ uid, placed, hasDate, hasPlan, practised, onDone }) {
  const saveExamConfig = useStore((s) => s.saveExamConfig);
  const navigate = useNavigate();
  const [placesOpen, setPlacesOpen] = useState(false);
  // Made here, before Today's plan read catches up.
  const [planned, setPlanned] = useState(false);
  const steps = [
    {
      done: practised,
      title: `Answer your first ${FIRST_SET} questions`,
      detail: 'A mixed set across Math, ESAS and EE, each with its solution as you go. About ten minutes.',
      children: (
        <Button size="sm" className="self-start mt-1" onClick={() => launchPractice(navigate, quickReviewPreset(FIRST_SET))}>
          Start {FIRST_SET} questions <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </Button>
      ),
    },
    {
      // A plan made here was made from a date, so it is the whole step.
      done: planned || (hasDate && hasPlan),
      title: hasDate ? 'Make your study plan' : 'Set your exam date and plan',
      detail: hasDate
        ? 'Daily drills by topic, weighted the way the board is, from your date.'
        : 'The first of the board’s two days. Saving it also makes your study plan: daily drills by topic, weighted the way the board is.',
      children: <DateAndPlan hasDate={hasDate} onPlanned={() => setPlanned(true)} />,
    },
    {
      done: placed,
      title: 'Take the placement test (optional)',
      detail: 'About 19 questions. It finds where you stand in each subject, so Today starts you where it counts.',
      to: '/diagnostic',
      action: 'Take the test',
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  const skip = () => {
    try { localStorage.setItem(tourKey(uid), '1'); } catch { /* private mode: the account still keeps it */ }
    // Offline, the store queues it; a failure leaves the device's key to hide it here.
    saveExamConfig?.({ tourDone: true }).catch(() => {});
    onDone();
  };

  return (
    <Card as="section" elevated aria-labelledby="tour-title" className="p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-eyebrow">Welcome</p>
          <CardTitle id="tour-title">Getting started</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" onClick={skip}>Skip</Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-muted2">{doneCount} of {steps.length} done. Then Today tells you what comes next.</p>
        <ProgressIndicator value={doneCount} max={steps.length} ariaLabel={`${doneCount} of ${steps.length} steps done`} />
      </div>

      <ol className="flex flex-col gap-4">
        {steps.map((s, i) => <Step key={s.title} number={i + 1} {...s} />)}
      </ol>

      <div className="border-t border-border pt-3">
        <button
          type="button"
          aria-expanded={placesOpen}
          aria-controls="tour-places"
          onClick={() => setPlacesOpen((o) => !o)}
          className="touch-target inline-flex items-center gap-1.5 text-sm font-semibold text-textMain cursor-pointer"
        >
          Your way around
          <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" className={cn('text-muted transition-[rotate] duration-200 motion-reduce:transition-none', placesOpen && 'rotate-180')} />
        </button>
        {placesOpen && (
          <div id="tour-places" className="flex flex-col gap-1 mt-2">
            <p className="text-xs text-muted2">Five places, always in the menu.</p>
            <ul className="flex flex-col gap-1">{PRIMARY_NAV.map((item) => <Place key={item.id} item={item} />)}</ul>
          </div>
        )}
      </div>
    </Card>
  );
}
