// Admin › App health › Scheduled jobs: when the reminders and the subtopic
// tagging last ran and what they did (server services/jobRuns.js). Jobs had
// gone unrun or done nothing for days with nothing on any screen to say so.
import { Card, StatusPill } from '../../../components/ui';

const LABEL = { reminders: 'Daily reminders', 'subtopic-tags': 'Subtopic tagging' };
const time = (iso) => new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
const n = (x) => Number(x || 0).toLocaleString();

/** What one run did, in a line. */
function runLine(job, s) {
  if (!s) return '';
  if (job === 'reminders') {
    if (!s.candidates) return 'Nobody’s reminder was due that hour.';
    return `${n(s.candidates)} due that hour: ${n(s.sent)} sent, ${n(s.quiet)} with nothing to say.`;
  }
  if (s.skipped === 'off') return 'Off: switch it on in Question bank › Subtopics.';
  if (s.skipped === 'running') return 'Skipped: the run before was still going.';
  const parts = [`${n(s.batches)} ${s.batches === 1 ? 'batch' : 'batches'}: ${n(s.saved)} tagged, ${n(s.queued)} to review.`];
  if (s.done) parts.push('Every question has been looked at.');
  if (s.stopped) parts.push('Stopped early: the AI was busy. It tries again next hour.');
  return parts.join(' ');
}

function status(j) {
  if (!j.last) return { tone: 'neutral', text: 'No run yet' };
  if (!j.last.ok) return { tone: 'danger', text: 'Failed' };
  if (j.late) return { tone: 'amber', text: 'Late' };
  return { tone: 'success', text: 'On time' };
}

export default function ScheduledJobs({ jobs }) {
  if (!jobs?.length) return null;
  return (
    <section aria-labelledby="health-jobs" className="flex flex-col gap-3">
      <h3 id="health-jobs" className="text-h3 text-textMain">Scheduled jobs</h3>
      <Card as="ul" padding="none" className="divide-y divide-border">
        {jobs.map((j) => {
          const st = status(j);
          return (
            <li key={j.job} className="flex flex-col gap-1 px-4 py-3 min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-medium text-textMain">{LABEL[j.job] || j.job}</span>
                <StatusPill tone={st.tone}>{st.text}</StatusPill>
                {j.last && <span className="text-xs text-muted2 ml-auto">Last run {time(j.last.startedAt)}</span>}
              </div>
              {j.last && <p className="text-sm text-muted2 [overflow-wrap:anywhere]">{j.last.ok ? runLine(j.job, j.last.summary) : (j.last.error || 'It failed without a message.')}</p>}
              {j.late && <p className="text-xs text-muted2">It runs every hour; nothing for over two. Check Supabase › Integrations › Cron.</p>}
              {!j.last && <p className="text-xs text-muted2">Runs every hour once the Supabase jobs are set up (docs/ops/scheduled-jobs.sql).</p>}
              <p className="text-xs text-muted2">{n(j.runs24h)} {j.runs24h === 1 ? 'run' : 'runs'} in the last day{j.failed24h ? `, ${n(j.failed24h)} failed` : ''}</p>
            </li>
          );
        })}
      </Card>
    </section>
  );
}
