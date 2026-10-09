// src/features/analytics/sections/shared.jsx
//
// Building blocks for the Progress analytics sections: a titled card (h2 under
// the page's h1), the loading and retry states every deep-analytics fetch
// needs, a plain bar list and a stat tile.
import { Button, Card, CardBody, CardEyebrow, CardHeader, CardTitle, Skeleton } from '../../../components/ui';

export function SectionCard({ eyebrow, title, action, children, className }) {
  return (
    <Card elevated className={className}>
      <CardHeader>
        <div className="min-w-0">
          {eyebrow && <CardEyebrow>{eyebrow}</CardEyebrow>}
          <CardTitle className="mt-0.5">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

/** Renders children once loaded; a skeleton while loading; a retry on error. */
export function DeepStatus({ status, retry, children }) {
  if (status === 'loading') {
    return (
      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        <span className="sr-only">Loading…</span>
        <Skeleton className="h-5" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-3/5" />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted2">Couldn’t load this right now. Check your connection, then try again.</p>
        <Button size="sm" variant="secondary" onClick={retry}>Try again</Button>
      </div>
    );
  }
  return children;
}

export function StatTile({ label, value, sub, color = 'var(--text-main)' }) {
  return (
    <div className="p-4 bg-surface2/40 border border-border rounded-[var(--radius-default)]">
      <div className="text-eyebrow mb-1">{label}</div>
      <div className="text-2xl font-semibold tabular-nums" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-muted2 mt-0.5">{sub}</div>}
    </div>
  );
}

/**
 * Horizontal bars, at most `limit` rows (12 by default). `unit` is appended to
 * each value. Rows are shown in the order given.
 */
export function BarList({ items, valueKey, labelKey, maxVal, unit = '', color = 'var(--accent-velocity)', empty, limit = 12 }) {
  if (!items?.length) return <p className="text-sm text-muted2">{empty}</p>;
  const max = maxVal || Math.max(...items.map((i) => i[valueKey]));
  return (
    <ul className="flex flex-col gap-2">
      {items.slice(0, limit).map((item) => (
        <li key={item[labelKey]} className="flex items-center gap-3">
          <span className="w-24 sm:w-40 shrink-0 text-xs text-muted2 truncate text-right">{item[labelKey]}</span>
          <span className="flex-1 h-4 bg-surface3 rounded-full overflow-hidden" aria-hidden="true">
            <span
              className="block h-full rounded-full transition-all duration-500"
              style={{ width: `${max > 0 ? (item[valueKey] / max) * 100 : 0}%`, background: color }}
            />
          </span>
          <span className="w-14 shrink-0 text-xs font-medium text-textMain text-right tabular-nums">{item[valueKey]}{unit}</span>
        </li>
      ))}
    </ul>
  );
}
