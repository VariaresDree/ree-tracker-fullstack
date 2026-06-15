// src/components/ThetaVelocityChart.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function ThetaVelocityChart({ history }) {
    const data = history && history.length > 0 
        ? history 
        : [{ date: new Date().toISOString().split('T')[0], theta: 0 }];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-surface2 border border-border2 p-3 rounded-lg shadow-xl">
                    <p className="text-[0.65rem] text-muted2 font-mono uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-sm font-bold text-reeCyan">
                        Readiness (θ): {payload[0].value.toFixed(3)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full flex flex-col page-fade-in">
            <p className="text-[0.65rem] text-muted2 uppercase tracking-widest mb-6">
                Your estimated board readiness progression over time. Aim for a steady upward trend.
            </p>
            
            <div className="w-full h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickFormatter={(tick) => tick.substring(5)}
                            tickMargin={10}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickFormatter={(tick) => tick.toFixed(1)}
                            domain={['auto', 'auto']}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                        <Line 
                            type="monotone" 
                            dataKey="theta" 
                            stroke="#06b6d4"
                            strokeWidth={3}
                            dot={{ r: 3, fill: '#0a0f1e', stroke: '#06b6d4', strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: '#06b6d4', stroke: '#0a0f1e' }}
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}