import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import FocusTrap from '../FocusTrap';
import { Card, CardFooter } from './Card';
import { Button } from './Button';
import { X } from './icons';
import { cn } from './cn';

// The one dialog contract. Owns everything modals kept getting wrong
// individually: Escape-to-close (FocusTrap alone never closed anything),
// backdrop click, body scroll lock, max-height with a scrollable body
// (small screens could not reach the footer before), and dialog ARIA.
// Rendered through a portal so it never fights page stacking contexts.

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const TONE_VAR = {
  default: 'var(--accent-velocity)',
  danger: 'var(--accent-danger)',
  amber: 'var(--color-reeAmber)',
};

export function Modal({
  open,
  onClose,
  title,
  icon: Icon,
  eyebrow,
  tone = 'default',
  size = 'md',
  closeOnBackdrop = true,
  footer,
  children,
  className,
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const accent = TONE_VAR[tone] || TONE_VAR.default;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm animate-in fade-in"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div className={cn('w-full', SIZES[size])} onClick={(e) => e.stopPropagation()}>
        <FocusTrap active>
          <Card
            elevated
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={cn('modal-entrance w-full max-h-[90dvh] flex flex-col', className)}
            style={{ '--modal-accent': accent }}
          >
            <div className="px-5 pt-5 pb-3 flex items-start gap-3 shrink-0">
              {Icon && (
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-default)] shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--modal-accent) 14%, transparent)',
                    color: 'var(--modal-accent)',
                  }}
                >
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
              )}
              <div className="flex-1 min-w-0">
                {eyebrow && <p className="text-eyebrow mb-0.5">{eyebrow}</p>}
                {title && (
                  <h2 id={titleId} className="text-textMain font-semibold tracking-tight text-lg">
                    {title}
                  </h2>
                )}
              </div>
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
                  <X size={18} strokeWidth={1.75} aria-hidden="true" />
                </Button>
              )}
            </div>

            <div className="px-5 pb-5 overflow-y-auto min-h-0 flex-1">{children}</div>

            {footer && <CardFooter className="shrink-0">{footer}</CardFooter>}
          </Card>
        </FocusTrap>
      </div>
    </div>,
    document.body
  );
}
