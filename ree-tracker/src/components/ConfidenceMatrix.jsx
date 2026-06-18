// src/components/ConfidenceMatrix.jsx
import React from 'react';

export default function ConfidenceMatrix({ stats }) {
    // Graceful fallback before server data loads
    const mc = stats?.matrix || { hc: 0, hw: 0, lc: 0, lw: 0 };

    return (
        <div className="flex flex-col w-full animate-in fade-in">
            <div className="grid grid-cols-2 gap-4">
                
                {/* High Confidence - Correct */}
                <div className="p-5 rounded-xl border border-reeGreen/40 bg-reeGreen/5 flex flex-col justify-center shadow-sm transition-colors hover:bg-reeGreen/10">
                    <div className="text-xs uppercase tracking-wider font-bold text-muted2 mb-1">
                        Solid Mastery
                    </div>
                    <div className="text-[0.7rem] text-muted mb-3">High conf. · Correct</div>
                    <div className="text-5xl font-black text-reeGreen mt-auto">{mc.hc}</div>
                </div>

                {/* High Confidence - Wrong (Blind Spot) */}
                <div className="p-5 rounded-xl border border-reeRed/40 bg-reeRed/5 flex flex-col justify-center shadow-[0_0_20px_rgba(239,68,68,0.1)] transition-colors hover:bg-reeRed/10">
                    <div className="text-xs uppercase tracking-wider font-bold text-muted2 mb-1">
                        Dangerous Blind Spot
                    </div>
                    <div className="text-[0.7rem] text-muted mb-3">High conf. · Wrong</div>
                    <div className="text-5xl font-black text-reeRed mt-auto">{mc.hw}</div>
                </div>

                {/* Low Confidence - Correct */}
                <div className="p-5 rounded-xl border border-reeAmber/40 bg-reeAmber/5 flex flex-col justify-center shadow-sm transition-colors hover:bg-reeAmber/10">
                    <div className="text-xs uppercase tracking-wider font-bold text-muted2 mb-1">
                        Imposter Syndrome
                    </div>
                    <div className="text-[0.7rem] text-muted mb-3">Low conf. · Correct</div>
                    <div className="text-5xl font-black text-reeAmber mt-auto">{mc.lc}</div>
                </div>

                {/* Low Confidence - Wrong */}
                <div className="p-5 rounded-xl border border-slate-500/40 bg-slate-500/5 flex flex-col justify-center shadow-sm transition-colors hover:bg-slate-500/10">
                    <div className="text-xs uppercase tracking-wider font-bold text-muted2 mb-1">
                        Needs Foundation
                    </div>
                    <div className="text-[0.7rem] text-muted mb-3">Low conf. · Wrong</div>
                    <div className="text-5xl font-black text-muted2 mt-auto">{mc.lw}</div>
                </div>

            </div>
            
            <div className="text-[0.7rem] text-muted mt-5 bg-surface2 p-4 rounded-xl border border-border2 leading-relaxed">
                💡 <strong className="text-textMain">Blind spots</strong> (high confidence + wrong) reduce your predicted passing score the most. Target these immediately.
            </div>
        </div>
    );
}