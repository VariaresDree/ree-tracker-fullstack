// src/features/diagnostic/PlacementPrompt.jsx
//
// Invites a new learner to the placement test — prompted, never forced. Shown
// while the account has little history (under PROMPT_MAX_ANSWERED answers) and
// no completed placement, or to finish one that was started. "Not now" is
// remembered per account on this device; the test stays reachable at
// /diagnostic either way.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../../components/ui';
import { Compass } from '../../components/ui/icons';
import { fetchDiagnosticStatus } from '../../services/dbQueries';

export const PROMPT_MAX_ANSWERED = 30;
const dismissKey = (uid) => `ree_placement_dismissed:${uid}`;

const readDismissed = (uid) => {
  try { return localStorage.getItem(dismissKey(uid)) === '1'; } catch { return false; }
};

export default function PlacementPrompt({ uid, answered = 0 }) {
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(() => (uid ? readDismissed(uid) : true));

  const eligible = !!uid && !dismissed;
  useEffect(() => {
    if (!eligible) return undefined;
    let live = true;
    fetchDiagnosticStatus().then((s) => { if (live) setStatus(s); }).catch(() => {});
    return () => { live = false; };
  }, [eligible]);

  if (!eligible || !status || status.status === 'completed') return null;
  const inProgress = status.status === 'in_progress';
  if (!inProgress && answered >= PROMPT_MAX_ANSWERED) return null;

  const dismiss = () => {
    try { localStorage.setItem(dismissKey(uid), '1'); } catch { /* private mode: dismiss for this view only */ }
    setDismissed(true);
  };

  return (
    <Card elevated glow className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <span
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-default)]"
        style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent-text)' }}
      >
        <Compass size={22} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="flex-1 min-w-0">
        <h2 className="text-textMain font-semibold">
          {inProgress ? 'Finish your placement test' : 'Find your starting level'}
        </h2>
        <p className="text-sm text-muted2 mt-0.5">
          {inProgress
            ? `${status.progress?.answered || 0} of about ${status.progress?.total || 19} questions done — pick up where you left off.`
            : 'About 19 adaptive questions across Math, ESAS and EE. Your plan, drills and forecast start from the result.'}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button as={Link} to="/diagnostic">{inProgress ? 'Resume' : 'Take the test'}</Button>
        <Button variant="ghost" onClick={dismiss}>Not now</Button>
      </div>
    </Card>
  );
}
