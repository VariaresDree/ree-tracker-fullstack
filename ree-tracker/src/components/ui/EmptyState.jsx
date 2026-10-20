import { cn } from './cn';
import { IconChip } from './IconChip';

// Zero-data moments are invitations to act, not blank space. Icon chip +
// plain-language title/description + optional CTA.
//
// `titleAs` makes the title a heading when the empty state IS the page (a
// refused battle, an offline screen) — 'h1' there, so the screen still has
// one. Inside a section it stays a paragraph.
export function EmptyState({ icon: Icon, title, description, action, compact = false, className, titleAs: Title = 'p' }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-3',
        compact ? 'py-8' : 'py-14',
        className
      )}
    >
      {Icon && <IconChip icon={Icon} size="lg" round />}
      <div className="flex flex-col gap-1 max-w-sm">
        <Title className="text-textMain font-semibold text-base">{title}</Title>
        {description && <p className="text-sm text-muted2">{description}</p>}
      </div>
      {action && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
