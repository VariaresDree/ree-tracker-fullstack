// src/layouts/PhoneHeader.jsx
//
// The phone's top bar: brand (home), the focus timer, connection status, and
// the account menu. The five destinations are in the bottom bar; there is no
// hamburger drawer any more — everything a learner needs is one tap away.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Pomodoro from '../components/Pomodoro';
import OfflineStatusBadge from '../components/OfflineStatusBadge';
import { Button, Modal } from '../components/ui';
import { Timer } from '../components/ui/icons';
import AccountMenu from './AccountMenu';

export default function PhoneHeader() {
  const [timerOpen, setTimerOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[40] bg-surface border-b border-border2 shadow-sm flex items-center justify-between gap-2 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <Link to="/" className="text-lg font-bold tracking-tight text-[var(--accent)]">
        REE<span className="text-textMain">.ai</span>
      </Link>

      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" aria-label="Focus timer" onClick={() => setTimerOpen(true)} className="text-muted hover:text-textMain">
          <Timer size={20} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <Link to="/account#offline" aria-label="Connection and offline pack" className="touch-target inline-flex items-center justify-center">
          <OfflineStatusBadge collapsed />
        </Link>
        <AccountMenu />
      </div>

      <Modal open={timerOpen} onClose={() => setTimerOpen(false)} title="Focus timer" icon={Timer}>
        <div className="flex justify-center">
          <Pomodoro />
        </div>
      </Modal>
    </header>
  );
}
