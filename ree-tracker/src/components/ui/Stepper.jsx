import { Button } from './Button';
import { Input } from './FormField';
import { Minus, Plus } from './icons';
import { cn } from './cn';

// A whole number with minus and plus either side of it, 44px on touch, and the
// number can be typed. `label` names what it counts, for screen readers.
export function Stepper({ value, onChange, label, min = 0, max = 999, disabled = false, className }) {
  const set = (n) => onChange(Math.min(max, Math.max(min, n)));
  return (
    <div role="group" aria-label={label} className={cn('inline-flex items-center gap-1', className)}>
      <Button variant="secondary" size="icon" aria-label={`Fewer: ${label}`} disabled={disabled || value <= min} onClick={() => set(value - 1)}>
        <Minus size={16} strokeWidth={2} aria-hidden="true" />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => set(Number.parseInt(e.target.value, 10) || min)}
        className="w-16 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button variant="secondary" size="icon" aria-label={`More: ${label}`} disabled={disabled || value >= max} onClick={() => set(value + 1)}>
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
      </Button>
    </div>
  );
}

export default Stepper;
