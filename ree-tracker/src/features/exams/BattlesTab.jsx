// src/features/exams/BattlesTab.jsx
//
// Exams › Battles: join a friend's battle by code, or host one, get back
// into one you left part-way, and look back at (or rematch) the ones you've
// finished. Moved out of the Arena page.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchMultiplayerBattle } from '../../services/dbQueries';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Button, Card, CardTitle, CardWatermark, cn, FormField, Grid, Input } from '../../components/ui';
import { Check, Swords } from '../../components/ui/icons';
import HostBattleModal from './HostBattleModal';
import ActiveBattles from './ActiveBattles';
import BattleHistory from './BattleHistory';
import { BATTLE_MODES } from './battleModes';

export default function BattlesTab() {
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);

  const handleJoinBattle = async (e) => {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 6) return toast.error('Invite code must be exactly 6 characters.');
    if (!isOnline) return toast.error("You're offline — joining a battle needs a connection.");

    setIsJoining(true);
    try {
      await fetchMultiplayerBattle(code);
      toast.success('Code accepted — entering lobby.');
      navigate(`/battle/${code}`);
    } catch (error) {
      // Don't mislabel a dropped connection as a bad code.
      if (error?.message === '[OFFLINE]') {
        toast.error("You're offline — joining a battle needs a connection.");
      } else {
        toast.error('That code is invalid or expired.');
        setInviteCode('');
      }
    }
    setIsJoining(false);
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
      {/* A battle you left part-way, with a way back in. */}
      <ActiveBattles />
      <Grid kind="pair">
        {/* Join and Host: the same card, side by side. Join is the tab's
            hero (a code from a friend is the usual way in) and holds the one
            primary button; Host's is secondary. They had a red border and a
            blurred blob on one, and three different shadows between them. */}
        <Card variant="hero" className="flex flex-col gap-6">
          <CardWatermark icon={Swords} corner="top" />
          <div className="flex flex-col gap-1">
            <CardTitle size="lg">Join a battle</CardTitle>
            <p className="text-sm text-muted2 leading-relaxed">
              Enter the 6-character code from the host to join their lobby.
            </p>
          </div>

          <form onSubmit={handleJoinBattle} className="flex flex-col gap-3 w-full mt-auto">
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
            <Button type="submit" fullWidth loading={isJoining} disabled={isJoining || inviteCode.length < 6}>
              Join battle
            </Button>
          </form>
        </Card>

        <Card elevated padding="lg" className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <CardTitle size="lg">Host a battle</CardTitle>
            <p className="text-sm text-muted2 leading-relaxed">
              Set the subject, length, and time limit, then share your code with other reviewers.
            </p>
          </div>
          {/* The formats the dialog offers, so the card isn't empty beside the
              join form. */}
          <ul className="flex flex-col gap-2.5">
            {BATTLE_MODES.map((m) => {
              const Icon = m.icon;
              return (
                <li key={m.id} className="flex items-start gap-3 text-sm">
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--accent-text)' }} />
                  <span><span className="font-semibold text-textMain">{m.name}</span> <span className="text-muted2">— {m.description}</span></span>
                </li>
              );
            })}
          </ul>
          <Button variant="secondary" fullWidth className="mt-auto" onClick={() => setShowHostModal(true)}>
            <Swords size={16} strokeWidth={1.75} aria-hidden="true" />
            Host a battle
          </Button>
        </Card>
      </Grid>

      {/* Finished battles: review, and Rematch. */}
      <BattleHistory onHost={() => setShowHostModal(true)} />

      <HostBattleModal open={showHostModal} onClose={() => setShowHostModal(false)} isOnline={isOnline} />
    </div>
  );
}
