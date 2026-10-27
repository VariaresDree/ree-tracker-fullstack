// src/features/exams/RankingsTab.jsx
//
// Exams › Rankings: your rank, then every active reviewer by ability score,
// loaded 20 at a time as you scroll. Moved out of the Arena page.
import { memo, useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { fetchPaginatedLeaderboard } from '../../services/dbQueries';
import { useAuth } from '../../contexts/AuthContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Badge, Button, Card, CardEyebrow, CardHeader, CardTitle, EmptyState, Grid, Skeleton, StatusPill } from '../../components/ui';
import { ChevronDown, ChevronUp, Flame, Trophy } from '../../components/ui/icons';
import YourRankCard from './YourRankCard';

const PAGE = 20;

// Podium colours encode rank, not brand: the --rank-* tokens, with the
// number mixed toward the text colour so it reads on light themes too.
const RANK_HUE = ['var(--rank-gold)', 'var(--rank-silver)', 'var(--rank-bronze)'];
const rankStyle = (index) => {
  const hue = RANK_HUE[index];
  if (!hue) return undefined;
  return {
    background: `color-mix(in srgb, ${hue} 18%, transparent)`,
    borderColor: hue,
    color: `color-mix(in srgb, ${hue} 55%, var(--text-main))`,
  };
};

// One expanded-detail stat cell.
function RankDetailStat({ label, value, accent }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-default)] bg-surface2/40 border border-border2/50 py-2">
      <span className={`text-base font-bold tabular-nums ${accent ? '' : 'text-textMain'}`} style={accent ? { color: `var(--accent-${accent})` } : undefined}>{value}</span>
      <span className="text-micro text-muted uppercase tracking-wide mt-0.5 text-center px-1">{label}</span>
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
        className="w-full flex items-center gap-2 sm:gap-3 p-3 text-left rounded-[var(--radius-default)] cursor-pointer hover-glow"
      >
        <div className="shrink-0 w-8 sm:w-10 flex justify-center">
          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold tabular-nums ${rank && rank <= 3 ? '' : 'bg-surface2 border-border2 text-muted'}`}
            style={rank ? rankStyle(rank - 1) : undefined}
          >
            {rank ?? '—'}
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className={`min-w-0 text-sm font-bold flex items-center gap-2 ${isMe ? 'text-[var(--accent-text)]' : 'text-textMain'}`}>
            <span className="min-w-0 truncate" title={agent.displayName}>{agent.displayName}</span>
            {isMe && <Badge tone="velocity" className="uppercase shrink-0">You</Badge>}
          </span>
          <span className="text-micro text-muted2 tabular-nums truncate">{agent.questionsAnswered || 0} answered</span>
        </div>
        <div className="shrink-0 w-12 flex flex-col items-end">
          <span className="text-sm font-bold tabular-nums inline-flex items-center gap-1" style={{ color: 'var(--color-reeAmber-text)' }}>
            <Flame size={13} strokeWidth={2} aria-hidden="true" />{agent.streak || 0}
          </span>
          <span className="text-micro text-muted uppercase tracking-wide">Streak</span>
        </div>
        <div className="shrink-0 w-14 flex flex-col items-end">
          <span className="text-sm font-bold font-mono tabular-nums" style={{ color: 'var(--accent-signal)' }}>{(agent.thetaRating || 0).toFixed(2)}</span>
          <span className="text-micro text-muted uppercase tracking-wide">θ</span>
        </div>
        <div className="shrink-0 flex justify-end text-muted">
          {open ? <ChevronUp size={18} strokeWidth={2} aria-hidden="true" /> : <ChevronDown size={18} strokeWidth={2} aria-hidden="true" />}
        </div>
      </button>

      {open && (
        <Grid kind="tiles" gap="sm" id={detailId} className="px-3 pb-3 pt-0.5 animate-in fade-in slide-in-from-top-1">
          <RankDetailStat label="Active days" value={agent.activeDays || 0} />
          <RankDetailStat label="Answered" value={agent.questionsAnswered || 0} />
          <RankDetailStat label="Accuracy" value={`${Math.round((agent.accuracy || 0) * 100)}%`} accent="success" />
        </Grid>
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
  // A failed load shows an error with Try again — it used to fall through to
  // "No rankings yet", as if nobody had answered a question.
  const [loadError, setLoadError] = useState(false);
  // Load the rankings ONCE per mount / reconnect. An older effect depended on
  // `leaderboard` and re-fired whenever it changed; offline,
  // fetchPaginatedLeaderboard returns a fresh [] each call, so the empty-array
  // guard stayed true and the effect looped forever (the reported hang).
  const rankingsLoadedRef = useRef(false);

  // Back online after a failed load: the effect below asks again, so show
  // that instead of the old error until it answers (adjusted while
  // rendering, the way React suggests for a change in an input).
  const [wasOnline, setWasOnline] = useState(isOnline);
  if (wasOnline !== isOnline) {
    setWasOnline(isOnline);
    if (isOnline && loadError) {
      setLoadError(false);
      setIsLoadingRankings(true);
    }
  }

  // State is set only in the request's callbacks. Offline, nothing is
  // fetched and the spinner gives way to the offline state (showLoading);
  // when connectivity returns, isOnline flips and this loads for real.
  useEffect(() => {
    if (rankingsLoadedRef.current || !isOnline) return;    // load once — never re-fire on `leaderboard` change
    rankingsLoadedRef.current = true;
    fetchPaginatedLeaderboard(PAGE, null).then(
      ({ agents, lastDoc: newLastDoc }) => {
        // No mounted check: StrictMode's mount-unmount-mount would drop this
        // first load, and a setState after unmount is a no-op anyway.
        setLeaderboard(agents || []);
        setLastDoc(newLastDoc);
        setHasMore((agents || []).length === PAGE);
        setLoadError(false);
        setIsLoadingRankings(false);
      },
      () => {
        rankingsLoadedRef.current = false;          // transient failure — allow a retry
        setLoadError(true);
        setIsLoadingRankings(false);
      },
    );
  }, [isOnline]);
  const showLoading = isOnline && isLoadingRankings;

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
    if (showLoading || isFetchingMore) return;

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
  }, [showLoading, isFetchingMore, hasMore, lastDoc]);

  // Retry after an offline or failed load (the load effect fires once).
  const retryRankings = async () => {
    if (!navigator.onLine) return toast.error('Still offline. Reconnect and try again.');
    setIsLoadingRankings(true);
    try {
      const { agents, lastDoc: newLastDoc } = await fetchPaginatedLeaderboard(PAGE, null);
      setLeaderboard(agents || []);
      setLastDoc(newLastDoc);
      setHasMore((agents || []).length === PAGE);
      setLoadError(false);
      rankingsLoadedRef.current = true;         // mark loaded so the effect won't re-fetch
    } catch {
      setLoadError(true);
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

      {/* As tall as the list, up to 70% of the screen, then it scrolls. It
          was a fixed 65vh (500px at least), so a short list left a tall
          empty card. */}
      <Card elevated className="overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in slide-in-from-bottom-2">
        <CardHeader className="border-b border-border shrink-0">
          <div className="min-w-0">
            <CardEyebrow>Rankings</CardEyebrow>
            <CardTitle className="mt-0.5 flex items-center gap-2">
              <Trophy size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" style={{ color: 'var(--color-reeAmber-text)' }} /> All reviewers, by ability score
            </CardTitle>
          </div>
          <StatusPill tone={isOnline ? 'signal' : 'danger'}>{isOnline ? 'Live' : 'Offline'}</StatusPill>
        </CardHeader>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 stagger-fade-in">
          {showLoading ? (
            // Rows in the list's own shape, not a spinner in the middle.
            <div role="status" className="flex flex-col gap-2 p-1">
              <span className="sr-only">Loading rankings…</span>
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : (leaderboard || []).length === 0 ? (
            loadError && isOnline ? (
              <EmptyState
                icon={Trophy}
                title="Couldn't load the rankings"
                description="Something went wrong on our side or the connection dropped."
                action={<Button onClick={retryRankings}>Try again</Button>}
              />
            ) : !isOnline ? (
              <EmptyState
                icon={Trophy}
                title="You're offline"
                description="Reconnect to view the rankings."
                action={<Button onClick={retryRankings}>Try again</Button>}
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
      </Card>
    </div>
  );
}
