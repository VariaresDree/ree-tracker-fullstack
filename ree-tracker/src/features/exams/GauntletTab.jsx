// src/features/exams/GauntletTab.jsx
//
// Exams › Gauntlet: the ranked ladder. Four blended tiers in order, then the
// three subject boards at board time. Moved out of the Arena page, where it
// hid behind a "Rankings" label.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { Badge, Button, StatusPill } from '../../components/ui';
import { Lock, Shield, Swords, Trophy } from '../../components/ui/icons';
import { GAUNTLET_TIERS, SUBJECT_UNLOCK_LEVEL, isSubjectTier } from '../../config/examStandards';
import { cooldownLabel, formatLimit, tierState } from './gauntletTierState';

function TierCard({ tier, state, cooldown, totalAnswered, onStart }) {
  const { subject, isPassed, isUnlocked, isLocked, isCoolingDown } = state;
  return (
    <div
      className={`p-6 rounded-[var(--radius-lg)] border flex flex-col transition-all relative overflow-hidden bg-surface ${isLocked ? 'opacity-60' : ''}`}
      style={{
        borderColor: isPassed
          ? 'color-mix(in srgb, var(--accent-success) 30%, transparent)'
          : isUnlocked
            ? 'color-mix(in srgb, var(--accent) 50%, transparent)'
            : 'var(--border-main)',
      }}
    >
      <div className="flex justify-between items-start mb-4 relative z-10">
        <Badge tone={isPassed ? 'success' : isUnlocked ? 'velocity' : 'neutral'}>
          {subject ? tier.subject : `Tier ${tier.level}`}
        </Badge>
        <span className="opacity-80" aria-hidden="true">
          {isPassed
            ? <Trophy size={22} strokeWidth={1.75} style={{ color: 'var(--accent-success)' }} />
            : isUnlocked
              ? <Swords size={22} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
              : <Lock size={22} strokeWidth={1.75} className="text-muted" />}
        </span>
      </div>

      <h3 className={`text-xl font-semibold tracking-tight mb-2 relative z-10 ${isPassed || isUnlocked ? 'text-textMain' : 'text-muted'}`}>
        {tier.name}
      </h3>

      <ul className="flex flex-col gap-1.5 text-xs font-mono text-muted mb-6 relative z-10">
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

      <div className="mt-auto relative z-10 flex justify-center">
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
          <Button fullWidth onClick={() => onStart(tier.level)}>
            {subject ? `Start ${tier.subject} board` : `Start tier ${tier.level} exam`}
          </Button>
        )}
      </div>
    </div>
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

  const card = (tier) => (
    <TierCard
      key={tier.level}
      tier={tier}
      state={tierState(tier, { currentLevel, totalAnswered, coolingDown: cooldown })}
      cooldown={cooldown}
      totalAnswered={totalAnswered}
      onStart={start}
    />
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
      <div
        className="p-6 bg-surface border rounded-[var(--radius-lg)] shadow-sm relative overflow-hidden flex flex-col justify-center"
        style={{ borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}></div>
        <h2 className="text-display text-2xl text-textMain tracking-tight mb-2 relative z-10 flex items-center gap-3">
          <Shield size={24} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--accent)' }} /> The Gauntlet
        </h2>
        <p className="text-sm text-muted2 relative z-10 leading-relaxed max-w-2xl">
          Clear the four blended tiers to rank up. Once all four are cleared, the per-subject
          board exams (Math, ESAS, EE) unlock at their real board time. Failing any exam locks
          the Gauntlet for 12 hours.
        </p>
        <div className="mt-4 flex gap-4 relative z-10 flex-wrap">
          <div className="bg-bg border border-border2 px-4 py-2 rounded-[var(--radius-default)] flex flex-col">
            <span className="text-eyebrow mb-0.5">Current tier</span>
            <span className="font-mono text-lg font-bold tabular-nums" style={{ color: 'var(--accent)' }}>Level {currentLevel}</span>
          </div>
          <div className="bg-bg border border-border2 px-4 py-2 rounded-[var(--radius-default)] flex flex-col">
            <span className="text-eyebrow mb-0.5">Questions answered</span>
            <span className="font-mono text-lg font-bold text-textMain tabular-nums">{totalAnswered}</span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-eyebrow mb-3">Blended tiers</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{GAUNTLET_TIERS.filter((t) => !isSubjectTier(t)).map(card)}</div>
      </div>
      <div>
        <p className="text-eyebrow mb-3 flex items-center gap-2">
          Subject boards — 100 items each at board time
          {!subjectsUnlocked && <Lock size={12} strokeWidth={2} className="text-muted" aria-hidden="true" />}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{GAUNTLET_TIERS.filter((t) => isSubjectTier(t)).map(card)}</div>
      </div>
    </div>
  );
}
