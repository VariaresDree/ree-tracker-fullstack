import { cn } from './cn';

// Semantic status pill (pass/fail/risk/priority/etc). Maps a free-text status to
// a tone, then renders a dot + label tinted from the CSS accent vars. Use `tone`
// to force a color, or `status` to auto-map common verdict/priority words.
const TONE_VAR = {
  success: 'var(--accent-success)',
  danger: 'var(--accent-danger)',
  amber: 'var(--color-reeAmber)',
  signal: 'var(--accent-signal)',
  velocity: 'var(--accent-velocity)',
  neutral: null,
};

const STATUS_TONE = {
  pass: 'success', passed: 'success', optimal: 'success', 'optimal speed': 'success',
  low: 'success', mastery: 'success', ok: 'success', online: 'success',
  fail: 'danger', failed: 'danger', critical: 'danger', 'critical risk': 'danger',
  urgent: 'danger', high: 'danger', 'blind spot': 'danger', error: 'danger',
  conditional: 'amber', 'conditional pass': 'amber', borderline: 'amber',
  medium: 'amber', warning: 'amber', 'at risk': 'amber',
  pending: 'neutral', neutral: 'neutral', legacy: 'neutral',
  'in progress': 'signal', info: 'signal', active: 'signal',
};

export function StatusPill({ status, tone, children, dot = true, className }) {
  const resolved = tone || STATUS_TONE[String(status ?? '').toLowerCase()] || 'neutral';
  const accent = TONE_VAR[resolved];
  const label = children ?? status;
  const style = accent
    ? {
        color: accent,
        borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
        background: `color-mix(in srgb, ${accent} 12%, transparent)`,
      }
    : undefined;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border text-[11px] font-medium tracking-wide whitespace-nowrap',
        !accent && 'bg-surface2 text-muted2 border-border',
        className
      )}
      style={style}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent || 'var(--text-muted)' }} />
      )}
      {label}
    </span>
  );
}
