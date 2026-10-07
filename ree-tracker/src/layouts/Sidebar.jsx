// src/layouts/Sidebar.jsx
//
// Desktop navigation: the five destinations (layouts/navModel.js), the Admin
// link for admins, the focus timer, connection status, and the Account card.
// Collapsible to an icon rail.
import { Link, useLocation } from 'react-router-dom';
import Pomodoro from '../components/Pomodoro';
import OfflineStatusBadge from '../components/OfflineStatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useUISlice } from '../store/slices';
import { cn } from '../components/ui';
import { PanelLeftClose, PanelLeftOpen, Timer } from '../components/ui/icons';
import { PRIMARY_NAV, ADMIN_NAV, activeNavId } from './navModel';

const ACTIVE = 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-l-[var(--accent)] text-[var(--accent-text)]';
const IDLE = 'border-l-transparent text-textMain hover:bg-surface2';

function NavItem({ item, active, collapsed }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn('group flex items-center rounded-xl border-l-2 p-3 transition-colors', collapsed && 'justify-center', active ? ACTIVE : IDLE)}
    >
      <Icon size={20} strokeWidth={1.75} aria-hidden="true" className={cn('shrink-0', active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100')} />
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span className="flex flex-col min-w-0 ml-3">
          <span className="text-sm font-semibold tracking-tight truncate">{item.label}</span>
          {item.desc && (
            <span className={cn('text-[11px] mt-0.5 truncate', active ? 'text-[color-mix(in_srgb,var(--accent-text)_75%,var(--text-muted2))]' : 'text-muted2')}>
              {item.desc}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const { isSidebarCollapsed: collapsed, toggleSidebarCollapse } = useUISlice();
  const { currentUser, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const active = activeNavId(pathname);
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const name = currentUser?.displayName || 'Reviewer';

  return (
    <aside className={cn('sticky top-0 h-screen shrink-0 bg-surface border-r border-border2 flex flex-col pl-[env(safe-area-inset-left)] transition-[width] duration-300', collapsed ? 'w-20' : 'w-72')}>
      <div className={cn('flex p-5 border-b border-border2 items-center bg-surface2/30 shrink-0', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <Link to="/" className="text-2xl font-bold tracking-tight text-[var(--accent)]">
            REE<span className="text-textMain">.ai</span> Core
          </Link>
        )}
        <button
          type="button"
          onClick={() => toggleSidebarCollapse()}
          className="p-1.5 bg-surface2 hover:bg-surface3 border border-border2 rounded-lg cursor-pointer text-muted hover:text-textMain transition-all touch-target inline-flex items-center justify-center"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <CollapseIcon size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <div className="p-4 border-b border-border2 bg-surface2/10 shrink-0 flex justify-center w-full">
        {collapsed ? (
          <button
            type="button"
            onClick={() => toggleSidebarCollapse()}
            className="w-10 h-10 bg-surface2 hover:bg-surface3 border border-border2 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-muted hover:text-textMain touch-target"
            aria-label="Show the focus timer"
            title="Show the focus timer"
          >
            <Timer size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : (
          <Pomodoro />
        )}
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 custom-scrollbar min-h-0">
        {PRIMARY_NAV.map((item) => (
          <NavItem key={item.id} item={item} active={active === item.id} collapsed={collapsed} />
        ))}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-border2" />
            <NavItem item={{ ...ADMIN_NAV, desc: 'Content tools' }} active={active === 'admin'} collapsed={collapsed} />
          </>
        )}
      </nav>

      {/* Connectivity + offline pack (also keeps the pack fresh on mount). */}
      <div className={cn('shrink-0 border-t border-border2 bg-surface2/10', collapsed ? 'py-3' : 'px-4 py-3')}>
        <OfflineStatusBadge collapsed={collapsed} />
      </div>

      <div className={cn('p-4 border-t border-border2 bg-surface2/10 shrink-0', collapsed && 'flex justify-center')}>
        <Link
          to="/account"
          aria-current={active === 'account' ? 'page' : undefined}
          title={collapsed ? 'Account' : undefined}
          className={cn(
            'flex items-center gap-3 p-2.5 rounded-xl transition-all border shadow-sm',
            collapsed ? 'w-11 h-11 justify-center p-0 rounded-full' : 'w-full',
            active === 'account'
              ? 'bg-surface3 border-[color-mix(in_srgb,var(--accent)_45%,transparent)]'
              : 'bg-surface hover:bg-surface3 border-border2 hover:border-[color-mix(in_srgb,var(--accent)_45%,transparent)]',
          )}
        >
          <span className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-signal)] flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">
            {name.charAt(0).toUpperCase()}
          </span>
          {collapsed ? (
            <span className="sr-only">Account</span>
          ) : (
            <span className="flex flex-col overflow-hidden min-w-0">
              <span className="text-sm font-semibold text-textMain truncate">{name}</span>
              <span className="text-[11px] text-muted2 mt-0.5">Account &amp; settings</span>
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}
