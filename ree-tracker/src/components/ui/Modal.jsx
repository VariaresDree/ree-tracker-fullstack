import { useEffect, useId, useRef } from 'react';
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
//
// Body scroll lock is a MODULE-LEVEL open-modal counter, not a per-instance
// save/restore. Two things broke the old per-instance version:
//   1. Every call site passes an inline `onClose` arrow, which used to sit in
//      this effect's deps — so a parent re-render (e.g. Accept All's
//      isBulkApproving/setQuarantineItems churn) tore the effect down and
//      re-ran it on every render, not just open/close.
//   2. Save/restore of a single global value isn't composable across NESTED
//      modals (the review queue modal open behind the bulk-approve confirm
//      modal): a re-render during that nesting runs
//      destroy(inner) -> destroy(outer) -> setup(outer) -> setup(inner), and
//      destroy(inner) already left 'hidden' on the body, so setup(outer)
//      captures 'hidden' as "the value to restore" instead of the page's
//      real pre-modal overflow. Closing the outer modal then "restores"
//      hidden — the page can never scroll again.
// A counter sidesteps both: the lock engages on the 0->1 transition and the
// ORIGINAL pre-lock value (captured once, at that transition) is restored on
// the 1->0 transition, regardless of how many modals stack or in what order
// they close.
let openModalCount = 0;
let preLockOverflow = '';

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
  // onClose lives in a ref, not the effect's deps — the effect below must NOT
  // re-run just because a parent re-render handed us a new inline arrow.
  // Assigning ref.current belongs in an effect, not during render (React
  // flags render-time ref writes) — this dedicated effect has no deps, so it
  // commits the latest onClose after every render without gating the lock
  // effect below on it.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);

    if (openModalCount === 0) preLockOverflow = document.body.style.overflow;
    openModalCount += 1;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) document.body.style.overflow = preLockOverflow;
    };
  }, [open]);

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
