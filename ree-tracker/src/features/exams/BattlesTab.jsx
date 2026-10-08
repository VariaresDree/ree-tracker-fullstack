// src/features/exams/BattlesTab.jsx
//
// Exams › Battles: join a friend's battle by code, or host one. Moved out of
// the Arena page, where it was the "Combat Terminal".
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchMultiplayerBattle } from '../../services/dbQueries';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Button, FormField, Input, cn } from '../../components/ui';
import { Check, Swords } from '../../components/ui/icons';
import HostBattleModal from './HostBattleModal';
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="p-6 md:p-8 bg-surface border border-reeRed/30 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-48 h-48 bg-reeRed/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div>
          <h2 className="text-lg font-semibold text-textMain tracking-tight mb-1 relative z-10">Join a battle</h2>
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
          <Button type="submit" fullWidth loading={isJoining} disabled={isJoining || inviteCode.length < 6}>
            Join battle
          </Button>
        </form>
      </div>

      <div className="p-6 md:p-8 bg-surface border border-border2 rounded-2xl shadow-sm flex flex-col">
        <div>
          <h2 className="text-lg font-semibold text-textMain tracking-tight mb-1">Host a battle</h2>
          <p className="text-sm text-muted2 mb-5 leading-relaxed">
            Set the subject, length, and time limit, then share your code with other reviewers.
          </p>
        </div>
        {/* The formats the dialog offers, so the card isn't empty beside the
            join form. */}
        <ul className="flex flex-col gap-2.5 mb-6">
          {BATTLE_MODES.map((m) => {
            const Icon = m.icon;
            return (
              <li key={m.id} className="flex items-start gap-3 text-sm">
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                <span><span className="font-semibold text-textMain">{m.name}</span> <span className="text-muted2">— {m.description}</span></span>
              </li>
            );
          })}
        </ul>
        <Button variant="secondary" fullWidth className="mt-auto" onClick={() => setShowHostModal(true)}>
          <Swords size={16} strokeWidth={1.75} aria-hidden="true" />
          Host a battle
        </Button>
      </div>

      <HostBattleModal open={showHostModal} onClose={() => setShowHostModal(false)} isOnline={isOnline} />
    </div>
  );
}
