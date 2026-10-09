// src/components/ThetaVelocityChart.jsx
import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { computeThetaDomain } from '../utils/thetaDomain';
import { bucketThetaHistory } from './thetaHistory';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface/90 backdrop-blur-md border border-border2/80 p-3.5 rounded-xl shadow-xl z-50">
        <p className="text-[11px] uppercase tracking-widest font-black text-textMain mb-2 border-b border-border2/50 pb-2">
          {data.date} <span className="text-muted font-medium ml-2">({data.name})</span>
        </p>
        <div className="flex flex-col gap-1">
            <p className="text-sm font-black text-reeCyan-text drop-shadow-sm">
              θ: {data.theta > 0 ? '+' : ''}{data.theta}
            </p>
            {/* θ only. This used to print a linear (θ + 4) / 8 as "Pass
                Probability", a third θ→% mapping on the same page that
                disagreed with the forecast card next to it. The pass
                probability now lives in one place: the PRC-rule forecast. */}
            <p className="text-[11px] font-medium text-muted2">
              {data.theta >= 0 ? 'Above' : 'Below'} the average candidate (θ = 0)
            </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function ThetaVelocityChart({ history = [], range = 'day' }) {
  const safeHistory = Array.isArray(history) ? history : [];

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
  const fmt = (n) => `${n > 0 ? '+' : ''}${n}`;
  const chartSummary = `Ability (theta) over the last ${chartData.length} ${rangeWord}: ${trend}, from ${fmt(first)} to ${fmt(last)}, on an axis from ${fmt(yDomain[0])} to ${fmt(yDomain[1])}.`;

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
                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -25, bottom: 0 }}>
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
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        minTickGap={18}
                        interval="preserveStartEnd"
                        tick={{ fill: 'var(--text-muted)', fontWeight: 600 }}
                    />
                    <YAxis
                        domain={yDomain}
                        stroke="var(--text-muted)"
                        fontSize={10}
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
                        y={1.0}
                        stroke="var(--accent-success)"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        strokeOpacity={0.5}
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
