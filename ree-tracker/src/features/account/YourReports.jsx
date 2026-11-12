// Account › Your reports: the questions you reported ("Report a problem") and
// what was done about each, with the reviewer's note when there is one. A
// report used to vanish once sent.
import { useEffect, useState } from 'react';
import { Button, Skeleton, StatusPill } from '../../components/ui';
import { apiRequest } from '../../services/dbQueries';

const SHOWN = 10;
const STATUS = {
  open: { tone: 'amber', label: 'Waiting for review' },
  fixed: { tone: 'success', label: 'Fixed' },
  dismissed: { tone: 'neutral', label: 'Checked: no change needed' },
  removed: { tone: 'signal', label: 'Taken out of the question bank' },
};
const statusOf = (r) => (r.resolvedAt ? STATUS[r.resolution] || STATUS.dismissed : STATUS.open);
const day = (at) => new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
// The stem arrives cut at 200 characters, which can split a formula: shown as
// plain words, enough to recognise the question.
const plain = (stem) => String(stem || '').replace(/\$+/g, '').replace(/\\[a-zA-Z]+/g, '').replace(/\s+/g, ' ').trim();

export default function YourReports() {
  const [state, setState] = useState({ status: 'loading', items: [] });
  const [shown, setShown] = useState(SHOWN);

  useEffect(() => {
    let live = true;
    apiRequest('/api/user/reports')
      .then((res) => { if (live) setState({ status: 'done', items: res?.items || [] }); })
      .catch(() => { if (live) setState({ status: 'error', items: [] }); });
    return () => { live = false; };
  }, []);

  if (state.status === 'loading') return <Skeleton className="h-24" />;
  if (state.status === 'error') return <p className="text-sm text-muted2">Your reports load over a connection. Open this again when you’re online.</p>;
  if (state.items.length === 0) {
    return <p className="text-sm text-muted2">You haven’t reported a question. If one looks wrong, use Report a problem on it, and you’ll see here what was done.</p>;
  }

  const open = state.items.filter((r) => !r.resolvedAt).length;
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <p className="text-sm text-textMain tabular-nums">
        {state.items.length} reported{open ? ` · ${open} waiting for review` : ''}
      </p>
      <ol className="flex flex-col divide-y divide-border2/60">
        {state.items.slice(0, shown).map((r) => {
          const s = statusOf(r);
          return (
            <li key={r.questionId} className="flex flex-col gap-1.5 py-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={s.tone}>{s.label}</StatusPill>
                <span className="text-xs text-muted2 tabular-nums">
                  Reported {day(r.createdAt)}{r.resolvedAt ? ` · answered ${day(r.resolvedAt)}` : ''}
                </span>
              </div>
              <p className="text-sm text-textMain line-clamp-2 [overflow-wrap:anywhere]">{plain(r.stem)}</p>
              <p className="text-xs text-muted2">{[r.subject, r.topic].filter(Boolean).join(' · ')}{r.reason ? ` · You said: ${r.reason}` : ''}</p>
              {r.resolutionNote && (
                <p className="text-sm text-textMain rounded-[var(--radius-default)] bg-surface2 px-3 py-2 [overflow-wrap:anywhere]">
                  <span className="font-semibold">From the reviewer:</span> {r.resolutionNote}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {state.items.length > shown && (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setShown((n) => n + SHOWN)}>Show more</Button>
      )}
    </div>
  );
}
