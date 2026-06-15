// src/features/gauntlet/GauntletDiagnostics.jsx
import React from 'react';

export default function GauntletDiagnostics({ diagnostics, level, navigate, formatTime }) {
    const { scorePct, correctCount, totalItems, isPassed, failedSubtopics, timeUsedSecs, isTimeOut } = diagnostics;

    // Sort subtopics by most failed
    const weakTopics = Object.entries(failedSubtopics).sort((a, b) => b[1] - a[1]);

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-6 page-fade-in pb-12 w-full pt-8 text-center">
            
            <div className={`p-10 rounded-3xl border-2 shadow-2xl relative overflow-hidden ${isPassed ? 'bg-surface border-reeGreen/50' : 'bg-surface border-reeRed/50'}`}>
                {isPassed && <div className="absolute top-0 right-0 w-full h-full bg-reeGreen/5 pointer-events-none"></div>}
                {!isPassed && <div className="absolute top-0 right-0 w-full h-full bg-reeRed/5 pointer-events-none"></div>}

                <div className="text-6xl mb-4 relative z-10">{isPassed ? '🏆' : '💀'}</div>
                <h2 className={`text-3xl font-black uppercase tracking-widest mb-2 relative z-10 ${isPassed ? 'text-reeGreen' : 'text-reeRed'}`}>
                    {isPassed ? 'Gauntlet Mastered' : 'Simulation Failed'}
                </h2>
                
                <div className="text-[0.65rem] font-bold text-muted uppercase tracking-widest mb-8 relative z-10">
                    {isTimeOut ? 'Time Expired. Auto-submitted.' : 'Evaluation Complete'}
                </div>

                <div className="flex justify-center items-end gap-3 mb-8 relative z-10">
                    <span className={`text-8xl font-black tracking-tighter leading-none ${isPassed ? 'text-textMain' : 'text-reeRed'}`}>{scorePct}%</span>
                </div>

                <div className="flex justify-center gap-6 relative z-10">
                    <div className="flex flex-col items-center">
                        <span className="text-[0.6rem] uppercase tracking-widest text-muted font-bold mb-1">Accuracy</span>
                        <span className="font-mono text-lg font-black">{correctCount} / {totalItems}</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-border2 pl-6">
                        <span className="text-[0.6rem] uppercase tracking-widest text-muted font-bold mb-1">Time Elapsed</span>
                        <span className="font-mono text-lg font-black">{formatTime(timeUsedSecs)}</span>
                    </div>
                </div>
            </div>

            {/* The Prescription Plan */}
            {!isPassed && weakTopics.length > 0 && (
                <div className="bg-surface border border-border2 rounded-2xl p-6 text-left shadow-sm">
                    <h3 className="text-sm font-black text-textMain uppercase tracking-widest flex items-center gap-2 mb-2">
                        <span className="text-reeRed">🚨</span> Post-Action Prescription Plan
                    </h3>
                    <p className="text-xs text-muted2 mb-6 leading-relaxed">
                        Your systems have been locked for 12 hours. Review the following critical vulnerabilities in your knowledge matrix before attempting reconnection.
                    </p>
                    
                    <div className="flex flex-col gap-3">
                        {weakTopics.map(([topic, errors], i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-bg border border-border2 rounded-lg">
                                <span className="text-sm font-bold text-textMain">{topic}</span>
                                <span className="text-[0.65rem] font-bold text-reeRed uppercase tracking-widest bg-reeRed/10 px-2 py-1 rounded">{errors} Errors</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button onClick={() => navigate('/arena')} className="mt-4 px-8 py-4 bg-surface2 hover:bg-surface3 border border-border2 text-textMain rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer">
                Return to Arena Hub
            </button>

        </div>
    );
}