// src/features/diagnostic/PlacementPrompt.jsx
//
// Invites a new learner to the placement test — prompted, never forced. Shown
// while the account has little history (under NEW_LEARNER_MAX answers) and no
// completed placement, or to finish one that was started. "Not now" folds it
// to one line rather than hiding it, so the test stays one tap from Today
// (it used to be reachable only from Account after that). The status comes
// from usePlacement, which Today's actions read too.
import { Link } from 'react-router-dom';
import { Button, Card, CardTitle, IconChip } from '../../components/ui';
import { Compass } from '../../components/ui/icons';
import { NEW_LEARNER_MAX } from './usePlacement';

export default function PlacementPrompt({ status, answered = 0, dismissed = false, onDismiss }) {
  if (!status || status.status === 'completed') return null;
  const inProgress = status.status === 'in_progress';
  if (!inProgress && answered >= NEW_LEARNER_MAX) return null;

  if (dismissed) {
    return (
      <p className="text-sm text-muted2 flex flex-wrap items-center gap-x-2">
        <Compass size={14} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent-text)]" />
        {inProgress ? 'Your placement test is half done.' : 'Not sure where to start?'}
        <Link to="/diagnostic" className="text-[var(--accent-text)] underline underline-offset-2 inline-flex items-center pointer-coarse:min-h-11">
          {inProgress ? 'Finish it' : 'Take the placement test'}
        </Link>
      </p>
    );
  }

  // In a row only when the card is wide enough for one (a container query):
  // beside the sidebar on a tablet the window said `sm`, and the text was
  // left a 150px column between the icon and the buttons. A plain elevated
  // card: Today's hero below it is the one that glows.
  return (
    <Card elevated padding="md" className="@container">
      <div className="flex flex-col @2xl:flex-row @2xl:items-center gap-4">
        <IconChip icon={Compass} size="lg" />
        <div className="flex-1 min-w-0">
          <CardTitle>
            {inProgress ? 'Finish your placement test' : 'Find your starting level'}
          </CardTitle>
          <p className="text-sm text-muted2 mt-0.5">
            {inProgress
              ? `${status.progress?.answered || 0} of about ${status.progress?.total || 19} questions done — pick up where you left off.`
              : 'About 19 adaptive questions across Math, ESAS and EE. You get a level for each subject, where to start, and the option of a study plan to your exam date.'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button as={Link} to="/diagnostic">{inProgress ? 'Resume' : 'Take the test'}</Button>
          <Button variant="ghost" onClick={onDismiss}>Not now</Button>
        </div>
      </div>
    </Card>
  );
}
