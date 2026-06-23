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
        <p className="text-[0.65rem] uppercase tracking-widest font-black text-textMain mb-2 border-b border-border2/50 pb-2">
          {data.date} <span className="text-muted font-medium ml-2">({data.name})</span>
        </p>
        <div className="flex flex-col gap-1">
            <p className="text-sm font-black text-reeCyan drop-shadow-sm">
              θ: {data.theta > 0 ? '+' : ''}{data.theta}
            </p>
            <p className={`text-[0.65rem] font-bold uppercase tracking-wider ${data.probability >= 70 ? 'text-reeGreen' : data.probability >= 50 ? 'text-reeAmber' : 'text-reeRed'}`}>
              {Math.round(data.probability)}% Pass Probability
            </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function ThetaVelocityChart({ history = [] }) {
  const safeHistory = Array.isArray(history) ? history : [];

  const chartData = useMemo(() => safeHistory.slice(-30).map((h, i) => {
    const passProb = Math.min(100, Math.max(0, ((h.theta + 3) / 6) * 100));
    return {
      name: `Day ${i + 1}`,
      date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      theta: Number(h.theta.toFixed(3)),
      probability: passProb
    };
  }), [safeHistory]);

  return (
    <div className="w-full h-full min-h-[220px] min-w-0 relative animate-in fade-in">
        {chartData.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-border2/50 rounded-xl bg-surface2/20">
                 <span className="text-[0.65rem] text-muted font-mono uppercase tracking-widest">Awaiting Velocity Data</span>
            </div>
        ) : (
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorTheta" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
                    <XAxis 
                        dataKey="name" 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10} 
                        tick={{ fill: '#64748b', fontWeight: 600 }}
                    />
                    <YAxis 
                        domain={[-3, 3]} 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fill: '#64748b', fontWeight: 600 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(6, 182, 212, 0.2)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                    <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.2)" strokeWidth={1} />
                    {/* The 70% threshold roughly translates to a Theta of 1.2 in this visual scale */}
                    <ReferenceLine 
                        y={1.2} 
                        stroke="#22c55e" 
                        strokeDasharray="4 4" 
                        strokeWidth={1.5}
                        strokeOpacity={0.5}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="theta" 
                        stroke="#06b6d4" 
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