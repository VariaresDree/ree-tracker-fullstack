// src/components/ConfidenceMatrix.jsx
import React from 'react';
import { Panel } from './ui';
import { Crosshair, CircleAlert } from './ui/icons';

const CELLS = [
  { key: 'hc', label: 'Mastery', sub: 'High confidence · correct', color: 'var(--accent-success)' },
  { key: 'hw', label: 'Blind spot', sub: 'High confidence · wrong', color: 'var(--accent-danger)' },
  { key: 'lc', label: 'Imposter', sub: 'Low confidence · correct', color: 'var(--color-reeAmber)' },
  { key: 'lw', label: 'Deficient', sub: 'Low confidence · wrong', color: 'var(--text-muted2)' },
];

function ConfidenceMatrix({ stats }) {
  const mc = stats?.matrix || { hc: 0, hw: 0, lc: 0, lw: 0 };

  return (
    <Panel icon={Crosshair} eyebrow="Calibration" title="Confidence vs accuracy" className="h-full" bodyClassName="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {CELLS.map((c) => (
          <div
            key={c.key}
            className="group relative p-4 sm:p-5 rounded-2xl border border-border bg-surface2/20 overflow-hidden transition-all duration-300 hover:bg-surface2/40"
            style={{ borderColor: `color-mix(in srgb, ${c.color} 22%, var(--border-main))` }}
          >
            <div
              className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl transition-opacity duration-500 opacity-70 group-hover:opacity-100"
              style={{ background: `color-mix(in srgb, ${c.color} 14%, transparent)` }}
            />
            <div className="relative z-10 flex justify-between items-center">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: c.color }}>
                  {c.label}
                </span>
                <span className="text-[0.6rem] text-muted mt-0.5 truncate">{c.sub}</span>
              </div>
              <div
                className="text-4xl sm:text-5xl text-display tabular-nums shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5"
                style={{ color: c.color }}
              >
                {mc[c.key]}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface2/30 p-4 rounded-xl border border-border flex items-start gap-2.5">
        <CircleAlert size={16} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: 'var(--accent-danger)' }} />
        <p className="text-[0.7rem] text-muted2 leading-relaxed">
          <strong className="text-textMain font-semibold">Blind spots</strong> (high confidence, wrong) hurt your
          predicted score the most — target them first in Active Review.
        </p>
      </div>
    </Panel>
  );
}

export default React.memo(ConfidenceMatrix);
