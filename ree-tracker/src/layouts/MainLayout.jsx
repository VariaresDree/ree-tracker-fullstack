// src/layouts/MainLayout.jsx
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Pomodoro from '../components/Pomodoro';
import OfflineStatusBadge from '../components/OfflineStatusBadge';
import { useAuth } from '../contexts/AuthContext';
import FocusTrap from '../components/FocusTrap';
import { useStore } from '../store/useStore';
import {
  LayoutDashboard, BrainCircuit, Zap, Swords, Library, FolderOpen, User,
  PanelLeftClose, PanelLeftOpen, Timer, Menu, X,
} from '../components/ui/icons';

// Grouped, sentence-case navigation with real icons.
const NAV_GROUPS = [
  {
    label: 'Menu',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard', desc: 'Predictive analytics & tracking' },
      { path: '/review', icon: BrainCircuit, label: 'Active Review', desc: 'SRS cards & interleaved sets' },
      { path: '/simulator', icon: Zap, label: 'Board Simulator', desc: 'PRC pressure simulation' },
      { path: '/arena', icon: Swords, label: 'Arena', desc: 'Global peer leaderboards' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { path: '/library', icon: Library, label: 'Module Library', desc: 'AI-parsed handouts & text' },
      { path: '/materials', icon: FolderOpen, label: 'Materials Hub', desc: 'Offline resources & references' },
    ],
  },
];

// Thumb-reach bar for mobile (five primary destinations).
const BOTTOM_NAV = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/review', icon: BrainCircuit, label: 'Review' },
  { path: '/simulator', icon: Zap, label: 'Sim' },
  { path: '/arena', icon: Swords, label: 'Arena' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const ACTIVE_LINK =
  'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-l-[var(--accent)] text-[var(--accent)]';
const IDLE_LINK = 'border-l-transparent text-textMain hover:bg-surface2';

export default function MainLayout({ children }) {
  const { isSidebarOpen, setSidebarOpen, isSidebarCollapsed, toggleSidebarCollapse, theme } = useStore();
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  // Enforce the global theming architecture on render/change.
  useEffect(() => {
    const activeTheme = theme || localStorage.getItem('ree-theme') || 'dark';
    if (activeTheme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', activeTheme);
    }
  }, [theme]);

  const handleNavClick = (e, path) => {
    if (path === '/simulator') {
      e.preventDefault();
      setShowSimulatorModal(true);
      setSidebarOpen(false);
    }
  };

  const confirmSimulator = () => {
    setShowSimulatorModal(false);
    navigate('/simulator');
  };

  const CollapseIcon = isSidebarCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row font-sans text-textMain relative">
      {/* MOBILE APP HEADER */}
      <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-border2 sticky top-0 z-[40] shadow-sm">
        <div className="text-xl font-bold tracking-tight text-[var(--accent)]">
          REE<span className="text-textMain">.ai</span> Core
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
          className="p-2 -mr-2 text-muted hover:text-textMain cursor-pointer"
        >
          <Menu className="w-6 h-6" strokeWidth={1.75} />
        </button>
      </div>

      {/* MOBILE DRAWER BACKDROP */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] md:hidden animate-in fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-[55] bg-surface border-r border-border2 flex flex-col shrink-0 shadow-2xl md:shadow-none transform transition-all duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}
      >
        {/* Mobile drawer top bar */}
        <div className="md:hidden flex p-4 border-b border-border2 justify-between items-center bg-surface2/30 shrink-0">
          <div className="text-xl font-bold tracking-tight text-[var(--accent)]">
            REE<span className="text-textMain">.ai</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
            className="text-muted hover:text-textMain p-1 cursor-pointer"
          >
            <X className="w-6 h-6" strokeWidth={1.75} />
          </button>
        </div>

        {/* Desktop collapse control */}
        <div className={`hidden md:flex p-5 border-b border-border2 items-center bg-surface2/30 shrink-0 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed && (
            <div className="text-2xl font-bold tracking-tight text-[var(--accent)] animate-in fade-in duration-200">
              REE<span className="text-textMain">.ai</span> Core
            </div>
          )}
          <button
            onClick={() => toggleSidebarCollapse()}
            className="p-1.5 bg-surface2 hover:bg-surface3 border border-border2 rounded-lg cursor-pointer text-muted hover:text-textMain transition-all"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <CollapseIcon size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Pomodoro (anchored top) */}
        <div className="p-4 border-b border-border2 bg-surface2/10 shrink-0 flex justify-center w-full">
          {isSidebarCollapsed ? (
            <button
              onClick={() => toggleSidebarCollapse()}
              className="w-10 h-10 bg-surface2 hover:bg-surface3 border border-border2 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-muted hover:text-textMain"
              aria-label="Expand Pomodoro timer"
              title="Expand Pomodoro timer"
            >
              <Timer size={18} strokeWidth={1.75} />
            </button>
          ) : (
            <Pomodoro />
          )}
        </div>

        {/* Connectivity + offline-readiness indicator (also keeps the offline
            question pack fresh via useOfflinePack on mount). */}
        <div className={`shrink-0 border-b border-border2 bg-surface2/10 ${isSidebarCollapsed ? 'py-3' : 'px-4 py-3'}`}>
          <OfflineStatusBadge collapsed={isSidebarCollapsed} />
        </div>

        {/* Navigation (grouped) */}
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 custom-scrollbar min-h-0">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              {!isSidebarCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    viewTransition
                    onClick={(e) => handleNavClick(e, item.path)}
                    title={isSidebarCollapsed ? item.label : ''}
                    className={({ isActive }) =>
                      `group flex items-center rounded-xl border-l-2 transition-colors cursor-pointer ${
                        isSidebarCollapsed ? 'p-3 justify-center' : 'p-3'
                      } ${isActive && item.path !== '/simulator' ? ACTIVE_LINK : IDLE_LINK}`
                    }
                  >
                    {({ isActive }) => {
                      const on = isActive && item.path !== '/simulator';
                      return (
                        <>
                          <Icon
                            size={20}
                            strokeWidth={1.75}
                            className={`shrink-0 ${on ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
                          />
                          {!isSidebarCollapsed && (
                            <div className="flex flex-col min-w-0 ml-3">
                              <span className="text-sm font-semibold tracking-tight truncate">{item.label}</span>
                              <span className={`text-[0.65rem] mt-0.5 truncate ${on ? 'text-[color-mix(in_srgb,var(--accent)_75%,var(--text-muted2))]' : 'text-muted2'}`}>
                                {item.desc}
                              </span>
                            </div>
                          )}
                        </>
                      );
                    }}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Profile (anchored bottom) */}
        <div className={`mt-auto p-4 border-t border-border2 bg-surface2/10 shrink-0 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
          <NavLink
            to="/profile"
            viewTransition
            className={({ isActive }) =>
              `flex items-center gap-3 p-2.5 rounded-xl transition-all border shadow-sm group cursor-pointer ${
                isSidebarCollapsed ? 'w-11 h-11 justify-center p-0 rounded-full' : 'w-full'
              } ${isActive
                ? 'bg-surface3 border-[color-mix(in_srgb,var(--accent)_45%,transparent)]'
                : 'bg-surface hover:bg-surface3 border-border2 hover:border-[color-mix(in_srgb,var(--accent)_45%,transparent)]'}`
            }
            title={isSidebarCollapsed ? 'Profile' : 'Profile & settings'}
          >
            <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-signal)] flex items-center justify-center text-white font-bold text-sm shadow-md">
              {currentUser?.displayName?.charAt(0).toUpperCase() || 'V'}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="text-sm font-semibold text-textMain truncate">{currentUser?.displayName || 'Operator'}</span>
                <span className="text-[0.6rem] text-muted font-mono uppercase tracking-widest mt-0.5">Profile & settings</span>
              </div>
            )}
          </NavLink>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main
        key={location.pathname}
        className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto relative page-fade-in animate-in fade-in slide-in-from-bottom-2 custom-scrollbar"
      >
        {children}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-[45] bg-surface/95 backdrop-blur-md border-t border-border2 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={(e) => handleNavClick(e, item.path)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2.5 text-[0.6rem] font-medium tracking-wide transition-colors ${
                  isActive && item.path !== '/simulator' ? 'text-[var(--accent)]' : 'text-muted hover:text-textMain'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.75} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Simulator warning modal */}
      {showSimulatorModal && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={showSimulatorModal}>
            <div className="bg-surface border border-border2 p-6 rounded-2xl shadow-2xl max-w-md w-full modal-entrance">
              <h3 className="text-lg font-semibold text-reeAmber mb-2 flex items-center gap-2">
                <Zap size={20} strokeWidth={2} /> Pressure chamber entry
              </h3>
              <p className="text-sm text-muted2 mb-6 leading-relaxed">
                The Board Simulator forces a restrictive, distraction-free environment mirroring actual PRC
                conditions. Timers are strict.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  data-close-modal
                  onClick={() => setShowSimulatorModal(false)}
                  className="px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSimulator}
                  className="px-4 py-2 bg-reeAmber hover:brightness-110 text-bg rounded-lg text-xs font-bold tracking-wide shadow-md transition-all cursor-pointer btn-press"
                >
                  Start simulation
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}
