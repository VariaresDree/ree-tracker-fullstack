import { useId, useState } from 'react';
import { Card } from './Card';
import { cn } from './cn';
import { ChevronDown } from './icons';

// A card that folds: a title row that opens and closes a body below it. One
// pattern for every "more options" on a page (Practice's custom session had
// its own hand-rolled header button). The whole title row is the control, a
// real <button> with aria-expanded and aria-controls, and the chevron turns
// rather than swapping icons. Uncontrolled unless `open` is given.
export function Disclosure({ title, description, open: openProp, defaultOpen = false, onToggle, children, className, bodyClassName, ...rest }) {
  const [own, setOwn] = useState(defaultOpen);
  const open = openProp ?? own;
  const bodyId = useId();
  const toggle = () => {
    if (openProp === undefined) setOwn(!open);
    onToggle?.(!open);
  };
  return (
    <Card elevated className={className} {...rest}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer rounded-[var(--radius-lg)] transition-colors hover:bg-surface2/60"
      >
        <span className="min-w-0 flex flex-col gap-0.5">
          <span className="text-textMain font-semibold">{title}</span>
          {description && <span className="text-xs text-muted2">{description}</span>}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          aria-hidden="true"
          className={cn('text-muted shrink-0 transition-[rotate] duration-200 motion-reduce:transition-none', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div id={bodyId} className={cn('px-5 pb-5 animate-in fade-in slide-in-from-top-2', bodyClassName)}>
          {children}
        </div>
      )}
    </Card>
  );
}

export default Disclosure;
