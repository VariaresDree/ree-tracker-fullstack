// src/features/analytics/sections/shared.jsx
//
// Building blocks for the Progress analytics sections: a titled card (h2 under
// the page's h1), the loading and retry states every deep-analytics fetch
// needs and a plain bar list. (Figure tiles are KpiTile compact.)
import { Link } from 'react-router-dom';
import { Button, Panel, Skeleton } from '../../../components/ui';
import { ArrowRight } from '../../../components/ui/icons';

/**
 * The way on from an analysis: starts a Practice preset (2026-11-14: accuracy
 * by subject, time per topic and calibration each showed a finding with
 * nothing to press). The same text link as the forecast's "Practise EE".
 */
export function PractiseLink({ preset, children }) {
  return (
    <Link
      to="/practice"
      state={{ preset }}
      className="self-start inline-flex items-center gap-1 pointer-coarse:min-h-11 text-sm font-medium text-[var(--accent-text)] hover:underline underline-offset-2"
    >
      {children} <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
    </Link>
  );
}

// The dashboard panel (Panel: an elevated Card, its header and body), kept
// under this name so the sections don't change.
export function SectionCard({ eyebrow, title, action, children, className }) {
  return (
    <Panel eyebrow={eyebrow} title={title} action={action} className={className}>
      {children}
    </Panel>
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
              className="block h-full rounded-full transition-[width] duration-500"
              style={{ width: `${max > 0 ? (item[valueKey] / max) * 100 : 0}%`, background: color }}
            />
          </span>
          <span className="w-14 shrink-0 text-xs font-medium text-textMain text-right tabular-nums">{item[valueKey]}{unit}</span>
        </li>
      ))}
    </ul>
  );
}
