// src/layouts/BottomBar.jsx
//
// The phone's primary navigation: the five destinations within thumb reach.
// The active item comes from activeNavId(), not each link's own match, so the
// exam runners (/simulator, /gauntlet/:n, /battle/:id) light Exams.
import { Link, useLocation } from 'react-router-dom';
import { PRIMARY_NAV, activeNavId } from './navModel';

export default function BottomBar() {
  const { pathname } = useLocation();
  const active = activeNavId(pathname);

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-[45] bg-surface/95 backdrop-blur-md border-t border-border2 grid grid-cols-5 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    >
      {PRIMARY_NAV.map((item) => {
        const Icon = item.icon;
        const on = active === item.id;
        return (
          <Link
            key={item.id}
            to={item.to}
            aria-current={on ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 min-h-14 py-2 text-[11px] font-medium tracking-wide transition-colors ${on ? 'text-[var(--accent-text)]' : 'text-muted hover:text-textMain'}`}
          >
            <Icon size={20} strokeWidth={on ? 2.25 : 1.75} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
