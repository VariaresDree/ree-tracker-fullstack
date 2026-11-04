// src/features/onboarding/FirstRunTour.jsx
//
// Today's first card for someone who hasn't answered anything: the five places in
// the app, then what to do on day one. It sits in the page rather than over it, so
// nothing is covered and it can be left alone. Seen once, per account on this device.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardTitle, ProgressIndicator } from '../../components/ui';
import { ArrowRight, Check } from '../../components/ui/icons';
import { PRIMARY_NAV } from '../../layouts/navModel';

const tourKey = (uid) => `ree_tour_seen:${uid}`;

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

function FirstDayStep({ number, done, title, detail, to, action }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="shrink-0 mt-0.5 w-6 h-6 rounded-full border border-border2 flex items-center justify-center text-xs font-semibold text-textMain tabular-nums"
      >
        {done ? <Check size={14} strokeWidth={2.5} style={{ color: 'var(--accent-success)' }} /> : number}
      </span>
      <span className="min-w-0 flex-1 flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-textMain">{title}{done && <span className="sr-only"> (done)</span>}</span>
        <span className="text-xs text-muted2">{detail}</span>
        {!done && (
          <Link to={to} className="touch-target inline-flex items-center gap-1 self-start text-sm font-semibold text-reeBlue-text">
            {action} <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        )}
      </span>
    </li>
  );
}

/** @param {{ uid: string, placed: boolean, hasDate: boolean, hasPlan: boolean, onDone: () => void }} props */
export default function FirstRunTour({ uid, placed, hasDate, hasPlan, onDone }) {
  const [step, setStep] = useState(0);
  const finish = () => {
    try { localStorage.setItem(tourKey(uid), '1'); } catch { /* private mode: hidden for this view only */ }
    onDone();
  };

  return (
    <Card as="section" elevated aria-labelledby="tour-title" className="p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-eyebrow">Welcome</p>
          <CardTitle id="tour-title">{step === 0 ? 'Your way around' : 'Your first day'}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" onClick={finish}>Skip</Button>
      </div>

      {step === 0 ? (
        <>
          <p className="text-sm text-muted2">Five places, always in the menu.</p>
          <ul className="flex flex-col gap-1">{PRIMARY_NAV.map((item) => <Place key={item.id} item={item} />)}</ul>
        </>
      ) : (
        <>
          <p className="text-sm text-muted2">Three things, in this order, and then Today tells you what comes next.</p>
          <ol className="flex flex-col gap-4">
            <FirstDayStep number={1} done={placed} title="Take the placement test" detail="About 19 questions, to find where you stand in each subject." to="/diagnostic" action="Take the test" />
            <FirstDayStep number={2} done={hasDate} title="Set your exam date" detail="The first of the board’s two days. The countdown and your plan run from it." to="/account#exam-plan" action="Set the date" />
            <FirstDayStep number={3} done={hasPlan} title="Make your study plan" detail="Daily drills by topic, weighted the way the board is." to="/progress?tab=plan" action="Make the plan" />
          </ol>
        </>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="w-16 shrink-0"><ProgressIndicator value={step + 1} max={2} ariaLabel={`Step ${step + 1} of 2`} /></div>
        <div className="flex gap-2">
          {step === 1 && <Button variant="secondary" size="sm" onClick={() => setStep(0)}>Back</Button>}
          {step === 0
            ? <Button size="sm" onClick={() => setStep(1)}>Next</Button>
            : <Button size="sm" onClick={finish}>Done</Button>}
        </div>
      </div>
    </Card>
  );
}
