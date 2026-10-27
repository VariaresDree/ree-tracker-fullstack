// src/features/exams/GauntletTab.jsx
//
// Exams › Gauntlet: the ranked ladder. Four blended tiers in order, then the
// three subject boards at board time. Moved out of the Arena page, where it
// hid behind a "Rankings" label.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { Badge, Button, Card, CardWatermark, Grid, KpiTile, Skeleton, StatusPill } from '../../components/ui';
import { Lock, Shield, Swords, Trophy } from '../../components/ui/icons';
import { GAUNTLET_TIERS, SUBJECT_UNLOCK_LEVEL, isSubjectTier } from '../../config/examStandards';
import { cooldownLabel, formatLimit, tierState } from './gauntletTierState';

function TierCard({ tier, state, cooldown, totalAnswered, onStart }) {
  const { subject, isPassed, isCleared, isUnlocked, isLocked, isCoolingDown } = state;
  return (
    <Card
      padding="md"
      className={`flex flex-col gap-4 transition-[opacity,border-color] ${isLocked ? 'opacity-60' : ''}`}
      style={{
        borderColor: isCleared
          ? 'color-mix(in srgb, var(--accent-success) 30%, transparent)'
          : isUnlocked
            ? 'color-mix(in srgb, var(--accent) 50%, transparent)'
            : 'var(--border-main)',
      }}
    >
      <div className="flex justify-between items-start">
        <Badge tone={isCleared ? 'success' : isUnlocked ? 'velocity' : 'neutral'}>
          {subject ? tier.subject : `Tier ${tier.level}`}
        </Badge>
        <span className="opacity-80" aria-hidden="true">
          {isCleared
            ? <Trophy size={22} strokeWidth={1.75} style={{ color: 'var(--accent-success)' }} />
            : isUnlocked
              ? <Swords size={22} strokeWidth={1.75} style={{ color: 'var(--accent-text)' }} />
              : <Lock size={22} strokeWidth={1.75} className="text-muted" />}
        </span>
      </div>

      <h3 className={`text-h3 ${isPassed || isUnlocked ? 'text-textMain' : 'text-muted'}`}>
        {tier.name}
      </h3>

      <ul className="flex flex-col gap-1.5 text-xs font-mono text-muted">
        <li className="flex justify-between"><span>Questions</span> <span className="font-bold text-textMain tabular-nums">{tier.items}</span></li>
        <li className="flex justify-between"><span>Time limit</span> <span className="font-bold text-textMain tabular-nums">{formatLimit(tier.timeLimitSecs)}</span></li>
        {!subject && (
          <li className="flex justify-between mt-2 pt-2 border-t border-border2/50">
            <span>Required answered</span>
            <span className="font-bold tabular-nums" style={{ color: totalAnswered >= tier.reqQs ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
              {totalAnswered} / {tier.reqQs}
            </span>
          </li>
        )}
      </ul>

      <div className="mt-auto pt-2 flex flex-col items-center gap-3">
        {subject && isCleared && <StatusPill tone="success">Cleared</StatusPill>}
        {isPassed ? (
          <StatusPill tone="success">Cleared</StatusPill>
        ) : isCoolingDown ? (
          <Button fullWidth variant="secondary" disabled>
            <StatusPill tone="danger" dot={false} className="border-0 bg-transparent p-0">Locked — {cooldown}</StatusPill>
          </Button>
        ) : isLocked ? (
          <Button fullWidth variant="secondary" disabled>
            {subject ? 'Clear the blended tiers first' : `Requires ${tier.reqQs} answered`}
          </Button>
        ) : (
          <Button fullWidth variant={isCleared ? 'secondary' : 'primary'} onClick={() => onStart(tier.level)}>
            {subject ? `${isCleared ? 'Take' : 'Start'} the ${tier.subject} board${isCleared ? ' again' : ''}` : `Start tier ${tier.level} exam`}
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function GauntletTab() {
  const stats = useStore((s) => s.stats);
  const navigate = useNavigate();
  const lockUntil = stats?.gauntletLockUntil;

  // A clock for the cooldown, ticking only while a lock is running. The label
  // is derived from it, not stored.
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
      <div role="status" className="flex flex-col gap-6">
        <span className="sr-only">Loading the Gauntlet…</span>
        <Skeleton className="h-36 rounded-[var(--radius-lg)]" />
        <Grid kind="pair">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-[var(--radius-lg)]" />)}
        </Grid>
      </div>
    );
  }

  const card = (tier) => (
    <TierCard
      key={tier.level}
      tier={tier}
      state={tierState(tier, { currentLevel, totalAnswered, coolingDown: cooldown, boardClears: stats?.gauntletBoardClears })}
      cooldown={cooldown}
      totalAnswered={totalAnswered}
      onStart={start}
    />
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
      <Card variant="hero" className="flex flex-col gap-3">
        <CardWatermark icon={Shield} />
        <h2 className="text-h2 text-textMain flex items-center gap-3">
          <Shield size={24} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--accent-text)' }} /> The Gauntlet
        </h2>
        <p className="text-sm text-muted2 leading-relaxed max-w-2xl">
          Clear the four blended tiers to rank up. Once all four are cleared, the per-subject
          board exams (Math, ESAS, EE) unlock at their real board time. Failing any exam locks
          the Gauntlet for 12 hours.
        </p>
        <Grid kind="tiles" gap="sm" className="pt-2 max-w-md">
          <KpiTile compact label="Current tier" value={`Level ${currentLevel}`} />
          <KpiTile compact label="Questions answered" value={totalAnswered} />
        </Grid>
      </Card>

      <div className="flex flex-col gap-3">
        <p className="text-eyebrow">Blended tiers</p>
        <Grid kind="pair">{GAUNTLET_TIERS.filter((t) => !isSubjectTier(t)).map(card)}</Grid>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-eyebrow flex items-center gap-2">
          Subject boards — 100 items each at board time
          {!subjectsUnlocked && <Lock size={12} strokeWidth={2} className="text-muted" aria-hidden="true" />}
        </p>
        <Grid kind="cards">{GAUNTLET_TIERS.filter((t) => isSubjectTier(t)).map(card)}</Grid>
      </div>
    </div>
  );
}
