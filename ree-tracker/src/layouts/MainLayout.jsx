// src/layouts/MainLayout.jsx
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Pomodoro from '../components/Pomodoro';
import { useAuth } from '../contexts/AuthContext';
import FocusTrap from '../components/FocusTrap';
import { useStore } from '../store/useStore'; 

export default function MainLayout({ children }) {
  const { isSidebarOpen, setSidebarOpen, isSidebarCollapsed, toggleSidebarCollapse, theme } = useStore();
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const navItems = [
    { path: '/', icon: '📊', label: 'Dashboard', desc: 'Predictive analytics & tracking' },
    { path: '/review', icon: '🧠', label: 'Active Review', desc: 'SRS cards & interleaved sets' },
    { path: '/simulator', icon: '⚡', label: 'Board Simulator', desc: 'PRC pressure simulation' },
    { path: '/arena', icon: '⚔️', label: 'The Arena', desc: 'Global peer leaderboards' },
    { path: '/library', icon: '📚', label: 'Module Library', desc: 'AI parse handouts & text' },
    { path: '/materials', icon: '📂', label: 'Materials Hub', desc: 'Offline resources & references' }
  ];

  useEffect(() => { 
      setSidebarOpen(false); 
  }, [location.pathname, setSidebarOpen]);

  // ENFORCE GLOBAL THEMING ARCHITECTURE ON RENDER/CHANGE
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

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row font-sans text-textMain relative">
      
      {/* MOBILE APPLICATION HEADER */}
      <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-border2 sticky top-0 z-[40] shadow-sm">
        <div className="text-xl font-black text-reeBlue tracking-tight">REE<span className="text-textMain">.ai</span> Core</div>
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
          className="p-2 -mr-2 text-muted hover:text-textMain cursor-pointer"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
      </div>

      {/* MOBILE DRAWER OVERLAY BACKDROP */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] md:hidden animate-in fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER WORKSPACE */}
      <aside
        className={`fixed inset-y-0 left-0 z-[55] bg-surface border-r border-border2 flex flex-col shrink-0 shadow-2xl md:shadow-none transform transition-all duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}
      >
        {/* Mobile Drawer Top Bar */}
        <div className="md:hidden flex p-4 border-b border-border2 justify-between items-center bg-surface2/30 shrink-0">
          <div className="text-xl font-black text-reeBlue tracking-tight">REE<span className="text-textMain">.ai</span></div>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
            className="text-muted hover:text-textMain p-1 cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Desktop Collapsible Header Control */}
        <div className={`hidden md:flex p-5 border-b border-border2 justify-between items-center bg-surface2/30 shrink-0 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          {!isSidebarCollapsed && (
            <div className="text-2xl font-black text-reeBlue tracking-tight animate-in fade-in duration-200">
              REE<span className="text-textMain">.ai</span> Core
            </div>
          )}
          <button 
            onClick={() => toggleSidebarCollapse()} 
            className="p-1.5 bg-surface2 hover:bg-surface3 border border-border2 rounded-lg text-xs cursor-pointer text-muted hover:text-textMain transition-all"
            title={isSidebarCollapsed ? "Expand Sidebar Matrix" : "Collapse Sidebar Matrix"}
          >
            {isSidebarCollapsed ? '➡️' : '⬅️'}
          </button>
        </div>

        {/* 1. POMODORO TIMER (Anchored Top) */}
        <div className="p-4 border-b border-border2 bg-surface2/10 shrink-0 flex justify-center w-full">
           {isSidebarCollapsed ? (
                <button 
                  onClick={() => toggleSidebarCollapse()} 
                  className="w-10 h-10 bg-surface2 hover:bg-surface3 text-lg border border-border2 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                  title="Expand Pomodoro Console"
                >
                  ⏱️
                </button>
              ) : (
                <Pomodoro />
           )}
        </div>

        {/* 2. NAVIGATION MATRIX FLUID LOOP (Anchored Middle) */}
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 no-scrollbar min-h-0">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={(e) => handleNavClick(e, item.path)}
              title={isSidebarCollapsed ? item.label : ""}
              className={({ isActive }) =>
                `flex items-start rounded-xl transition-all border border-transparent cursor-pointer hover:translate-x-0.5 transition-transform ${
                  isSidebarCollapsed ? 'p-3 justify-center' : 'p-3'
                } ${
                  isActive && item.path !== '/simulator'
                    ? 'bg-reeBlue/10 border-reeBlue/30 border-l-2 border-l-reeBlue shadow-[0_0_15px_rgba(59,130,246,0.05)]'
                    : 'hover:bg-surface2'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`text-xl transition-opacity shrink-0 ${isActive && item.path !== '/simulator' ? 'opacity-100' : 'opacity-60'}`}>
                    {item.icon}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex flex-col min-w-0 animate-in fade-in duration-200 ml-3">
                      <span className={`text-sm font-bold tracking-wide transition-colors truncate ${isActive && item.path !== '/simulator' ? 'text-reeBlue' : 'text-textMain'}`}>
                        {item.label}
                      </span>
                      <span className={`text-[0.65rem] mt-0.5 transition-colors truncate ${isActive && item.path !== '/simulator' ? 'text-reeBlue/70' : 'text-muted2'}`}>
                        {item.desc}
                      </span>
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* 3. PROFILE SETTING (Anchored to Absolute Bottom via mt-auto) */}
        <div className={`mt-auto p-4 border-t border-border2 bg-surface2/10 shrink-0 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
          <NavLink 
            to="/profile" 
            className={`flex items-center gap-3 p-2.5 bg-surface hover:bg-surface3 rounded-xl transition-all border border-border2 hover:border-reeBlue/50 shadow-sm group cursor-pointer ${isSidebarCollapsed ? 'w-11 h-11 justify-center p-0 rounded-full' : 'w-full'}`}
            title={isSidebarCollapsed ? "View Identity Matrix" : "Operator Terminal"}
          >
            <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-reeBlue to-reePurple flex items-center justify-center text-white font-black text-sm shadow-md group-hover:shadow-reeBlue/20 transition-all">
              {currentUser?.displayName?.charAt(0).toUpperCase() || 'V'}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col overflow-hidden min-w-0 animate-in fade-in duration-200">
                <span className="text-sm font-bold text-textMain truncate">{currentUser?.displayName || 'Operator'}</span>
                <span className="text-[0.6rem] text-muted font-mono uppercase tracking-widest mt-0.5">Configure Terminal</span>
              </div>
            )}
          </NavLink>
        </div>

      </aside>

      {/* DYNAMIC VIEWPORT FRAMESPACE */}
      <main key={location.pathname} className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 overflow-y-auto relative page-fade-in animate-in fade-in slide-in-from-bottom-2 custom-scrollbar">
        {children}
      </main>

      {/* Simulator Warning Modal Context Block */}
      {showSimulatorModal && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={showSimulatorModal}>
            <div className="bg-surface border border-border2 p-6 rounded-2xl shadow-2xl max-w-md w-full modal-entrance">
              <h3 className="text-lg font-black text-reeAmber mb-2 flex items-center gap-2">
                <span className="text-2xl">⚡</span> Pressure Chamber Entry
              </h3>
              <p className="text-sm text-muted2 mb-6 leading-relaxed">
                The Board Simulator forces a highly restrictive, distraction‑free environment mirroring actual PRC conditions. Timers are strict.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  data-close-modal
                  onClick={() => setShowSimulatorModal(false)}
                  className="px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Abort
                </button>
                <button
                  onClick={confirmSimulator}
                  className="px-4 py-2 bg-reeAmber hover:bg-yellow-600 text-bg rounded-lg text-xs font-black uppercase tracking-wider shadow-md transition-colors cursor-pointer btn-press"
                >
                  Initialize Chamber
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}