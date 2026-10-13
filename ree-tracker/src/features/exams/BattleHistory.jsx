// src/features/exams/BattleHistory.jsx
//
// Exams › Battles › Past battles: the battles you've finished, newest first,
// with the format, the date, where you placed ("2nd of 3"), your score, your
// rating change and who you played. Each one opens its review (your answers,
// and how everyone else answered each question) and offers a Rematch: the
// same settings again in a new lobby you host, or Join rematch when someone
// already started one. Nothing listed them before; a finished battle could
// only be found again from its results screen.
//
// The list is GET /api/battles/me/history, held with hooks/useSyncedUserData,
// so it paints from this device's cache and shows offline. "Show more" reads
// the next page with the cursor the server returns.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useSyncedUserData } from '../../hooks/useSyncedUserData';
import { fetchBattleHistory, requestRematch } from '../../services/dbQueries';
import { Button, Card, EmptyState, Skeleton } from '../../components/ui';
import { ClipboardList, CloudOff, History, RotateCcw, Swords, TriangleAlert } from '../../components/ui/icons';
import { battleLabel, ordinal, placeLabel } from './battleModes';

const PAGE = 20;
const ENDPOINT = `/api/battles/me/history?limit=${PAGE}`;
// A USER_CACHE_NAMES entry (services/userCache), cleared on sign-out.
const CACHE = 'battleHistory';
const NEEDS_CONNECTION = 'Rematch needs a connection. Reconnect and try again.';

// Module-level, so their identity holds between renders (useSyncedUserData).
const fromResponse = (res) => ({ items: Array.isArray(res?.items) ? res.items : [], nextBefore: res?.nextBefore ?? null });
// Nothing here is written from this screen, so there is never a queue to lay over.
const overlay = (value) => ({ value, count: 0 });

const dateOf = (at) => (at ? new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null);
const signed = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(Math.round(n))}`;

function BattleRow({ item, uid, isOnline, busy, onRematch }) {
  const navigate = useNavigate();
  const { battleId, rematch } = item;
  const date = dateOf(item.createdAt);
  const opponents = item.opponents || [];
  const joinRematch = () => {
    if (!isOnline) return toast.error('Joining a battle needs a connection. Reconnect and try again.');
    navigate(`/battle/${rematch.battleId}`);
  };

  return (
    <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[var(--radius-lg)] bg-surface2 border border-border">
      <div className="flex items-start gap-3 min-w-0">
        <Swords size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-0.5" style={{ color: 'var(--accent-danger)' }} />
        <div className="min-w-0 flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-textMain">
            {battleLabel(item.config)}
            <span className="text-muted2 font-normal">
              {date && <> · {date}</>} · <span className="font-mono tracking-wider">{battleId}</span>
            </span>
          </p>
          <p className="text-xs text-muted2 tabular-nums flex flex-wrap items-center gap-x-1.5">
            <span className={item.placement === 1 ? 'font-semibold text-[var(--accent-success)]' : 'text-textMain'}>
              {placeLabel(item.placement, item.players)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{item.score}/{item.total}</span>
            {Number.isFinite(item.eloDelta) && (
              <>
                <span aria-hidden="true">·</span>
                <span>rating {signed(item.eloDelta)}</span>
              </>
            )}
          </p>
          {opponents.length > 0 && (
            <p className="text-xs text-muted2 truncate">
              Against {opponents.map((o) => `${o.displayName} (${ordinal(o.placement)})`).join(', ')}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {item.answered > 0 && (
          <Button as={Link} to={`/exams/sittings/${encodeURIComponent(`${battleId}:${uid}`)}`} size="sm" variant="secondary" aria-label={`Review battle ${battleId}`}>
            <ClipboardList size={14} strokeWidth={1.75} aria-hidden="true" /> Review
          </Button>
        )}
        {rematch?.status === 'WAITING' ? (
          <Button size="sm" tone="danger" onClick={joinRematch} aria-label={`Join rematch of battle ${battleId}`}>
            Join rematch
          </Button>
        ) : !rematch && (
          <Button size="sm" variant="outline" loading={busy} disabled={busy} onClick={() => onRematch(battleId)} aria-label={`Rematch battle ${battleId}`}>
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" /> Rematch
          </Button>
        )}
      </div>
    </li>
  );
}

/** @param {{ onHost?: () => void }} props  opens Host a battle, for the empty state */
export default function BattleHistory({ onHost }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isOnline = useNetworkStatus();
  const { value, status, setServer, reload } = useSyncedUserData({
    endpoint: ENDPOINT,
    cacheName: CACHE,
    fromResponse,
    overlay,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  // The battle whose Rematch is being asked for.
  const [rematching, setRematching] = useState(null);

  const items = value?.items || null;
  const offline = !isOnline || status === 'offline';

  const showMore = async () => {
    if (!isOnline) return toast.error('Older battles need a connection.');
    setLoadingMore(true);
    try {
      const page = await fetchBattleHistory({ before: value.nextBefore, limit: PAGE });
      setServer((prev) => {
        const known = new Set((prev?.items || []).map((i) => i.battleId));
        return {
          items: [...(prev?.items || []), ...(page?.items || []).filter((i) => !known.has(i.battleId))],
          nextBefore: page?.nextBefore ?? null,
        };
      });
    } catch {
      toast.error("Couldn't load older battles. Try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const startRematch = async (battleId) => {
    if (!isOnline) return toast.error(NEEDS_CONNECTION);
    setRematching(battleId);
    try {
      const res = await requestRematch(battleId);
      navigate(`/battle/${res.battleId}`);
    } catch (err) {
      toast.error(err?.message === '[OFFLINE]' ? NEEDS_CONNECTION : (err?.message || "Couldn't start a rematch."));
      setRematching(null);
    }
  };

  let body;
  if (items == null) {
    if (status === 'loading') {
      body = (
        <div role="status" className="flex flex-col gap-3">
          <span className="sr-only">Loading your past battles…</span>
          {[0, 1].map((i) => <Skeleton key={i} className="h-20 rounded-[var(--radius-lg)]" />)}
        </div>
      );
    } else {
      body = (
        <EmptyState
          compact
          icon={offline ? CloudOff : TriangleAlert}
          title={offline ? 'Your past battles need a connection' : "Couldn't load your past battles"}
          description={offline ? 'Reconnect once and they show offline after that.' : 'Something went wrong on our side or the connection dropped.'}
          action={<Button size="sm" onClick={reload}>Try again</Button>}
        />
      );
    }
  } else if (items.length === 0) {
    body = (
      <EmptyState
        compact
        icon={Swords}
        title="No battles yet"
        description="Host a battle and send the code to a friend, or join theirs with the code they send you. Finished battles show here."
        action={onHost && <Button size="sm" onClick={onHost}>Host a battle</Button>}
      />
    );
  } else {
    body = (
      <>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <BattleRow
              key={item.battleId}
              item={item}
              uid={currentUser?.uid}
              isOnline={isOnline}
              busy={rematching === item.battleId}
              onRematch={startRematch}
            />
          ))}
        </ul>
        {value.nextBefore && (
          <Button variant="secondary" size="sm" className="self-center" onClick={showMore} loading={loadingMore} disabled={loadingMore}>
            Show more
          </Button>
        )}
      </>
    );
  }

  return (
    <Card elevated className="p-5 sm:p-6 flex flex-col gap-4 md:col-span-2" aria-labelledby="battle-history-title">
      <div>
        <h2 id="battle-history-title" className="text-lg font-semibold text-textMain flex items-center gap-2">
          <History size={18} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent-text)]" /> Past battles
        </h2>
        <p className="text-sm text-muted2 mt-1">Review your answers beside everyone else’s, or play the same settings again.</p>
      </div>
      {items != null && offline && (
        <p className="text-xs text-muted2 flex items-center gap-1.5" role="status">
          <CloudOff size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
          Offline. Showing the battles saved on this device. Rematch needs a connection.
        </p>
      )}
      {body}
    </Card>
  );
}
