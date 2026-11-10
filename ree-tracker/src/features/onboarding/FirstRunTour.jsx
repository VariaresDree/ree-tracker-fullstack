// src/features/onboarding/FirstRunTour.jsx
//
// Getting started: Today's first card until four steps are done (placement
// test, exam date, study plan, a first practice set) or it's skipped. Each
// step ticks itself from what the app already knows. It sits in the page
// rather than over it, so nothing is covered and it can be left alone.
// Skipping is kept on the account (User.tourDoneAt, through the settings
// route), so another device doesn't show it again; Account › About this app
// brings it back. The device's own key stays as the offline fallback.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardTitle, ProgressIndicator } from '../../components/ui';
import { ArrowRight, Check, ChevronDown } from '../../components/ui/icons';
import { PRIMARY_NAV } from '../../layouts/navModel';
import { useStore } from '../../store/useStore';
import { cn } from '../../components/ui/cn';
import { tourKey } from './tourKey';

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

function Step({ number, done, title, detail, to, action }) {
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
        {!done && (
          <Link to={to} className="touch-target inline-flex items-center gap-1 self-start text-sm font-semibold text-reeBlue-text">
            {action} <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        )}
      </span>
    </li>
  );
}

/** @param {{ uid: string, placed: boolean, hasDate: boolean, hasPlan: boolean, practised: boolean, onDone: () => void }} props */
export default function FirstRunTour({ uid, placed, hasDate, hasPlan, practised, onDone }) {
  const saveExamConfig = useStore((s) => s.saveExamConfig);
  const [placesOpen, setPlacesOpen] = useState(false);
  const steps = [
    { done: placed, title: 'Take the placement test', detail: 'About 19 questions, to find where you stand in each subject.', to: '/diagnostic', action: 'Take the test' },
    { done: hasDate, title: 'Set your exam date', detail: 'The first of the board’s two days. The countdown and your plan run from it.', to: '/account#exam-plan', action: 'Set the date' },
    { done: hasPlan, title: 'Make your study plan', detail: 'Daily drills by topic, weighted the way the board is.', to: '/progress?tab=plan', action: 'Make the plan' },
    { done: practised, title: 'Answer your first practice set', detail: 'Questions across a subject, each with its solution once you answer.', to: '/practice', action: 'Start practising' },
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
