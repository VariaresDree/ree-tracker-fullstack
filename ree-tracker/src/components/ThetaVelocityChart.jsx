// src/components/ThetaVelocityChart.jsx
import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface/90 backdrop-blur-md border border-border2/80 p-3.5 rounded-xl shadow-xl z-50">
        <p className="text-[11px] uppercase tracking-widest font-black text-textMain mb-2 border-b border-border2/50 pb-2">
          {data.date} <span className="text-muted font-medium ml-2">({data.name})</span>
        </p>
        <div className="flex flex-col gap-1">
            <p className="text-sm font-black text-reeCyan drop-shadow-sm">
              θ: {data.theta > 0 ? '+' : ''}{data.theta}
            </p>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${data.probability >= 70 ? 'text-reeGreen' : data.probability >= 50 ? 'text-reeAmber' : 'text-reeRed'}`}>
              {Math.round(data.probability)}% Pass Probability
            </p>
        </div>
      </div>
    );
  }
  return null;
};

// ISO-8601 week key (e.g. "2026-W26") for an YYYY-MM-DD date string.
function isoWeekKey(dateStr) {
  const d = new Date(dateStr);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Bucket the daily θ-history by range using PERIOD-LATEST semantics: within each
// week/month we keep the most recent θ reached (history arrives sorted ascending,
// so the last write per bucket wins). Day = raw daily points.
function bucketHistory(history, range) {
  if (range === 'week' || range === 'month') {
    const keyOf = (dateStr) => {
      if (range === 'month') {
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      return isoWeekKey(dateStr);
    };
    const map = new Map();
    for (const h of history) map.set(keyOf(h.date), h); // ascending → latest wins
    const entries = [...map.values()].slice(-12);
    return entries.map((h, i) => {
      const dt = new Date(h.date);
      const name = range === 'month'
        ? dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        : `Wk ${i + 1}`;
      const date = range === 'month'
        ? dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : `Week of ${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      return { name, date, theta: h.theta };
    });
  }
  return history.slice(-30).map((h, i) => ({
    name: `Day ${i + 1}`,
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    theta: h.theta,
  }));
}

export default function ThetaVelocityChart({ history = [], range = 'day' }) {
  const safeHistory = Array.isArray(history) ? history : [];

  const chartData = useMemo(() => {
    // Drop rows with a non-finite theta or an unparseable date BEFORE bucketing.
    // Otherwise Number(null).toFixed → "NaN" → NaN reached Recharts (silent gaps
    // / broken area fill), and `new Date(undefined)` produced a "NaN-WNaN" bucket.
    const clean = safeHistory.filter(
      (h) => h && Number.isFinite(Number(h.theta)) && !Number.isNaN(Date.parse(h.date)),
    );
    return bucketHistory(clean, range).map((h) => {
      const theta = Number(Number(h.theta).toFixed(3));
      return {
        ...h,
        theta,
        probability: Math.min(100, Math.max(0, ((theta + 3) / 6) * 100)),
      };
    });
  }, [safeHistory, range]);

  return (
    <div className="w-full h-full min-h-[220px] min-w-0 relative animate-in fade-in">
        {chartData.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-border2/50 rounded-xl bg-surface2/20">
                 <span className="text-[11px] text-muted font-mono uppercase tracking-widest">Awaiting Velocity Data</span>
            </div>
        ) : (
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorTheta" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent-signal)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="var(--accent-signal)" stopOpacity={0.0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
                    <XAxis 
                        dataKey="name" 
                        stroke="var(--text-muted)" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10} 
                        tick={{ fill: 'var(--text-muted)', fontWeight: 600 }}
                    />
                    <YAxis 
                        domain={[-3, 3]} 
                        stroke="var(--text-muted)" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: 'var(--text-muted)', fontWeight: 600 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(6, 182, 212, 0.2)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                    <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.2)" strokeWidth={1} />
                    {/* The 70% threshold roughly translates to a Theta of 1.2 in this visual scale */}
                    <ReferenceLine 
                        y={1.2} 
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