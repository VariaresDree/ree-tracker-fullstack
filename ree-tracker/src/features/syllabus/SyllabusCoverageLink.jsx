// src/features/syllabus/SyllabusCoverageLink.jsx
//
// Today's one line about the syllabus checklist: "Syllabus 42% covered", or an
// invitation to start it, linking to Progress › Syllabus. Today is the boot
// screen, so it reads this device's copy and asks the server at most every
// 30 minutes; nothing renders until there is something to say.
import { Link } from 'react-router-dom';
import { syllabusCoverage } from '@ree/shared';
import { ListChecks } from '../../components/ui/icons';
import { useSyllabus } from './useSyllabus';

const SYLLABUS_LINK_MAX_AGE_MS = 30 * 60 * 1000;

export default function SyllabusCoverageLink() {
  const { topics, weights } = useSyllabus({ fetchIfOlderThanMs: SYLLABUS_LINK_MAX_AGE_MS });
  if (!topics || topics.length === 0) return null;
  const { overall } = syllabusCoverage(topics, weights || undefined);
  const started = overall.covered > 0 || topics.some((t) => t.read || t.watched || t.drilled);
  const pct = Number.isInteger(overall.percent) ? overall.percent : overall.percent.toFixed(1);
  return (
    <Link
      to="/progress?tab=syllabus"
      className="touch-target inline-flex items-center gap-1.5 min-h-8 text-xs text-muted2 hover:text-textMain hover:underline underline-offset-2"
    >
      <ListChecks size={13} strokeWidth={2} aria-hidden="true" />
      {started ? `Syllabus ${pct}% covered` : 'Start your syllabus checklist'}
    </Link>
  );
}
