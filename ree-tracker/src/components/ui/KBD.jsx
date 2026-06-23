import { cn } from './cn';

export function KBD({ className, children }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded text-[10px] font-mono',
        'bg-surface3 text-muted2 border border-border-light',
        className
      )}
    >
      {children}
    </kbd>
  );
}
