import { cn } from './cn';

// Consistent page header used across the app shell: sentence-case display title,
// optional subtitle, right-aligned meta chips (exam countdown, sync status) and
// action buttons. Replaces the ad-hoc per-page header blocks.
//
// Side by side only when the header itself has the room (42rem, a container
// query), and then the title keeps at least 16rem while the chips wrap. It
// went side by side at the window's md: with the chips unable to shrink, so on
// a tablet beside the sidebar Today's three chips took the row and left "Welcome
// back, …" a 22px column, a word or two per line (found live, 2026-10-28).
export function PageHeader({ title, subtitle, meta, actions, className }) {
  return (
    <div className={cn('@container border-b border-border pb-5', className)}>
      <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-end @2xl:justify-between">
        <div className="min-w-0 @2xl:flex-1 @2xl:min-w-[16rem]">
          <h1 className="text-h1 text-textMain">{title}</h1>
          {subtitle && <p className="text-sm text-muted2 mt-1.5 text-pretty">{subtitle}</p>}
        </div>
        {(meta || actions) && (
          <div className="flex flex-wrap items-center gap-2.5 min-w-0 @2xl:justify-end">
            {meta}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
