// src/layouts/MainLayout.jsx
//
// The app shell: a sidebar on desktop; on a phone, a top bar (timer, status,
// account menu) and a five-item bottom bar. Both read layouts/navModel.js.
// Each piece is rendered only at its own breakpoint (not hidden with CSS), so
// OfflineStatusBadge — and the offline-pack refresh it triggers — mounts once.
//
// Pages that switch between this and ExamLayout (Simulator, Gauntlet,
// placement test) render it themselves; the rest get it from App's AppShell.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import FloatingPomodoro from '../components/FloatingPomodoro';
import { useUISlice } from '../store/slices';
import useMediaQuery from '../hooks/useMediaQuery';
import Sidebar from './Sidebar';
import PhoneHeader from './PhoneHeader';
import BottomBar from './BottomBar';

export default function MainLayout({ children }) {
  const { theme } = useUISlice();
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Enforce the global theming architecture on render/change.
  useEffect(() => {
    const activeTheme = theme || localStorage.getItem('ree-theme') || 'dark';
    if (activeTheme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', activeTheme);
    }
  }, [theme]);

  // A new page starts at its top — or at the section a link points to
  // (/account#offline). The router keeps the old scroll position otherwise.
  useEffect(() => {
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (target) target.scrollIntoView?.({ block: 'start' });
    else window.scrollTo?.(0, 0);
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row font-sans text-textMain relative">
      {/* First stop for a keyboard user: past the navigation, straight to the page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-[var(--radius-default)] focus:bg-surface focus:text-textMain focus:border focus:border-[var(--accent)]"
      >
        Skip to main content
      </a>

      {isDesktop ? <Sidebar /> : <PhoneHeader />}

      {/* overflow-x-clip, not overflow-y-auto: <main> has no fixed height so it
          never scrolled itself (the window does), but overflow-y-auto still
          made it the scroll container of every `sticky` child, so none of
          them stuck. clip keeps sideways overflow contained without creating
          a scroll container. */}
      <main
        key={location.pathname}
        id="main-content"
        tabIndex={-1}
        className="flex-1 w-full min-w-0 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-x-clip relative page-fade-in outline-none"
      >
        {children}
      </main>

      {/* Floating Pomodoro pill — always mounted (owns the completion tick),
          renders only while running or pinned. Absent from ExamLayout routes
          by construction, keeping the exam screens distraction-free. */}
      <FloatingPomodoro />

      {!isDesktop && <BottomBar />}
    </div>
  );
}
