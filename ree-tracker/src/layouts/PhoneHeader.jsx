// src/layouts/PhoneHeader.jsx
//
// The phone's top bar: brand (home), the focus timer, connection status, and
// the account menu. The five destinations are in the bottom bar; there is no
// hamburger drawer any more — everything a learner needs is one tap away.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Pomodoro from '../components/Pomodoro';
import OfflineStatusBadge from '../components/OfflineStatusBadge';
import { Button, Logo, Modal, Wordmark } from '../components/ui';
import { Timer } from '../components/ui/icons';
import AccountMenu from './AccountMenu';

export default function PhoneHeader() {
  const [timerOpen, setTimerOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[50] h-[var(--phone-header-h,auto)] bg-surface/95 backdrop-blur-md reduce-transparency:bg-surface reduce-transparency:backdrop-blur-none border-b border-border2 shadow-sm flex items-center justify-between gap-2 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <Link to="/" className="inline-flex items-center gap-2 pointer-coarse:min-h-11">
        <Logo decorative size={28} />
        <Wordmark full={false} className="text-lg" />
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
