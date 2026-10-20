import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import FocusTrap from '../FocusTrap';
import { Card, CardFooter } from './Card';
import { Button } from './Button';
import { IconChip } from './IconChip';
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
//
// `keyboardSafe`, for a dialog you type into on a phone (the note editor):
// the on-screen keyboard covers the lower part of the screen without
// shrinking the page, so a dialog centred in it had its footer, Save
// included, under the keyboard. This one sits at the top of the screen below
// `sm`, is at most 85dvh tall, and scrolls its body with the footer stuck to
// the bottom of what's visible.
let openModalCount = 0;
let preLockOverflow = '';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const TONE_VAR = {
  // The header icon is drawn in this colour: the text forms.
  default: 'var(--accent-text)',
  danger: 'var(--accent-danger)',
  amber: 'var(--color-reeAmber-text)',
};
// The header icon's chip (IconChip's tones), one per dialog tone.
const TONE_CHIP = { default: 'accent', danger: 'danger', amber: 'amber' };

export function Modal({
  open,
  onClose,
  title,
  icon: Icon,
  eyebrow,
  tone = 'default',
  size = 'md',
  closeOnBackdrop = true,
  keyboardSafe = false,
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
      className={cn(
        'fixed inset-0 z-[100] flex justify-center p-4 bg-bg/80 backdrop-blur-sm animate-in fade-in',
        keyboardSafe ? 'items-start pt-[max(1rem,env(safe-area-inset-top))] sm:items-center' : 'items-center'
      )}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div className={cn('w-full', SIZES[size])} onClick={(e) => e.stopPropagation()}>
        <FocusTrap active>
          <Card
            elevated
            glass={false}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={cn('modal-entrance w-full flex flex-col', keyboardSafe ? 'max-h-[85dvh]' : 'max-h-[90dvh]', className)}
            style={{ '--modal-accent': accent }}
          >
            <div className="px-5 pt-5 pb-3 flex items-start gap-3 shrink-0">
              {Icon && <IconChip icon={Icon} size="sm" tone={TONE_CHIP[tone] || TONE_CHIP.default} />}
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

            {keyboardSafe ? (
              <div className="overflow-y-auto min-h-0 flex-1 flex flex-col">
                <div className="px-5 pb-5">{children}</div>
                {footer && <CardFooter className="sticky bottom-0 mt-auto bg-surface">{footer}</CardFooter>}
              </div>
            ) : (
              <>
                <div className="px-5 pb-5 overflow-y-auto min-h-0 flex-1">{children}</div>
                {footer && <CardFooter className="shrink-0">{footer}</CardFooter>}
              </>
            )}
          </Card>
        </FocusTrap>
      </div>
    </div>,
    document.body
  );
}
