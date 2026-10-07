// src/components/MissionControl.jsx
import { Link } from 'react-router-dom';
import { Panel, Button, Skeleton, ProgressIndicator } from './ui';
import { ClipboardList, Pencil } from './ui/icons';
import { apportionItems, DEFAULT_SYLLABUS_WEIGHTS } from '@ree/shared';

// `stats` comes from the PARENT (Dashboard's merged activeStats — local
// optimistic + server-canonical). Reading the raw store here served stale
// tallies that only refreshed after a full sync round-trip, which is why the
// daily targets seemed to move only after Board Simulator runs.
//
// The exam date and daily target are edited in one place, Account → Exam plan;
// "Reset today" and "Delete all analytics" moved to Account → Your data. This
// panel only shows today's progress against the split.
export default function MissionControl({ stats }) {
  if (!stats) {
    return <Skeleton className="w-full h-40 rounded-[var(--radius-lg)]" />;
  }

  // The day's target split by the PRC syllabus weights (shared
  // largest-remainder rule) — these were bare 0.25 / 0.3 literals.
  const totalGoal = stats?.dailyTarget || 50;
  const split = apportionItems(totalGoal, DEFAULT_SYLLABUS_WEIGHTS);
  const mathGoal = split.Mathematics;
  const esasGoal = split.ESAS;
  const eeGoal = split.EE;

  const currentMath = stats?.dailyMath || 0;
  const currentESAS = stats?.dailyESAS || 0;
  const currentEE = stats?.dailyEE || 0;
  const totalCompleted = currentMath + currentESAS + currentEE;

  const QUOTAS = [
    { label: 'Mathematics', cur: currentMath, goal: mathGoal, color: 'var(--color-reeCyan)' },
    { label: 'ESAS', cur: currentESAS, goal: esasGoal, color: 'var(--color-reeAmber)' },
    { label: 'EE Professional', cur: currentEE, goal: eeGoal, color: 'var(--color-reePurple)' },
  ];

  return (
      <Panel
        icon={ClipboardList}
        eyebrow="Targets"
        title="Daily targets"
        bodyClassName="flex flex-col gap-5"
        action={
          <Button as={Link} to="/account#exam-plan" variant="secondary" size="sm">
            <Pencil size={14} strokeWidth={1.75} aria-hidden="true" /> Edit
          </Button>
        }
      >
        <div className="flex justify-between items-end border-b border-border pb-4">
          <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted max-w-[60%] leading-relaxed">
            Weighted to the board exam distribution
          </span>
          <div className="text-right">
            <div className="text-3xl text-display tabular-nums leading-none text-textMain">{totalCompleted}</div>
            <div className="text-[11px] text-muted2 mt-1">/ {totalGoal} today</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUOTAS.map((q) => (
            <div key={q.label} className="rounded-xl border border-border bg-surface2/30 p-4">
              <div className="flex justify-between items-center mb-3 gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider truncate" style={{ color: q.color }}>
                  {q.label}
                </span>
                <span className="text-[11px] text-muted2 tabular-nums shrink-0">
                  {q.cur} / {q.goal}
                </span>
              </div>
              <ProgressIndicator value={q.cur} max={q.goal || 1} color={q.color} ariaLabel={`${q.label}: ${q.cur} of ${q.goal}`} />
            </div>
          ))}
        </div>
      </Panel>
  );
}
