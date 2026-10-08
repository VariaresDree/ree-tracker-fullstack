// src/features/exams/RankingsTab.jsx
//
// Exams › Rankings: your rank, then every active reviewer by ability score,
// loaded 20 at a time as you scroll. Moved out of the Arena page.
import { memo, useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { fetchPaginatedLeaderboard } from '../../services/dbQueries';
import { useAuth } from '../../contexts/AuthContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Badge, Button, EmptyState, StatusPill } from '../../components/ui';
import { ChevronDown, ChevronUp, Flame, Trophy } from '../../components/ui/icons';
import YourRankCard from './YourRankCard';

const PAGE = 20;

// Podium colors are data-viz (gold/silver/bronze), kept as literal values on
// purpose — they encode rank, not brand.
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

// Memoized so the infinite-scroll list re-renders only the rows whose data
// changed, not the whole (growing) list on each page. The summary keeps the
// headline (streak + θ) visible; tapping a row shows active days, answered and
// accuracy.
const LeaderboardRow = memo(function LeaderboardRow({ agent, rank, isMe, rowRef }) {
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
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold tabular-nums ${rank ? rankBadge(rank - 1) : rankBadge(-1)}`}>
            {rank ?? '—'}
          </div>
        </div>
        <div className="col-span-5 sm:col-span-6 flex items-center gap-3 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-bold truncate flex items-center gap-2 ${isMe ? 'text-[var(--accent-text)]' : 'text-textMain'}`}>
              {agent.displayName}
              {isMe && <Badge tone="velocity" className="uppercase shrink-0">You</Badge>}
            </span>
            <span className="text-[11px] text-muted font-mono opacity-60 truncate">ID: {agent.uid.slice(0, 8)}</span>
          </div>
        </div>
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

export default function RankingsTab() {
  const { currentUser } = useAuth();
  const isOnline = useNetworkStatus();
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  // Load the rankings ONCE per mount / reconnect. An older effect depended on
  // `leaderboard` and re-fired whenever it changed; offline,
  // fetchPaginatedLeaderboard returns a fresh [] each call, so the empty-array
  // guard stayed true and the effect looped forever (the reported hang).
  const rankingsLoadedRef = useRef(false);

  useEffect(() => {
    if (rankingsLoadedRef.current) return;          // load once — never re-fire on `leaderboard` change
    // Offline: don't fetch. Clear the spinner so the offline EmptyState + Retry
    // render. When connectivity returns, isOnline flips and this effect re-runs
    // to load for real.
    if (!isOnline) { setIsLoadingRankings(false); return; }

    rankingsLoadedRef.current = true;
    (async () => {
      setIsLoadingRankings(true);
      try {
        const { agents, lastDoc: newLastDoc } = await fetchPaginatedLeaderboard(PAGE, null);
        setLeaderboard(agents || []);
        setLastDoc(newLastDoc);
        setHasMore((agents || []).length === PAGE);
      } catch {
        rankingsLoadedRef.current = false;          // transient failure — allow a retry
        toast.error("Couldn't load the rankings.");
      }
      setIsLoadingRankings(false);
    })();
  }, [isOnline]);

  const observer = useRef(null);
  // Tracks whether this component is still mounted, so an in-flight page fetch
  // cannot setState after teardown.
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
    // The ref callback below only runs on unmount when React passes null;
    // disconnecting here makes teardown unconditional.
    observer.current?.disconnect();
    observer.current = null;
  }, []);

  const lastElementRef = useCallback((node) => {
    if (isLoadingRankings || isFetchingMore) return;

    // Always release the previous observer...
    observer.current?.disconnect();
    observer.current = null;

    // ...and only build a new one when there is actually a node to watch.
    if (!node) return;

    observer.current = new IntersectionObserver(async (entries) => {
      if (!entries[0].isIntersecting || !hasMore) return;
      setIsFetchingMore(true);
      try {
        const { agents, lastDoc: newLastDoc } = await fetchPaginatedLeaderboard(PAGE, lastDoc);
        if (!mountedRef.current) return;
        setLeaderboard((prev) => [...(prev || []), ...(agents || [])]);
        setLastDoc(newLastDoc);
        setHasMore((agents || []).length === PAGE);
      } catch {
        if (mountedRef.current) toast.error("Couldn't load more of the rankings.");
      } finally {
        if (mountedRef.current) setIsFetchingMore(false);
      }
    });

    observer.current.observe(node);
  }, [isLoadingRankings, isFetchingMore, hasMore, lastDoc]);

  // Retry after an offline or failed load (the load effect fires once).
  const retryRankings = async () => {
    if (!navigator.onLine) return toast.error('Still offline. Reconnect and try again.');
    setIsLoadingRankings(true);
    try {
      const { agents, lastDoc: newLastDoc } = await fetchPaginatedLeaderboard(PAGE, null);
      setLeaderboard(agents || []);
      setLastDoc(newLastDoc);
      setHasMore((agents || []).length === PAGE);
      rankingsLoadedRef.current = true;         // mark loaded so the effect won't re-fetch
    } catch {
      toast.error("Couldn't load the rankings. Try again.");
    }
    setIsLoadingRankings(false);
  };

  // Rows are numbered by their place in the list, not counting a leading
  // "you are here" row. "Your rank" uses the same number when you're in the
  // list: it comes from a separate request, which can straddle a snapshot
  // rebuild and briefly disagree with the list below it.
  const offBoardLead = leaderboard?.[0]?.offBoard ? 1 : 0;
  const myIndex = (leaderboard || []).findIndex((a) => a.uid === currentUser?.uid && !a.offBoard);
  const myListRank = myIndex >= 0 ? myIndex + 1 - offBoardLead : null;

  return (
    <div className="flex flex-col gap-6">
      <YourRankCard listRank={myListRank} />

      <div className="bg-surface border border-border2 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px] h-[65vh] animate-in fade-in slide-in-from-bottom-2">
        <div className="p-5 border-b border-border2 bg-surface2/50 flex justify-between items-center shrink-0">
          <div>
            <p className="text-eyebrow">Rankings</p>
            <h2 className="text-sm font-semibold text-textMain flex items-center gap-2 mt-0.5">
              <Trophy size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-reeAmber)' }} /> All reviewers, by ability score
            </h2>
          </div>
          <StatusPill tone={isOnline ? 'signal' : 'danger'}>{isOnline ? 'Live' : 'Offline'}</StatusPill>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 stagger-fade-in">
          {isLoadingRankings ? (
            <div role="status" className="flex flex-col items-center justify-center h-full gap-4 py-20 text-[var(--color-reeAmber)]">
              <span className="telemetry-spinner !w-8 !h-8 border-t-transparent"></span>
              <span className="text-xs font-bold text-muted2 uppercase tracking-widest animate-pulse">Loading rankings…</span>
            </div>
          ) : (leaderboard || []).length === 0 ? (
            !isOnline ? (
              <EmptyState
                icon={Trophy}
                title="You're offline"
                description="Reconnect to view the rankings."
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
                  rank={agent.offBoard ? null : idx + 1 - offBoardLead}
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
    </div>
  );
}
