// src/features/exams/YourRankCard.jsx
//
// Your place on the rankings, above the list in Exams → Rankings. It used to
// sit in Profile's "Comparative analytics" as a large ring labelled "Global
// Matrix Ranking", far from the list it summarized. One request: /me already
// returns the rank and the number ranked.
import { useEffect, useState } from 'react';
import { fetchLeaderboardMe } from '../../services/dbQueries';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Card, Skeleton } from '../../components/ui';
import { Trophy } from '../../components/ui/icons';

export default function YourRankCard() {
  const isOnline = useNetworkStatus();
  // undefined = loading, null = unavailable, else the /me payload.
  const [me, setMe] = useState(undefined);

  useEffect(() => {
    if (!isOnline) return undefined;
    let live = true;
    fetchLeaderboardMe()
      .then((r) => { if (live) setMe(r || null); })
      .catch(() => { if (live) setMe(null); });
    return () => { live = false; };
  }, [isOnline]);

  const ranked = typeof me?.rank === 'number' && me.rank > 0;
  const total = me?.total || 0;

  let body;
  if (!isOnline) {
    body = <p className="text-sm text-muted2">Reconnect to see your rank.</p>;
  } else if (me === undefined) {
    body = <Skeleton className="h-9 w-40" />;
  } else if (ranked) {
    body = (
      <p className="flex items-baseline gap-2">
        <span className="text-display text-3xl text-textMain tabular-nums">#{me.rank}</span>
        <span className="text-sm text-muted2">of {total} reviewer{total === 1 ? '' : 's'}</span>
      </p>
    );
  } else if (me) {
    body = <p className="text-sm text-muted2">Not ranked yet. Answer a few questions to join the rankings.</p>;
  } else {
    body = <p className="text-sm text-muted2">Your rank isn’t available right now.</p>;
  }

  return (
    <Card elevated className="p-5 flex items-center gap-4">
      <span className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface2 border border-border" aria-hidden="true">
        <Trophy size={20} strokeWidth={1.75} style={{ color: 'var(--color-reeAmber)' }} />
      </span>
      <div className="min-w-0 flex flex-col gap-1">
        <h2 className="text-eyebrow">Your rank</h2>
        {body}
        <p className="text-xs text-muted2">Ranked by ability score (θ), from server-graded answers.</p>
      </div>
    </Card>
  );
}
