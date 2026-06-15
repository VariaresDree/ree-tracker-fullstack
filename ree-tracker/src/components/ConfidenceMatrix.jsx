import React from 'react';

export default function ConfidenceMatrix({ stats }) {
    const mc = stats?.matrix || { hc: 0, hw: 0, lc: 0, lw: 0 };

    return (
        <div>
            <div className="grid grid-cols-2 gap-3 mb-3">
                
                {/* High Confidence - Correct */}
                <div className="p-4 rounded-lg border border-reeGreen/40 bg-reeGreen/5 flex flex-col">
                    <div className="text-[0.7rem] uppercase tracking-wider font-bold text-muted2 mb-1">
                        Solid Mastery
                    </div>
                    <div className="text-[0.65rem] text-muted mb-2">High conf. · Correct</div>
                    <div className="text-3xl font-extrabold text-reeGreen mt-auto">{mc.hc}</div>
                </div>

                {/* High Confidence - Wrong (Blind Spot) */}
                <div className="p-4 rounded-lg border border-reeRed/40 bg-reeRed/5 flex flex-col shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                    <div className="text-[0.7rem] uppercase tracking-wider font-bold text-muted2 mb-1">
                        Dangerous Blind Spot
                    </div>
                    <div className="text-[0.65rem] text-muted mb-2">High conf. · Wrong</div>
                    <div className="text-3xl font-extrabold text-reeRed mt-auto">{mc.hw}</div>
                </div>

                {/* Low Confidence - Correct */}
                <div className="p-4 rounded-lg border border-reeAmber/40 bg-reeAmber/5 flex flex-col">
                    <div className="text-[0.7rem] uppercase tracking-wider font-bold text-muted2 mb-1">
                        Imposter Syndrome
                    </div>
                    <div className="text-[0.65rem] text-muted mb-2">Low conf. · Correct</div>
                    <div className="text-3xl font-extrabold text-reeAmber mt-auto">{mc.lc}</div>
                </div>

                {/* Low Confidence - Wrong */}
                <div className="p-4 rounded-lg border border-slate-500/40 bg-slate-500/5 flex flex-col">
                    <div className="text-[0.7rem] uppercase tracking-wider font-bold text-muted2 mb-1">
                        Needs Foundation
                    </div>
                    <div className="text-[0.65rem] text-muted mb-2">Low conf. · Wrong</div>
                    <div className="text-3xl font-extrabold text-muted2 mt-auto">{mc.lw}</div>
                </div>

            </div>
            
            <p className="text-[0.75rem] text-muted mt-3 bg-surface2 p-2 rounded border border-border2">
                💡 <strong className="text-textMain">Blind spots</strong> (high confidence + wrong) reduce your predicted passing score the most. Target these immediately.
            </p>
        </div>
    );
}