import { Card } from './Card';
import { Stat } from './Stat';
import { cn } from './cn';
import { TrendingUp, TrendingDown } from './icons';

// KPI stat tile — icon chip + animated hero number + label, with an optional
// delta pill. The single building block of the dashboard's top strip
// (Testora/Kravio pattern). Colors come from CSS accent vars via inline style so
// the tone stays dynamic without fighting Tailwind's JIT.
const TONE_VAR = {
  velocity: 'var(--accent-velocity)',
  signal: 'var(--accent-signal)',
  success: 'var(--accent-success)',
  danger: 'var(--accent-danger)',
  amber: 'var(--color-reeAmber)',
};

export function KpiTile({
  icon: Icon,
  label,
  value,
  suffix = '',
  precision = 0,
  delta,
  deltaSuffix = '',
  tone = 'velocity',
  hint,
  className,
}) {
  const accent = TONE_VAR[tone] || TONE_VAR.velocity;
  const hasDelta = delta !== undefined && delta !== null && !Number.isNaN(Number(delta));
  const up = Number(delta) >= 0;
  const deltaColor = up ? 'var(--accent-success)' : 'var(--accent-danger)';

  return (
    <Card elevated className={cn('p-4 sm:p-5 flex flex-col gap-3 hover-glow', className)}>
      <div className="flex items-center justify-between gap-2">
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-default)] shrink-0"
          style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
        >
          {Icon ? <Icon size={18} strokeWidth={1.75} aria-hidden="true" /> : null}
        </span>
        {hasDelta && (
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 h-6 text-[11px] font-medium tabular-nums"
            style={{
              color: deltaColor,
              borderColor: `color-mix(in srgb, ${deltaColor} 35%, transparent)`,
              background: `color-mix(in srgb, ${deltaColor} 12%, transparent)`,
            }}
          >
            {up ? <TrendingUp size={12} strokeWidth={2} /> : <TrendingDown size={12} strokeWidth={2} />}
            {up ? '+' : ''}
            {delta}
            {deltaSuffix}
          </span>
        )}
      </div>

      <Stat value={value} suffix={suffix} precision={precision} className="[&>span]:text-3xl sm:[&>span]:text-4xl" />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted truncate">{label}</span>
        {hint && <span className="text-[11px] text-muted2 tabular-nums shrink-0">{hint}</span>}
      </div>
    </Card>
  );
}
