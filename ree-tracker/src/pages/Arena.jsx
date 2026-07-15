// src/pages/Arena.jsx
import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMultiplayerBattle, fetchPaginatedLeaderboard } from '../services/dbQueries';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useStore } from '../store/useStore';
import { Button, FormField, Input, Select, Modal, Tabs, StatusPill, Badge, EmptyState, cn } from '../components/ui';
import { Check, Swords, Settings2, Landmark, Scale, Shield, Trophy, Lock, Flame, ChevronDown, ChevronUp } from '../components/ui/icons';
import { GAUNTLET_TIERS, SUBJECT_UNLOCK_LEVEL, isSubjectTier } from '../config/examStandards';
import toast from 'react-hot-toast';

// secs → "Xh Ym" / "Ym" for the tier cards.
const formatLimit = (secs) => {
  const m = Math.round((secs || 0) / 60);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r} min`;
};

const rankBadge = (index) => {
  if (index === 0) return 'bg-[#facc15]/20 border-[#facc15] text-[#facc15]';
  if (index === 1) return 'bg-[#d1d5db]/20 border-[#d1d5db] text-[#d1d5db]';
  if (index === 2) return 'bg-[#b45309]/20 border-[#b45309] text-[#b45309]';
  return 'bg-surface2 border-border2 text-muted';
};

// One expanded-detail stat cell.
function RankDetailStat({ label, value, accent }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-default)] bg-surface2/40 border border-border2/50 py-2">
      <span className={`text-base font-bold tabular-nums ${accent ? '' : 'text-textMain'}`} style={accent ? { color: `var(--accent-${accent})` } : undefined}>{value}</span>
      <span className="text-[10px] text-muted uppercase tracking-wide mt-0.5 text-center px-1">{label}</span>
    </div>
  );
}

// Extracted + memoized so the infinite-scroll leaderboard re-renders only the
// rows whose data actually changed, not the whole (growing) list on each page.
// The summary keeps the competitive headline (streak + theta) always visible;
// tapping the row expands the per-user detail (active days / answered / accuracy).
const LeaderboardRow = memo(function LeaderboardRow({ agent, idx, isMe, rowRef }) {
  const [open, setOpen] = useState(false);
  const detailId = `agent-detail-${agent.uid}`;

  return (
    <div
      ref={rowRef}
      className={`rounded-[var(--radius-default)] mb-1 border transition-colors ${isMe ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_30%,transparent)] shadow-sm' : 'border-transparent hover:bg-surface2'}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen((o) => !o)}
        className="w-full grid grid-cols-12 gap-3 p-3 items-center text-left rounded-[var(--radius-default)] cursor-pointer hover-glow"
      >
        <div className="col-span-2 sm:col-span-1 flex justify-center">
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold tabular-nums ${rankBadge(idx)}`}>
            {idx + 1}
          </div>
        </div>
        <div className="col-span-5 sm:col-span-6 flex items-center gap-3 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-bold truncate flex items-center gap-2 ${isMe ? 'text-[var(--accent)]' : 'text-textMain'}`}>
              {agent.displayName}
              {isMe && <Badge tone="velocity" className="uppercase shrink-0">You</Badge>}
            </span>
            <span className="text-[11px] text-muted font-mono opacity-60 truncate">ID: {agent.uid.slice(0, 8)}</span>
          </div>
        </div>
        {/* Streak + theta stay visible on every screen (the ranked headline). */}
        <div className="col-span-2 flex flex-col items-end">
          <span className="text-sm font-bold tabular-nums inline-flex items-center gap-1" style={{ color: 'var(--color-reeAmber)' }}>
            <Flame size={13} strokeWidth={2} aria-hidden="true" />{agent.streak || 0}
          </span>
          <span className="text-[10px] text-muted uppercase tracking-wide">Streak</span>
        </div>
        <div className="col-span-2 flex flex-col items-end">
          <span className="text-sm font-bold font-mono tabular-nums" style={{ color: 'var(--accent-signal)' }}>{(agent.thetaRating || 0).toFixed(2)}</span>
          <span className="text-[10px] text-muted uppercase tracking-wide">θ</span>
        </div>
        <div className="col-span-1 flex justify-end text-muted">
          {open ? <ChevronUp size={18} strokeWidth={2} aria-hidden="true" /> : <ChevronDown size={18} strokeWidth={2} aria-hidden="true" />}
        </div>
      </button>

      {open && (
        <div id={detailId} className="grid grid-cols-3 gap-2 px-3 pb-3 pt-0.5 animate-in fade-in slide-in-from-top-1">
          <RankDetailStat label="Active days" value={agent.activeDays || 0} />
          <RankDetailStat label="Answered" value={agent.questionsAnswered || 0} />
          <RankDetailStat label="Accuracy" value={`${Math.round((agent.accuracy || 0) * 100)}%`} accent="success" />
        </div>
      )}
    </div>
  );
});

export default function Arena() {
  const { currentUser } = useAuth();
  const stats = useStore((s) => s.stats);
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  
  const [activeTab, setActiveTab] = useState('terminal'); 
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  // Load the rankings ONCE per tab-entry / reconnect. The old effect depended
  // on `leaderboard` and re-fired whenever it changed; offline,
  // fetchPaginatedLeaderboard returns a fresh [] each call, so the empty-array
  // guard stayed true and the effect looped forever (the reported hang).
  const rankingsLoadedRef = useRef(false);
  
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(null);

  const [hostConfig, setHostConfig] = useState({
    mode: 'custom', 
    subject: 'EE',
    count: 20,
    timeLimitMins: 30
  });

  useEffect(() => {
      const lockUntil = stats?.gauntletLockUntil;
      if (!lockUntil || lockUntil <= Date.now()) {
          setCooldownTimer(null);
          return;
      }

      const interval = setInterval(() => {
          const diff = lockUntil - Date.now();
          if (diff <= 0) {
              setCooldownTimer(null);
              clearInterval(interval);
          } else {
              const h = Math.floor(diff / (1000 * 60 * 60));
              const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const s = Math.floor((diff % (1000 * 60)) / 1000);
              setCooldownTimer(`${h}h ${m}m ${s}s`);
          }
      }, 1000);

      return () => clearInterval(interval);
  }, [stats?.gauntletLockUntil]);

  useEffect(() => {
    if (activeTab !== 'leaderboard') return;
    if (rankingsLoadedRef.current) return;          // load once — never re-fire on `leaderboard` change
    // Offline: don't fetch. Clear the spinner so the offline EmptyState + Retry
    // render (the effect deps are [activeTab, isOnline] and neither self-mutates,
    // so there is no loop). When connectivity returns, isOnline flips and this
    // effect re-runs to load for real.
    if (!isOnline) { setIsLoadingRankings(false); return; }

    rankingsLoadedRef.current = true;
    (async () => {
      setIsLoadingRankings(true);
      try {
        const { agents, lastDoc: newLastDoc } = await fetchPaginatedLeaderboard(20, null);
        setLeaderboard(agents || []);
        setLastDoc(newLastDoc);
        setHasMore((agents || []).length === 20);
      } catch (error) {
        rankingsLoadedRef.current = false;          // transient failure — allow a retry
        toast.error("Failed to connect to the Global Matrix.");
      }
      setIsLoadingRankings(false);
    })();
  }, [activeTab, isOnline]);

  const observer = useRef();
  const lastElementRef = useCallback(node => {
    if (isLoadingRankings || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(async entries => {
      if (entries[0].isIntersecting && hasMore) {
        setIsFetchingMore(true);
        try {
            const { agents, lastDoc: newLastDoc } = await fetchPaginatedLeaderboard(20, lastDoc);
            setLeaderboard(prev => [...(prev || []), ...(agents || [])]);
            setLastDoc(newLastDoc);
            setHasMore((agents || []).length === 20);
        } catch (error) {
            toast.error("Network disruption while fetching rankings.");
        }
        setIsFetchingMore(false);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoadingRankings, isFetchingMore, hasMore, lastDoc]);

  const handleJoinBattle = async (e) => {
      e.preventDefault();
      const code = inviteCode.trim().toUpperCase();
      if (code.length !== 6) return toast.error("Invite code must be exactly 6 characters.");
      if (!isOnline) return toast.error("You're offline — joining a battle needs a connection.");

      setIsJoining(true);
      try {
          await fetchMultiplayerBattle(code);
          toast.success("Code accepted — entering lobby.");
          navigate(`/battle/${code}`);
      } catch (error) {
          // Don't mislabel a dropped connection as a bad code.
          if (error?.message === '[OFFLINE]') {
              toast.error("You're offline — joining a battle needs a connection.");
          } else {
              toast.error("That code is invalid or expired.");
              setInviteCode('');
          }
      }
      setIsJoining(false);
  };

  const initiateGauntlet = (level) => {
      if (cooldownTimer) {
          return toast.error("The Gauntlet is locked — check the cooldown timer.");
      }
      navigate(`/gauntlet/${level}`);
  };

  // Retry the global-rankings load after an offline/failed fetch (the initial
  // load effect only fires while the list is empty, so it won't self-retry).
  const retryRankings = async () => {
      if (!navigator.onLine) return toast.error("Still offline — reconnect and try again.");
      setIsLoadingRankings(true);
      try {
          const { agents, lastDoc: newLastDoc } = await fetchPaginatedLeaderboard(20, null);
          setLeaderboard(agents || []);
          setLastDoc(newLastDoc);
          setHasMore((agents || []).length === 20);
          rankingsLoadedRef.current = true;         // mark loaded so the effect won't re-fetch
      } catch {
          toast.error("Couldn't load rankings — try again.");
      }
      setIsLoadingRankings(false);
  };

  // Podium colors are data-viz (gold/silver/bronze), kept as literal values on
  // purpose — they encode rank, not brand.
  const handleDeployLobby = async () => {
      if (!isOnline) return toast.error("You're offline — hosting a battle needs a connection.");
      const toastId = toast.loading("Creating your lobby…");
      try {
          const { createMultiplayerBattle } = await import('../services/dbQueries');

          let finalTime = hostConfig.timeLimitMins;
          if (hostConfig.mode === 'blended') finalTime = 300;
          if (hostConfig.mode === 'prc') finalTime = hostConfig.subject === 'EE' ? 360 : 240;

          // Send only the pool SPEC — the server samples the questions itself
          // (a client-assembled pool would require shipping answer keys).
          const finalConfig = {
              mode: hostConfig.mode === 'blended' ? 'blended' : 'subject',
              subject: hostConfig.mode === 'blended' ? 'Blended' : hostConfig.subject,
              count: hostConfig.mode === 'prc' || hostConfig.mode === 'blended' ? 100 : hostConfig.count,
              timeLimitMins: finalTime,
              isPrcStandard: hostConfig.mode === 'prc' || hostConfig.mode === 'blended'
          };

          const battleId = await createMultiplayerBattle(finalConfig, finalTime * 60);

          toast.success("Lobby created.", { id: toastId });
          setShowHostModal(false);
          navigate(`/battle/${battleId}`);
      } catch (error) {
          // Map the raw [OFFLINE] sentinel to human copy instead of leaking it.
          const msg = error?.message === '[OFFLINE]'
              ? "You're offline — hosting a battle needs a connection."
              : (error?.message || "Failed to generate lobby.");
          toast.error(msg, { id: toastId });
      }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 page-fade-in pb-12 w-full pt-4">
      
      <Tabs
        label="Arena sections"
        active={activeTab}
        onChange={setActiveTab}
        className="mt-2"
        tabs={[
          { id: 'terminal', label: 'Combat Terminal', icon: Swords },
          { id: 'gauntlet', label: 'The Gauntlet', icon: Shield },
          { id: 'leaderboard', label: 'Rankings', icon: Trophy },
        ]}
      />

      {activeTab === 'terminal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
            
            <div className="p-6 md:p-8 bg-surface border border-reeRed/30 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-48 h-48 bg-reeRed/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div>
                  <h3 className="text-lg font-semibold text-textMain tracking-tight mb-1 relative z-10">
                      Join a battle
                  </h3>
                  <p className="text-sm text-muted2 mb-6 relative z-10 leading-relaxed">
                      Enter the 6-character code from the host to join their lobby.
                  </p>
                </div>

                <form onSubmit={handleJoinBattle} className="flex flex-col gap-3 relative z-10 w-full mt-auto">
                    <FormField
                        label="Battle code"
                        hint={
                          <span aria-live="polite" className={cn('inline-flex items-center gap-1', inviteCode.length === 6 && 'text-[var(--accent-success)]')}>
                            {inviteCode.length === 6 && <Check size={12} strokeWidth={2.5} aria-hidden="true" />}
                            {inviteCode.length}/6 characters
                          </span>
                        }
                    >
                        <Input
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            placeholder="ABC123"
                            maxLength={6}
                            autoComplete="off"
                            spellCheck={false}
                            className={cn(
                              'font-mono font-bold tracking-[0.2em] uppercase placeholder:tracking-[0.2em]',
                              inviteCode.length === 6 && 'border-[color-mix(in_srgb,var(--accent-success)_55%,transparent)]'
                            )}
                        />
                    </FormField>
                    <Button
                        type="submit"
                        fullWidth
                        loading={isJoining}
                        disabled={isJoining || inviteCode.length < 6}
                    >
                        Join battle
                    </Button>
                </form>
            </div>

            <div className="p-6 md:p-8 bg-surface border border-border2 rounded-2xl shadow-sm flex flex-col">
                 <div>
                   <h3 className="text-lg font-semibold text-textMain tracking-tight mb-1">
                       Host a battle
                   </h3>
                   <p className="text-sm text-muted2 mb-5 leading-relaxed">
                      Set the subject, length, and time limit, then share your code with other reviewers.
                   </p>
                 </div>
                 {/* Mode preview — fills the card and previews the modal's options
                     so there's no dead space, balanced against the Join form. */}
                 <ul className="flex flex-col gap-2.5 mb-6">
                   <li className="flex items-start gap-3 text-sm">
                     <Settings2 size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                     <span><span className="font-semibold text-textMain">Custom Drill</span> <span className="text-muted2">— your item count + time limit.</span></span>
                   </li>
                   <li className="flex items-start gap-3 text-sm">
                     <Landmark size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                     <span><span className="font-semibold text-textMain">PRC Standard</span> <span className="text-muted2">— 100 items at the fixed 4–6 h board time.</span></span>
                   </li>
                   <li className="flex items-start gap-3 text-sm">
                     <Scale size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                     <span><span className="font-semibold text-textMain">Full Blended</span> <span className="text-muted2">— 100 mixed Math/ESAS/EE items in 5 h.</span></span>
                   </li>
                 </ul>
                 <Button variant="secondary" fullWidth className="mt-auto" onClick={() => setShowHostModal(true)}>
                    <Swords size={16} strokeWidth={1.75} aria-hidden="true" />
                    Host a battle
                 </Button>
            </div>
        </div>
      )}

      {activeTab === 'gauntlet' && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="p-6 bg-surface border rounded-[var(--radius-lg)] shadow-sm relative overflow-hidden flex flex-col justify-center"
                style={{ borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}
            >
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}></div>
                <h3 className="text-display text-2xl text-textMain tracking-tight mb-2 relative z-10 flex items-center gap-3">
                    <Shield size={24} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--accent)' }} /> The Gauntlet
                </h3>
                <p className="text-sm text-muted2 relative z-10 leading-relaxed max-w-2xl">
                    Clear the four blended tiers to rank up. Once all four are cleared, the per-subject
                    board exams (Math, ESAS, EE) unlock at their real board time. Failing any exam locks
                    the Gauntlet for 12 hours.
                </p>
                <div className="mt-4 flex gap-4 relative z-10 flex-wrap">
                    <div className="bg-bg border border-border2 px-4 py-2 rounded-[var(--radius-default)] flex flex-col">
                        <span className="text-eyebrow mb-0.5">Current tier</span>
                        <span className="font-mono text-lg font-bold tabular-nums" style={{ color: 'var(--accent)' }}>Level {stats?.gauntletLevel || 1}</span>
                    </div>
                    <div className="bg-bg border border-border2 px-4 py-2 rounded-[var(--radius-default)] flex flex-col">
                        <span className="text-eyebrow mb-0.5">Questions answered</span>
                        <span className="font-mono text-lg font-bold text-textMain tabular-nums">{stats?.totalAnswered || 0}</span>
                    </div>
                </div>
            </div>

            {(() => {
              const currentLevel = stats?.gauntletLevel || 1;
              const totalAnswered = stats?.totalAnswered || 0;
              const subjectsUnlocked = currentLevel >= SUBJECT_UNLOCK_LEVEL;

              const TierCard = (tier) => {
                const subject = isSubjectTier(tier);
                const isPassed = !subject && currentLevel > tier.level;
                const isUnlocked = subject
                  ? subjectsUnlocked
                  : (currentLevel === tier.level && totalAnswered >= tier.reqQs);
                const isLocked = !isPassed && !isUnlocked;
                const isCoolingDown = isUnlocked && cooldownTimer;

                return (
                  <div
                    key={tier.level}
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

                    <h4 className={`text-xl font-semibold tracking-tight mb-2 relative z-10 ${isPassed || isUnlocked ? 'text-textMain' : 'text-muted'}`}>
                      {tier.name}
                    </h4>

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
                          <StatusPill tone="danger" dot={false} className="border-0 bg-transparent p-0">Locked — {cooldownTimer}</StatusPill>
                        </Button>
                      ) : isLocked ? (
                        <Button fullWidth variant="secondary" disabled>
                          {subject ? 'Clear the blended tiers first' : `Requires ${tier.reqQs} answered`}
                        </Button>
                      ) : (
                        <Button fullWidth onClick={() => initiateGauntlet(tier.level)}>
                          {subject ? `Start ${tier.subject} board` : `Start tier ${tier.level} exam`}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              };

              const blended = GAUNTLET_TIERS.filter((t) => !isSubjectTier(t));
              const subjects = GAUNTLET_TIERS.filter((t) => isSubjectTier(t));

              return (
                <>
                  <div>
                    <p className="text-eyebrow mb-3">Blended tiers</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{blended.map(TierCard)}</div>
                  </div>
                  <div>
                    <p className="text-eyebrow mb-3 flex items-center gap-2">
                      Subject boards — 100 items each at board time
                      {!subjectsUnlocked && <Lock size={12} strokeWidth={2} className="text-muted" aria-hidden="true" />}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{subjects.map(TierCard)}</div>
                  </div>
                </>
              );
            })()}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-surface border border-border2 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px] h-[65vh] animate-in fade-in slide-in-from-bottom-2">
          
          <div className="p-5 border-b border-border2 bg-surface2/50 flex justify-between items-center shrink-0">
            <div>
              <p className="text-eyebrow">Arena</p>
              <h2 className="text-sm font-semibold text-textMain flex items-center gap-2 mt-0.5">
                <Trophy size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-reeAmber)' }} /> Global rankings
              </h2>
            </div>
            <StatusPill tone={isOnline ? 'signal' : 'danger'}>{isOnline ? 'Live' : 'Offline'}</StatusPill>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 stagger-fade-in">
            {isLoadingRankings ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-20 text-[var(--color-reeAmber)]">
                <span className="telemetry-spinner !w-8 !h-8 border-t-transparent"></span>
                <span className="text-xs font-bold text-muted2 uppercase tracking-widest animate-pulse">Loading rankings…</span>
              </div>
            ) : (leaderboard || []).length === 0 ? (
              !isOnline ? (
                <EmptyState
                  icon={Trophy}
                  title="You're offline"
                  description="Reconnect to view the global rankings."
                  action={<Button onClick={retryRankings}>Retry</Button>}
                />
              ) : (
                <EmptyState
                  icon={Trophy}
                  title="No rankings yet"
                  description="Rankings appear once reviewers start answering questions."
                />
              )
            ) : (
              <>
                {(leaderboard || []).map((agent, idx) => (
                  <LeaderboardRow
                    key={agent.uid}
                    agent={agent}
                    idx={idx}
                    isMe={agent.uid === currentUser?.uid}
                    rowRef={idx === (leaderboard || []).length - 1 ? lastElementRef : null}
                  />
                ))}

                {isFetchingMore && (
                  <div className="flex items-center justify-center py-6 animate-in fade-in text-[var(--color-reeAmber)]">
                    <span className="telemetry-spinner !w-5 !h-5 border-t-transparent mr-3"></span>
                  </div>
                )}

                {!hasMore && (leaderboard || []).length > 0 && (
                  <div className="text-center py-8">
                     <span className="text-eyebrow border-t border-border2 pt-4 px-12">End of list</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Host configuration — Modal handles Escape, backdrop close, and
          max-height scrolling on small screens. */}
      <Modal
        open={showHostModal}
        onClose={() => setShowHostModal(false)}
        size="lg"
        icon={Swords}
        title="Host a battle"
        eyebrow="Combat Terminal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowHostModal(false)}>Cancel</Button>
            <Button onClick={handleDeployLobby}>Create lobby</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Battle mode">
            {[
              { id: 'custom', icon: Settings2, name: 'Custom Drill', description: 'Pick the item count and time limit yourself.' },
              { id: 'prc', icon: Landmark, name: 'PRC Standard', description: 'Strict 100 items with the fixed 4 or 6 hour limit.' },
              { id: 'blended', icon: Scale, name: 'Full Blended', description: '100 mixed items (Math, ESAS, EE) in 5 hours.' },
            ].map((m) => {
              const selected = hostConfig.mode === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setHostConfig({ ...hostConfig, mode: m.id })}
                  className={cn(
                    'p-4 rounded-[var(--radius-lg)] border text-left transition-all cursor-pointer btn-press',
                    selected
                      ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_45%,transparent)]'
                      : 'bg-surface2 border-border hover:bg-surface3 hover:border-border2'
                  )}
                >
                  <h4 className={cn('text-sm font-semibold mb-1 flex items-center gap-2', selected ? 'text-[var(--accent)]' : 'text-textMain')}>
                    <Icon size={16} strokeWidth={1.75} aria-hidden="true" /> {m.name}
                  </h4>
                  <p className="text-xs text-muted2 leading-relaxed hidden sm:block">{m.description}</p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Subject">
              <Select
                disabled={hostConfig.mode === 'blended'}
                value={hostConfig.mode === 'blended' ? 'Blended' : hostConfig.subject}
                onChange={(e) => setHostConfig({ ...hostConfig, subject: e.target.value })}
              >
                {hostConfig.mode === 'blended' ? (
                  <option value="Blended">Math, ESAS & EE blended</option>
                ) : (
                  <>
                    <option value="Mathematics">Mathematics</option>
                    <option value="ESAS">ESAS</option>
                    <option value="EE">Electrical Engineering (EE)</option>
                  </>
                )}
              </Select>
            </FormField>
            <FormField label="Questions">
              <Select
                disabled={hostConfig.mode === 'prc' || hostConfig.mode === 'blended'}
                value={hostConfig.mode === 'custom' ? hostConfig.count : 100}
                onChange={(e) => setHostConfig({ ...hostConfig, count: parseInt(e.target.value) })}
              >
                <option value="10">10 questions (quick drill)</option>
                <option value="20">20 questions (standard)</option>
                <option value="50">50 questions (extended)</option>
                <option value="100">100 questions (full mock)</option>
              </Select>
            </FormField>
          </div>

          {hostConfig.mode === 'custom' && (
            <FormField label="Time limit" className="sm:max-w-[50%]">
              <Select
                value={hostConfig.timeLimitMins}
                onChange={(e) => setHostConfig({ ...hostConfig, timeLimitMins: parseInt(e.target.value) })}
              >
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
                <option value="120">2 hours</option>
                <option value="180">3 hours</option>
              </Select>
            </FormField>
          )}
        </div>
      </Modal>

    </div>
  );
}