// src/features/exams/GauntletTab.jsx
//
// Exams › Gauntlet: the ranked ladder, every rung always showing. Four blended
// tiers joined by a line, then the three subject boards at board time. The tier
// to reach now is highlighted, and a locked tier shows how close it is to
// opening. Moved out of the Arena page, where it hid behind a "Rankings" label.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Button, Card, CardWatermark, Grid, ProgressIndicator, Skeleton, StatusPill } from '../../components/ui';
import { Check, Lock, Shield, Swords, Trophy } from '../../components/ui/icons';
import { GAUNTLET_TIERS, SUBJECT_UNLOCK_LEVEL, isSubjectTier } from '../../config/examStandards';
import { cooldownLabel, formatLimit, tierState } from './gauntletTierState';
import SavedRunCard from './SavedRunCard';
import { readSavedRuns } from './savedRuns';

const tinted = (accent) => ({
  color: accent,
  borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
  background: `color-mix(in srgb, ${accent} 12%, transparent)`,
});
const DONE = tinted('var(--accent-success)');
const NOW = tinted('var(--accent-text)');

// One rung: its marker on the line, and what sits beside it. `done` paints the
// stretch of line below the marker, so the cleared part of the climb shows.
function Rung({ icon: Icon, tint, done, last, children }) {
  return (
    <li className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-4 last:pb-0">
      {!last && (
        <span
          aria-hidden="true"
          className="absolute left-4 -translate-x-1/2 top-8 bottom-0 w-0.5"
          style={{ background: done ? 'var(--accent-success)' : 'var(--border-main)' }}
        />
      )}
      <span
        aria-hidden="true"
        className={`size-8 rounded-full border flex items-center justify-center ${tint ? '' : 'text-muted border-border bg-surface2'}`}
        style={tint}
      >
        <Icon size={16} strokeWidth={2} />
      </span>
      <div className="min-w-0">{children}</div>
    </li>
  );
}

function LockedFor({ cooldown }) {
  return <StatusPill tone="danger" dot={false} className="self-start">Locked — {cooldown}</StatusPill>;
}

function TierRung({ tier, state, current, cooldown, totalAnswered, offline, onStart }) {
  const { isPassed, isUnlocked, isCoolingDown } = state;
  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className={`text-sm font-semibold ${isPassed || current ? 'text-textMain' : 'text-muted2'}`}>
          Tier {tier.level}: {tier.name}
        </h3>
        {isPassed && <StatusPill tone="success">Cleared</StatusPill>}
        {current && <StatusPill tone="velocity">You’re here</StatusPill>}
      </div>
      <p className="text-xs text-muted2 tabular-nums">{tier.items} items · {formatLimit(tier.timeLimitSecs)}</p>
      {!isPassed && (
        isCoolingDown ? (
          <LockedFor cooldown={cooldown} />
        ) : isUnlocked ? (
          <>
            <Button className="w-full sm:w-auto sm:self-start mt-1" disabled={offline} onClick={() => onStart(tier.level)}>Start tier {tier.level} exam</Button>
            {offline && <p className="text-xs text-muted2">Needs a connection: this tier’s questions come from the server.</p>}
          </>
        ) : totalAnswered >= tier.reqQs ? (
          <p className="text-xs text-muted2">Clear tier {tier.level - 1} first</p>
        ) : (
          <div className="flex flex-col gap-1 mt-1 max-w-sm">
            <ProgressIndicator
              value={totalAnswered}
              max={tier.reqQs}
              size="sm"
              ariaLabel={`Tier ${tier.level} opens at ${tier.reqQs} answered: ${totalAnswered} so far`}
            />
            <p className="text-xs text-muted2 tabular-nums">{totalAnswered.toLocaleString()} / {tier.reqQs.toLocaleString()} answered</p>
          </div>
        )
      )}
    </>
  );
  return (
    <Rung icon={isPassed ? Check : isUnlocked ? Swords : Lock} tint={isPassed ? DONE : current ? NOW : undefined} done={isPassed}>
      {current ? (
        <Card padding="sm" className="flex flex-col gap-1.5" style={{ borderColor: 'color-mix(in srgb, var(--accent) 50%, transparent)' }}>{content}</Card>
      ) : (
        <div className="flex flex-col gap-1 pt-1">{content}</div>
      )}
    </Rung>
  );
}

function BoardTile({ tier, state, primary, cooldown, onStart }) {
  const { isCleared, isUnlocked, isCoolingDown } = state;
  return (
    <Card variant="inset" className="p-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 min-w-0">
      <div className="min-w-0 flex flex-col gap-1">
        <h3 className={`text-sm font-semibold ${isUnlocked ? 'text-textMain' : 'text-muted2'}`}>{tier.subject}</h3>
        <p className="text-xs text-muted2 tabular-nums">{formatLimit(tier.timeLimitSecs)}</p>
        {isCleared && <StatusPill tone="success" className="self-start">Cleared</StatusPill>}
      </div>
      {!isUnlocked ? (
        <Lock size={16} strokeWidth={2} className="text-muted" aria-label="Locked" />
      ) : isCoolingDown ? (
        <LockedFor cooldown={cooldown} />
      ) : isCleared ? (
        <Button size="sm" variant="secondary" aria-label={`Take again: ${tier.subject} board`} onClick={() => onStart(tier.level)}>Take again</Button>
      ) : (
        <Button size="sm" variant={primary ? 'primary' : 'secondary'} aria-label={`Start the ${tier.subject} board`} onClick={() => onStart(tier.level)}>Start</Button>
      )}
    </Card>
  );
}

export default function GauntletTab() {
  const stats = useStore((s) => s.stats);
  const navigate = useNavigate();
  const lockUntil = stats?.gauntletLockUntil;

  // A clock for the cooldown, ticking only while a lock is running. The label
  // is derived from it, not stored.
  const isOnline = useNetworkStatus();
  const [savedRun] = useState(() => readSavedRuns().gauntlet);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!lockUntil || lockUntil <= Date.now()) return undefined;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= lockUntil) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [lockUntil]);
  const cooldown = cooldownLabel(lockUntil, now);

  const currentLevel = stats?.gauntletLevel || 1;
  const totalAnswered = stats?.totalAnswered || 0;
  const subjectsUnlocked = currentLevel >= SUBJECT_UNLOCK_LEVEL;

  const start = (level) => {
    if (cooldown) return toast.error('The Gauntlet is locked. Check the cooldown timer.');
    navigate(`/gauntlet/${level}`);
  };

  // Before the stats first load, the ladder would read "Level 1" with every
  // tier locked — wrong for anyone past it.
  if (!stats) {
    return (
      <div role="status" className="flex flex-col gap-4">
        <span className="sr-only">Loading the Gauntlet…</span>
        <Skeleton className="h-28 rounded-[var(--radius-lg)]" />
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-[var(--radius-lg)]" />)}
      </div>
    );
  }

  const stateOf = (tier) => tierState(tier, { currentLevel, totalAnswered, coolingDown: cooldown, boardClears: stats?.gauntletBoardClears });
  const blended = GAUNTLET_TIERS.filter((t) => !isSubjectTier(t));
  const boards = GAUNTLET_TIERS.filter((t) => isSubjectTier(t));
  // One primary button on the screen: the first board still to clear.
  const nextBoard = boards.find((t) => !stateOf(t).isCleared);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
      {savedRun && <SavedRunCard title={`Unfinished run, level ${savedRun.level}`} summary={savedRun.summary} to={`/gauntlet/${savedRun.level}`} />}
      <Card variant="hero" padding="md" className="flex flex-col gap-2">
        <CardWatermark icon={Shield} />
        <h2 className="text-h2 text-textMain flex items-center gap-3">
          <Shield size={24} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--accent-text)' }} /> The Gauntlet
        </h2>
        <p className="text-sm text-muted2 max-w-2xl">
          Clear four tiers to open the subject boards at board time. Failing any exam locks the Gauntlet for 12 hours.
        </p>
        <p className="text-sm font-medium text-textMain tabular-nums">
          Level {currentLevel} · {totalAnswered.toLocaleString()} answered
        </p>
      </Card>

      <ol aria-label="The Gauntlet ladder" className="flex flex-col">
        {blended.map((tier) => (
          <TierRung
            key={tier.level}
            tier={tier}
            state={stateOf(tier)}
            current={tier.level === currentLevel}
            cooldown={cooldown}
            totalAnswered={totalAnswered}
            offline={!isOnline}
            onStart={start}
          />
        ))}
        <Rung icon={subjectsUnlocked ? Trophy : Lock} tint={subjectsUnlocked ? NOW : undefined} last>
          <div className="flex flex-col gap-1 pt-1">
            <p className="text-sm font-semibold text-textMain">Subject boards</p>
            <p className="text-xs text-muted2">
              100 items each, at board time.{!subjectsUnlocked && ' They open once all four tiers are cleared.'}
            </p>
          </div>
          <Grid kind="options" gap="sm" className="mt-3">
            {boards.map((tier) => (
              <BoardTile key={tier.level} tier={tier} state={stateOf(tier)} primary={tier === nextBoard} cooldown={cooldown} onStart={start} />
            ))}
          </Grid>
        </Rung>
      </ol>
    </div>
  );
}
