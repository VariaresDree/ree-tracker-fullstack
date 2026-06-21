// src/components/ConfidenceMatrix.jsx
import React from 'react';

export default function ConfidenceMatrix({ stats }) {
    // Fallback to prevent rendering crashes before telemetry syncs
    const mc = stats?.matrix || { hc: 0, hw: 0, lc: 0, lw: 0 };

    return (
        <div className="flex flex-col w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 🚀 Sleek 2x2 Grid: Compact vertically, wide enough horizontally to prevent text squishing */}
            <div className="grid grid-cols-2 gap-4 flex-1">
                
                {/* 🟩 Solid Mastery */}
                <div className="group relative p-4 sm:p-5 rounded-2xl border border-border2/60 bg-surface2/20 overflow-hidden cursor-default transition-all duration-300 hover:border-reeGreen/50 hover:bg-reeGreen/[0.03] hover:shadow-[0_8px_30px_-12px_rgba(34,197,94,0.2)]">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-reeGreen/10 rounded-full blur-2xl group-hover:bg-reeGreen/20 transition-all duration-500 ease-out"></div>
                    <div className="relative z-10 flex justify-between items-center h-full">
                        <div className="flex flex-col justify-center">
                            <span className="text-[0.65rem] sm:text-xs font-black uppercase tracking-widest text-reeGreen mb-1 drop-shadow-sm">Mastery</span>
                            <span className="text-[0.6rem] font-medium text-muted tracking-wide">High Conf · Correct</span>
                        </div>
                        <div className="text-4xl sm:text-5xl font-black text-reeGreen drop-shadow-md transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-1">{mc.hc}</div>
                    </div>
                </div>

                {/* 🟥 Dangerous Blind Spot */}
                <div className="group relative p-4 sm:p-5 rounded-2xl border border-reeRed/30 bg-reeRed/[0.02] overflow-hidden cursor-default transition-all duration-300 hover:border-reeRed/60 hover:bg-reeRed/[0.05] shadow-[0_0_15px_rgba(239,68,68,0.05)] hover:shadow-[0_8px_30px_-12px_rgba(239,68,68,0.3)]">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-reeRed/10 rounded-full blur-2xl group-hover:bg-reeRed/25 transition-all duration-500 ease-out"></div>
                    <div className="relative z-10 flex justify-between items-center h-full">
                        <div className="flex flex-col justify-center">
                            <span className="text-[0.65rem] sm:text-xs font-black uppercase tracking-widest text-reeRed mb-1 drop-shadow-sm">Blind Spot</span>
                            <span className="text-[0.6rem] font-medium text-muted tracking-wide">High Conf · Wrong</span>
                        </div>
                        <div className="text-4xl sm:text-5xl font-black text-reeRed drop-shadow-md transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-1">{mc.hw}</div>
                    </div>
                </div>

                {/* 🟧 Imposter Syndrome */}
                <div className="group relative p-4 sm:p-5 rounded-2xl border border-border2/60 bg-surface2/20 overflow-hidden cursor-default transition-all duration-300 hover:border-reeAmber/50 hover:bg-reeAmber/[0.03] hover:shadow-[0_8px_30px_-12px_rgba(245,158,11,0.2)]">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-reeAmber/10 rounded-full blur-2xl group-hover:bg-reeAmber/20 transition-all duration-500 ease-out"></div>
                    <div className="relative z-10 flex justify-between items-center h-full">
                        <div className="flex flex-col justify-center">
                            <span className="text-[0.65rem] sm:text-xs font-black uppercase tracking-widest text-reeAmber mb-1 drop-shadow-sm">Imposter</span>
                            <span className="text-[0.6rem] font-medium text-muted tracking-wide">Low Conf · Correct</span>
                        </div>
                        <div className="text-4xl sm:text-5xl font-black text-reeAmber drop-shadow-md transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-1">{mc.lc}</div>
                    </div>
                </div>

                {/* 🔲 Needs Foundation */}
                <div className="group relative p-4 sm:p-5 rounded-2xl border border-border2/60 bg-surface2/20 overflow-hidden cursor-default transition-all duration-300 hover:border-slate-400/50 hover:bg-slate-400/[0.03] hover:shadow-[0_8px_30px_-12px_rgba(148,163,184,0.15)]">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-400/10 rounded-full blur-2xl group-hover:bg-slate-400/20 transition-all duration-500 ease-out"></div>
                    <div className="relative z-10 flex justify-between items-center h-full">
                        <div className="flex flex-col justify-center">
                            <span className="text-[0.65rem] sm:text-xs font-black uppercase tracking-widest text-slate-400 mb-1 drop-shadow-sm">Deficient</span>
                            <span className="text-[0.6rem] font-medium text-muted tracking-wide">Low Conf · Wrong</span>
                        </div>
                        <div className="text-4xl sm:text-5xl font-black text-slate-400 drop-shadow-md transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-1">{mc.lw}</div>
                    </div>
                </div>

            </div>
            
            {/* 🚀 Insight Bar with modern blur and border styling */}
            <div className="mt-5 bg-surface2/30 backdrop-blur-md p-4 rounded-xl border border-border2/50 flex items-start gap-3 transition-colors hover:border-border2/80">
                <span className="text-lg leading-none animate-pulse">💡</span>
                <p className="text-[0.65rem] text-muted leading-relaxed font-medium">
                    <strong className="text-textMain font-black">Blind spots</strong> (high confidence + wrong) are critical trajectory killers. They reduce your predicted passing score the most. Target these immediately in Active Review.
                </p>
            </div>
        </div>
    );
}