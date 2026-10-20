// src/layouts/PhoneHeader.jsx
//
// The phone's top bar: brand (home), the focus timer's launcher, connection status, and
// the account menu. The five destinations are in the bottom bar; there is no
// hamburger drawer any more — everything a learner needs is one tap away.
import { Link } from 'react-router-dom';
import FocusLauncher from '../components/focus/FocusLauncher';
import OfflineStatusBadge from '../components/OfflineStatusBadge';
import { Logo, Wordmark } from '../components/ui';
import AccountMenu from './AccountMenu';

export default function PhoneHeader() {
  return (
    <header className="sticky top-0 z-[50] h-[var(--phone-header-h,auto)] bg-surface/95 backdrop-blur-md reduce-transparency:bg-surface reduce-transparency:backdrop-blur-none border-b border-border2 shadow-sm flex items-center justify-between gap-2 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <Link to="/" className="inline-flex items-center gap-2 pointer-coarse:min-h-11">
        <Logo decorative size={28} />
        <Wordmark full={false} className="text-lg" />
      </Link>

      <div className="flex items-center gap-1">
        {/* Opens the full-screen timer (/focus), with a dot while a block runs. */}
        <FocusLauncher variant="header" />
        <Link to="/account#offline" aria-label="Connection and offline pack" className="touch-target inline-flex items-center justify-center">
          <OfflineStatusBadge collapsed />
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
}
