import { cn } from './cn';

// Zero-data moments are invitations to act, not blank space. Icon chip +
// plain-language title/description + optional CTA.
export function EmptyState({ icon: Icon, title, description, action, compact = false, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-3',
        compact ? 'py-8' : 'py-14',
        className
      )}
    >
      {Icon && (
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            color: 'var(--accent)',
          }}
        >
          <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      <div className="flex flex-col gap-1 max-w-sm">
        <p className="text-textMain font-semibold">{title}</p>
        {description && <p className="text-sm text-muted2">{description}</p>}
      </div>
      {action && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
