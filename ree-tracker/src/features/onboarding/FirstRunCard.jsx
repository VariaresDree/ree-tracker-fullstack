// src/features/onboarding/FirstRunCard.jsx
//
// Today's first-run step for a new learner with no exam date: the date (the
// countdown and the study plan run from it) and the daily target (it was a
// silent 50 nobody chose). The same form as Account › Exam plan, with the
// offer to build the study plan. Shown after the placement prompt, never
// beside it; "Later" hides it for this account on this device.
import { useState } from 'react';
import { Button, Card, CardTitle, IconChip } from '../../components/ui';
import { CalendarDays } from '../../components/ui/icons';
import ExamPlanForm from '../account/ExamPlanForm';

const dismissKey = (uid) => `ree_firstrun_dismissed:${uid}`;
const readDismissed = (uid) => {
  try { return localStorage.getItem(dismissKey(uid)) === '1'; } catch { return false; }
};

export default function FirstRunCard({ uid, show }) {
  const [hiddenFor, setHiddenFor] = useState(null);
  if (!show || !uid || hiddenFor === uid || readDismissed(uid)) return null;

  const hide = () => {
    try { localStorage.setItem(dismissKey(uid), '1'); } catch { /* private mode: hide for this view only */ }
    setHiddenFor(uid);
  };

  return (
    <Card elevated className="p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <IconChip icon={CalendarDays} />
        <div className="flex-1 min-w-0">
          <CardTitle>Set up your review</CardTitle>
          <p className="text-sm text-muted2 mt-0.5">
            Your exam date sets the countdown and the study plan. The daily target is split by the board’s subject weights.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={hide} className="shrink-0">Later</Button>
      </div>
      <ExamPlanForm offerPlan submitLabel="Save my exam plan" onSaved={() => setHiddenFor(uid)} />
    </Card>
  );
}
