// src/features/exams/RematchInvites.jsx
//
// A rematch someone started from a battle you played, on Today and Exams › Battles.
// Those who had left the results screen only found it in Past battles, or by a push
// if push was on. The list comes from the server, so it's the same on any device.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRematchInvites } from '../../services/dbQueries';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Button, Card, CardTitle } from '../../components/ui';
import { Swords } from '../../components/ui/icons';
import { battleLabel } from './battleModes';

const HIDDEN_KEY = 'ree:rematch-hidden';
const readHidden = () => {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY)) || []; } catch { return []; }
};

export default function RematchInvites() {
  const isOnline = useNetworkStatus();
  const [items, setItems] = useState([]);
  const [hidden, setHidden] = useState(readHidden);

  useEffect(() => {
    if (!isOnline) return undefined;
    let live = true;
    fetchRematchInvites()
      .then((data) => { if (live) setItems(data?.items || []); })
      // Only an offer: nothing else depends on it.
      .catch(() => {});
    return () => { live = false; };
  }, [isOnline]);

  const hide = (id) => {
    // Only ids still on offer, so the list doesn't grow for ever.
    const next = [...hidden.filter((h) => items.some((i) => i.battleId === h)), id];
    setHidden(next);
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(next)); } catch { /* hidden for this view only */ }
  };

  const shown = items.filter((i) => !hidden.includes(i.battleId));
  if (shown.length === 0) return null;

  return (
    <Card as="section" padding="md" aria-labelledby="rematch-invites" className="flex flex-col gap-3">
      <CardTitle id="rematch-invites">{shown.length === 1 ? 'A rematch is waiting' : 'Rematches are waiting'}</CardTitle>
      <ul className="flex flex-col gap-3">
        {shown.map((invite) => (
          <li key={invite.battleId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Swords size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" style={{ color: 'var(--accent-danger)' }} />
              <p className="text-sm text-textMain min-w-0 [overflow-wrap:anywhere]">
                <span className="font-semibold">{invite.by || 'Someone'}</span> started a rematch
                <span className="text-muted2"> · {battleLabel(invite.config)}</span>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button as={Link} size="sm" to={`/battle/${invite.battleId}`}>Join</Button>
              <Button size="sm" variant="ghost" onClick={() => hide(invite.battleId)} aria-label={`Not now: the rematch from ${invite.by || 'someone'}`}>Not now</Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
