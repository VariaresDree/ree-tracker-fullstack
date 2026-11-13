// src/components/ThetaVelocityChart.jsx
import { abilityPercent } from '../utils/ability';
import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { computeThetaDomain } from '../utils/thetaDomain';
import { bucketThetaHistory } from './thetaHistory';

// The readiness marker on the 3PL scale (θ≈1.0, ~84th percentile, above the
// θ=0 pass cutoff); the forecast card is the authoritative pass probability.
const READY_THETA = 1.0;

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface/90 backdrop-blur-md border border-border2/80 p-3.5 rounded-[var(--radius-default)] shadow-xl z-50 tabular-nums">
        <p className="text-micro uppercase tracking-widest font-black text-textMain mb-2 border-b border-border2/50 pb-2">
          {data.date} <span className="text-muted font-medium ml-2">({data.name})</span>
        </p>
        <div className="flex flex-col gap-1">
            <p className="text-sm font-black text-reeCyan-text drop-shadow-sm">
              Ability {abilityPercent(data.theta)}%
            </p>
            {/* Ability, never a pass chance. This used to print the same (θ + 4) / 8 as "Pass
                Probability", a third θ→% mapping on the same page that
                disagreed with the forecast card next to it. The pass
                probability now lives in one place: the PRC-rule forecast. */}
            <p className="text-micro font-medium text-muted2">
              {data.theta >= 0 ? 'Above' : 'Below'} the average candidate (50%)
            </p>
        </div>
      </div>
    );
  }
  return null;
};

// One empty list for every render: a fresh `[]` each time changed the chart's
// memo key, so it rebuilt the series on every render.
const NO_HISTORY = [];

export default function ThetaVelocityChart({ history = NO_HISTORY, range = 'day' }) {
  const safeHistory = Array.isArray(history) ? history : NO_HISTORY;

  const chartData = useMemo(() => {
    // Drop rows with a non-finite theta or an unparseable date BEFORE bucketing.
    // Otherwise Number(null).toFixed → "NaN" → NaN reached Recharts (silent gaps
    // / broken area fill), and `new Date(undefined)` produced a "NaN-WNaN" bucket.
    const clean = safeHistory.filter(
      (h) => h && Number.isFinite(Number(h.theta)) && !Number.isNaN(Date.parse(h.date)),
    );
    return bucketThetaHistory(clean, range).map((h) => {
      const theta = Number(Number(h.theta).toFixed(3));
      return { ...h, theta };
    });
  }, [safeHistory, range]);

  // Fit the axis to the data instead of always spanning the full ±4 scale —
  // see utils/thetaDomain for why it's constrained rather than free-scaling.
  const yDomain = useMemo(
    () => computeThetaDomain(chartData.map((d) => d.theta)),
    [chartData],
  );

  // Text alternative for the SVG chart (WCAG 1.1.1): a screen-reader user gets
  // the trend + endpoints instead of an unlabelled graphic. The scale is read
  // from the computed domain — it used to hardcode "−4 to +4", which would
  // now misdescribe the axis a sighted user actually sees.
  const rangeWord = range === 'week' ? 'weeks' : range === 'month' ? 'months' : 'days';
  const first = chartData[0]?.theta ?? 0;
  const last = chartData.at(-1)?.theta ?? 0;
  const trend = last > first ? 'rising' : last < first ? 'falling' : 'flat';
  const chartSummary = `Ability over the last ${chartData.length} ${rangeWord}: ${trend}, from ${abilityPercent(first)}% to ${abilityPercent(last)}%, on an axis from ${abilityPercent(yDomain[0])}% to ${abilityPercent(yDomain[1])}%; the ready line is at ${abilityPercent(READY_THETA)}%.`;

  // One point is a dot: an area needs two, so a first day of history drew an
  // empty chart with an axis.
  const fewPoints = chartData.length <= 2;

  return (
    <div className="w-full h-full min-h-[220px] min-w-0 relative animate-in fade-in">
        {chartData.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center px-4 border-2 border-dashed border-border rounded-[var(--radius-lg)] bg-surface2/20">
                 <span className="text-sm font-medium text-textMain">No ability history yet</span>
                 <span className="text-xs text-muted2">Answer questions on a few days and your ability score's trend shows here.</span>
            </div>
        ) : (
          /* It used to force a 340px-wide chart in a sideways-scrolling box,
             because the "Day 1 … Day 30" labels didn't fit a phone. The axis
             now shows dates and drops labels that would collide
             (minTickGap), so it fits the card at 360px. */
          <div className="absolute inset-0" role="img" aria-label={chartSummary}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorTheta" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent-signal)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="var(--accent-signal)" stopOpacity={0.0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        minTickGap={18}
                        interval="preserveStartEnd"
                        tick={{ fill: 'var(--text-muted)', fontWeight: 600 }}
                    />
                    {/* The percent Today shows (utils/ability), not raw θ. -25
                        clipped labels like "-1.5"; percents are shorter. */}
                    <YAxis
                        domain={yDomain}
                        tickFormatter={(v) => `${abilityPercent(v)}%`}
                        width={44}
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'var(--text-muted)', fontWeight: 600 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'color-mix(in srgb, var(--accent-signal) 30%, transparent)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                    <ReferenceLine y={0} stroke="var(--border-light)" strokeWidth={1} />
                    {/* Readiness marker on the 3PL scale (θ≈1.0 ≈ ~84th percentile,
                        comfortably above the θ=0 pass cutoff). The forecast card is
                        the authoritative pass-probability source. */}
                    <ReferenceLine
                        y={READY_THETA}
                        stroke="var(--accent-success)"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        strokeOpacity={0.5}
                        // Named, not colour alone (2026-11-13).
                        label={{ value: 'Ready', position: 'insideTopRight', fill: 'var(--accent-success)', fontSize: 12, fontWeight: 600 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="theta"
                        stroke="var(--accent-signal)"
                        strokeWidth={3}
                        fill="url(#colorTheta)"
                        dot={fewPoints ? { r: 4, fill: 'var(--accent-signal)', stroke: 'var(--bg-surface)', strokeWidth: 2 } : false}
                        activeDot={{ r: 5, fill: 'var(--accent-signal)', stroke: 'var(--bg-surface)', strokeWidth: 2 }}
                        animationDuration={1500}
                        animationEasing="ease-out"
                    />
                </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
    </div>
  );
}
