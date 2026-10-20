import { cn } from './cn';

// The title of a section on the page, under the page's h1: a tab's own
// heading (Notebook, Bookmarks, AI models), its description, and its actions
// on the right. The h2 is .text-h2, one size for every section title; they
// were set by hand at three sizes.
export function SectionHeader({ title, description, actions, id, divider = false, className }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        divider && 'border-b border-border pb-5',
        className
      )}
    >
      <div className="min-w-0">
        <h2 id={id} className="text-h2 text-textMain">{title}</h2>
        {description && <p className="text-sm text-muted2 mt-1 max-w-prose text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

export default SectionHeader;
