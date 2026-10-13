// src/features/notebook/CauseTrend.jsx
//
// Tagged causes per week for the last eight weeks, as plain stacked bars, and
// the headline change (causeTrend.js). Plain markup, not a chart library: the
// Notebook stays light, and a screen reader gets the same numbers as a table.
import { useMemo } from 'react';
import { MISTAKE_CAUSES, MISTAKE_CAUSE_LABELS } from '@ree/shared';
import { causeTrend } from './causeTrend';

const COLOR = {
  concept: 'var(--accent)',
  computation: 'var(--color-reeAmber)',
  misread: 'var(--accent-signal)',
  time: 'var(--accent-danger)',
};

const weekLabel = (start) => new Date(`${start}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

export default function CauseTrend({ items }) {
  const { weeks, headline } = useMemo(() => causeTrend(items), [items]);
  const peak = Math.max(1, ...weeks.map((w) => w.total));
  if (weeks.every((w) => w.total === 0)) return null;

  return (
    <section aria-labelledby="cause-trend-heading" className="flex flex-col gap-2">
      <h3 id="cause-trend-heading" className="text-eyebrow">Why you miss, by week</h3>
      {headline && <p className="text-sm text-textMain">{headline}</p>}
      <div aria-hidden="true" className="flex items-end gap-1.5 h-16">
        {weeks.map((w) => (
          <div key={w.start} className="flex-1 flex flex-col-reverse rounded-sm overflow-hidden bg-surface2" style={{ height: '100%' }}>
            {MISTAKE_CAUSES.map((c) => (w.byCause[c] > 0 ? (
              <div key={c} style={{ height: `${(w.byCause[c] / peak) * 100}%`, background: COLOR[c] }} />
            ) : null))}
          </div>
        ))}
      </div>
      <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted2">
        {MISTAKE_CAUSES.map((c) => (
          <li key={c} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR[c] }} />
            {MISTAKE_CAUSE_LABELS[c]}
          </li>
        ))}
      </ul>
      <table className="sr-only">
        <caption>Tagged misses per week, by cause</caption>
        <thead>
          <tr><th scope="col">Week of</th>{MISTAKE_CAUSES.map((c) => <th key={c} scope="col">{MISTAKE_CAUSE_LABELS[c]}</th>)}</tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.start}><th scope="row">{weekLabel(w.start)}</th>{MISTAKE_CAUSES.map((c) => <td key={c}>{w.byCause[c]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
