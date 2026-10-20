// src/features/exams/ActiveBattles.jsx
//
// Exams › Battles: the running battles you're in, with a way back. A player
// who closed the app mid-battle had none: nothing remembered the battle, so it
// could only be found again by its code, and reopening it restarted the exam
// with blank answers. The list comes from the server (works on any device);
// "Return to battle" reopens the exam room with your answers and the time
// actually left. Once you've submitted, it says when the results are due.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchActiveBattles } from '../../services/dbQueries';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Button, Card, StatusPill } from '../../components/ui';
import { ArrowRight, Clock, Swords } from '../../components/ui/icons';
import { formatTimeOfDay } from '../../utils/time';
import { battleLabel } from './battleModes';

const minutesLeft = (ms) => Math.max(1, Math.ceil(ms / 60000));

export default function ActiveBattles() {
  const isOnline = useNetworkStatus();
  // Each item's endsAt / closesAt on this device's clock.
  const [items, setItems] = useState([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isOnline) return undefined;
    let live = true;
    fetchActiveBattles()
      .then((data) => {
        if (!live) return;
        const skew = Date.now() - (data?.serverNow ?? Date.now());
        setItems((data?.items || []).map((b) => ({ ...b, endsAt: b.endsAt + skew, closesAt: b.closesAt + skew })));
        setNow(Date.now());
      })
      // Only a way back in; Join and Host work without it.
      .catch(() => {});
    return () => { live = false; };
  }, [isOnline]);

  // Minutes left move on, and a battle drops off once its results are due.
  useEffect(() => {
    if (items.length === 0) return undefined;
    const t = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, [items.length]);

  const shown = items.filter((b) => b.closesAt > now);
  if (shown.length === 0) return null;

  return (
    <Card elevated padding="md" className="flex flex-col gap-4" aria-labelledby="active-battles-title">
      <div>
        <h2 id="active-battles-title" className="text-lg font-semibold text-textMain">Your battles in progress</h2>
        <p className="text-sm text-muted2 mt-1">Left one part-way? Your answers are saved, and the clock kept running.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {shown.map((b) => {
          const timeUp = b.endsAt <= now;
          return (
            <li key={b.battleId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[var(--radius-lg)] bg-surface2 border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <Swords size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" style={{ color: 'var(--accent-danger)' }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-textMain">
                    Battle <span className="font-mono tracking-wider">{b.battleId}</span>
                    <span className="text-muted2 font-normal"> · {battleLabel(b.config)}</span>
                  </p>
                  <p className="text-xs text-muted2 flex items-center gap-1 mt-0.5 tabular-nums">
                    <Clock size={12} strokeWidth={1.75} aria-hidden="true" />
                    {b.finished || timeUp
                      ? `Results by ${formatTimeOfDay(b.closesAt)}`
                      : `${minutesLeft(b.endsAt - now)} min left`}
                  </p>
                </div>
              </div>
              {b.finished || timeUp ? (
                <span className="flex items-center gap-2 shrink-0">
                  {b.finished && <StatusPill tone="success">Submitted</StatusPill>}
                  <Button as={Link} to={`/battle/${b.battleId}`} size="sm" variant="secondary">Battle room</Button>
                </span>
              ) : (
                <Button as={Link} to={`/simulator?battleId=${b.battleId}`} size="sm" tone="danger" className="shrink-0">
                  Return to battle <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
