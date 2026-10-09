// src/features/exams/HostBattleModal.jsx
//
// Host a battle: pick a format, subject and length, create the lobby, and go
// to it. The formats share their names and icons with the mock-board profiles
// (features/board-simulator/profiles.js), so a "One subject (PRC clock)"
// battle and mock board are the same thing.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { normalizeSubject } from '@ree/shared';
import { Button, FormField, Modal, Select, cn } from '../../components/ui';
import { Swords } from '../../components/ui/icons';
import { PRC_TIMES } from '../../config/examStandards';
import { BATTLE_MODES as MODES } from './battleModes';

export default function HostBattleModal({ open, onClose, isOnline }) {
  const navigate = useNavigate();
  const [hostConfig, setHostConfig] = useState({
    mode: 'custom',
    subject: 'EE',
    count: 20,
    timeLimitMins: 30,
  });
  // A second tap while the first request ran created a second lobby.
  const [creating, setCreating] = useState(false);

  const handleDeployLobby = async () => {
    if (creating) return;
    if (!isOnline) return toast.error("You're offline — hosting a battle needs a connection.");
    setCreating(true);
    const toastId = toast.loading('Creating your lobby…');
    try {
      const { createMultiplayerBattle } = await import('../../services/dbQueries');

      let finalTime = hostConfig.timeLimitMins;
      // PRC schedule from @ree/shared (via examStandards): Math 5h, ESAS 4h, EE 6h.
      if (hostConfig.mode === 'blended') finalTime = PRC_TIMES.BLENDED / 60;
      if (hostConfig.mode === 'prc') finalTime = (PRC_TIMES[normalizeSubject(hostConfig.subject)] || PRC_TIMES.BLENDED) / 60;

      // Send only the pool SPEC — the server samples the questions itself
      // (a client-assembled pool would require shipping answer keys).
      const finalConfig = {
        mode: hostConfig.mode === 'blended' ? 'blended' : 'subject',
        subject: hostConfig.mode === 'blended' ? 'Blended' : hostConfig.subject,
        count: hostConfig.mode === 'prc' || hostConfig.mode === 'blended' ? 100 : hostConfig.count,
        timeLimitMins: finalTime,
        isPrcStandard: hostConfig.mode === 'prc' || hostConfig.mode === 'blended',
      };

      const battleId = await createMultiplayerBattle(finalConfig, finalTime * 60);

      toast.success('Lobby created.', { id: toastId });
      onClose();
      navigate(`/battle/${battleId}`);
    } catch (error) {
      // Map the raw [OFFLINE] sentinel to human copy instead of leaking it.
      const msg = error?.message === '[OFFLINE]'
        ? "You're offline — hosting a battle needs a connection."
        : (error?.message || "Couldn't create the lobby.");
      toast.error(msg, { id: toastId });
    } finally {
      setCreating(false);
    }
  };

  return (
    // Modal handles Escape, backdrop close, and max-height scrolling on small
    // screens.
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={Swords}
      title="Host a battle"
      eyebrow="Battles"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={creating}>Cancel</Button>
          <Button onClick={handleDeployLobby} loading={creating} disabled={creating}>Create lobby</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Battle format">
          {MODES.map((m) => {
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
                <span className={cn('text-sm font-semibold mb-1 flex items-center gap-2', selected ? 'text-[var(--accent-text)]' : 'text-textMain')}>
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" /> {m.name}
                </span>
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
  );
}
