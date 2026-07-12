// src/features/gauntlet/GauntletDiagnostics.jsx
import React from 'react';
import LatexRenderer from '../../components/LatexRenderer';

export default function GauntletDiagnostics({ diagnostics, level, navigate, formatTime }) {
    const { scorePct, correctCount, totalItems, isPassed, failedSubtopics, review = [], timeUsedSecs, isTimeOut } = diagnostics;

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
                
                <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-8 relative z-10">
                    {isTimeOut ? 'Time Expired. Auto-submitted.' : 'Evaluation Complete'}
                </div>

                <div className="flex justify-center items-end gap-3 mb-8 relative z-10">
                    <span className={`text-8xl font-black tracking-tighter leading-none ${isPassed ? 'text-textMain' : 'text-reeRed'}`}>{scorePct}%</span>
                </div>

                <div className="flex justify-center gap-6 relative z-10">
                    <div className="flex flex-col items-center">
                        <span className="text-[11px] uppercase tracking-widest text-muted font-bold mb-1">Accuracy</span>
                        <span className="font-mono text-lg font-black">{correctCount} / {totalItems}</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-border2 pl-6">
                        <span className="text-[11px] uppercase tracking-widest text-muted font-bold mb-1">Time Elapsed</span>
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
                                <span className="text-[11px] font-bold text-reeRed uppercase tracking-widest bg-reeRed/10 px-2 py-1 rounded">{errors} Errors</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Missed-question review — the diagnostics used to render no answer
                key, so a failed gauntlet gave the user nothing to learn from. */}
            {review.length > 0 && (
                <div className="bg-surface border border-border2 rounded-2xl p-6 text-left shadow-sm">
                    <h3 className="text-sm font-black text-textMain uppercase tracking-widest flex items-center gap-2 mb-4">
                        <span className="text-reeRed">✗</span> Missed questions ({review.length})
                    </h3>
                    <div className="flex flex-col gap-4 max-h-[560px] overflow-y-auto pr-2 custom-scrollbar">
                        {review.map((item, i) => (
                            <div key={item.questionId || i} className="p-4 bg-bg border border-border2 rounded-xl flex flex-col gap-3">
                                <div className="text-[0.6rem] font-black text-muted uppercase tracking-widest">{item.subtopic}</div>
                                <div className="text-sm text-textMain [&_p]:!m-0"><LatexRenderer content={item.text} /></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border2/50">
                                    <div className="rounded-lg p-3 border border-reeRed/30 bg-reeRed/5">
                                        <div className="text-[0.6rem] font-black text-reeRed uppercase tracking-widest mb-1">Your answer</div>
                                        <div className="text-sm text-textMain/90 line-through [&_p]:!m-0"><LatexRenderer content={item.userAnswer || 'No answer'} /></div>
                                    </div>
                                    <div className="rounded-lg p-3 border border-reeGreen/30 bg-reeGreen/5">
                                        <div className="text-[0.6rem] font-black text-reeGreen uppercase tracking-widest mb-1">Correct answer</div>
                                        <div className="text-sm font-bold text-textMain [&_p]:!m-0"><LatexRenderer content={item.correctAnswer || '—'} /></div>
                                    </div>
                                </div>
                                {item.explanation && (
                                    <div className="text-xs text-muted2 leading-relaxed pt-2 border-t border-border2/40 [&_p]:!m-0"><LatexRenderer content={item.explanation} /></div>
                                )}
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