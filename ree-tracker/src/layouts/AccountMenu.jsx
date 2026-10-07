// src/layouts/AccountMenu.jsx
//
// The avatar button in the phone header: Account, Admin (admins only), Log out.
// A disclosure (button + panel of links), not an ARIA menu — the items are
// plain links and a button, reached with Tab. Opening moves focus to the first
// item; Escape or a tap outside closes it and returns focus to the avatar.
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LogoutConfirm from '../components/LogoutConfirm';
import { User, ShieldCheck, LogOut } from '../components/ui/icons';

const ITEM = 'touch-target flex items-center gap-3 w-full px-3 py-2.5 rounded-[var(--radius-default)] text-sm text-textMain hover:bg-surface2 text-left cursor-pointer';

export default function AccountMenu() {
  const { currentUser, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();

  const name = currentUser?.displayName || 'Reviewer';
  const initial = (currentUser?.displayName || currentUser?.email || 'R').charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.querySelector('a, button')?.focus();
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointerDown = (e) => {
      if (panelRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="touch-target inline-flex items-center justify-center rounded-full cursor-pointer"
      >
        <span className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-signal)] flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">
          {initial}
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="absolute right-0 top-full mt-2 w-64 z-[60] bg-surface border border-border2 rounded-[var(--radius-lg)] shadow-xl p-2"
        >
          <div className="px-3 py-2 border-b border-border2 mb-1 min-w-0">
            <p className="text-sm font-semibold text-textMain truncate">{name}</p>
            {currentUser?.email && <p className="text-xs text-muted2 truncate">{currentUser.email}</p>}
          </div>
          <Link to="/account" className={ITEM} onClick={close}>
            <User size={18} strokeWidth={1.75} aria-hidden="true" /> Account
          </Link>
          {isAdmin && (
            <Link to="/admin" className={ITEM} onClick={close}>
              <ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" /> Admin
            </Link>
          )}
          <button type="button" className={ITEM} onClick={() => { close(); setConfirming(true); }}>
            <LogOut size={18} strokeWidth={1.75} aria-hidden="true" /> Log out
          </button>
        </div>
      )}

      <LogoutConfirm open={confirming} onClose={() => setConfirming(false)} />
    </div>
  );
}
