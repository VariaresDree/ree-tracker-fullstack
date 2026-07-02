import { forwardRef, useId, cloneElement, isValidElement } from 'react';
import { ChevronDown } from './icons';
import { cn } from './cn';

// Label-associated form control wrapper. Every input/select/textarea in the
// app renders inside one of these so it gets a real <label htmlFor>, and
// hint/error copy wired up via aria-describedby. Pass a single element child
// (id is injected) or a render function receiving the a11y props.

export function FormField({ label, hint, error, required, id: idProp, className, children }) {
  const autoId = useId();
  const id = idProp || autoId;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const a11yProps = {
    id,
    'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
    'aria-invalid': error ? true : undefined,
  };

  const control =
    typeof children === 'function'
      ? children(a11yProps)
      : isValidElement(children)
        ? cloneElement(children, a11yProps)
        : children;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-eyebrow">
        {label}
        {required && (
          <span className="ml-1 text-[var(--accent-danger)]" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted2">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-[var(--accent-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

const fieldBase =
  'w-full bg-bg border border-border text-textMain text-sm ' +
  'rounded-[var(--radius-default)] px-3.5 py-2.5 outline-none ' +
  'focus:border-[var(--accent)] transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted';

export const Input = forwardRef(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(fieldBase, className)} {...rest} />;
});

export const Select = forwardRef(function Select({ className, wrapperClassName, children, ...rest }, ref) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        ref={ref}
        className={cn(fieldBase, 'appearance-none pr-9 cursor-pointer', className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      />
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, 'min-h-24 resize-y', className)} {...rest} />;
});
