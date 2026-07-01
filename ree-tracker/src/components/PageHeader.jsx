import { cn } from './ui/cn';

// Consistent page header used across the app shell: sentence-case display title,
// optional subtitle, right-aligned meta chips (exam countdown, sync status) and
// action buttons. Replaces the ad-hoc per-page header blocks.
export function PageHeader({ title, subtitle, meta, actions, className }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-border pb-5',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-display text-textMain text-2xl sm:text-3xl leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted2 mt-1.5">{subtitle}</p>}
      </div>
      {(meta || actions) && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {meta}
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
