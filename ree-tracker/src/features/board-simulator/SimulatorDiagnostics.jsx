// src/features/board-simulator/SimulatorDiagnostics.jsx
import React, { useState, useEffect } from 'react';
import LatexRenderer from '../../components/LatexRenderer';

export default function SimulatorDiagnostics({ session, setSession, engine }) {
    const { diagnostics } = session;
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    useEffect(() => {
      if (showExitConfirm) document.body.style.overflow = 'hidden';
      else document.body.style.overflow = 'unset';
      return () => { document.body.style.overflow = 'unset'; };
    }, [showExitConfirm]);

    if (!diagnostics) return null;

    const isPassed = diagnostics.score >= 70;
    const isConditional = diagnostics.score >= 60 && diagnostics.score < 70;
    
    const statusColor = isPassed ? 'text-reeGreen' : isConditional ? 'text-reeAmber' : 'text-reeRed';
    const glowColor = isPassed ? 'shadow-[0_0_50px_rgba(34,197,94,0.15)] border-reeGreen/20' : isConditional ? 'shadow-[0_0_50px_rgba(245,158,11,0.15)] border-reeAmber/20' : 'shadow-[0_0_50px_rgba(239,68,68,0.15)] border-reeRed/20';
    const bgGlow = isPassed ? 'bg-reeGreen/10' : isConditional ? 'bg-reeAmber/10' : 'bg-reeRed/10';

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}m ${s.toString().padStart(2, '0')}s`;
    };

    const handleExit = () => {
        if (engine && typeof engine.setSession === 'function') {
            engine.setSession(s => ({ ...s, isActive: false, isFinished: false, diagnostics: null, questions: [] }));
        } else if (typeof setSession === 'function') {
            setSession(s => ({ ...s, isActive: false, isFinished: false, diagnostics: null, questions: [] }));
        }
        window.location.href = '/dashboard';
    };

    return (
        <>
            {/* 🚀 POST-VERIFICATION MODAL: Completely escapes stacking context traps */}
            {showExitConfirm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-bg/95 backdrop-blur-xl" onClick={() => setShowExitConfirm(false)}></div>
                    <div className="relative bg-surface border border-border2/80 p-8 md:p-12 rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] max-w-md w-full text-center flex flex-col items-center animate-in zoom-in-95 duration-300">
                        <span className="text-6xl mb-6 drop-shadow-lg">🚪</span>
                        <h3 className="text-2xl sm:text-3xl font-black text-white mb-4 tracking-tight">Terminate Diagnostics?</h3>
                        <p className="text-sm text-gray-300 mb-10 font-medium leading-relaxed">
                            Are you sure you want to leave? This report will be closed and you will be returned to the command center.
                        </p>
                        <div className="flex flex-col sm:flex-row w-full gap-4">
                            <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-4 sm:py-5 bg-surface2 hover:bg-surface3 border border-border2/60 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer">Cancel</button>
                            <button onClick={handleExit} className="flex-1 py-4 sm:py-5 bg-reeBlue hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(59,130,246,0.4)] transition-all cursor-pointer">Confirm Exit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🚀 MAIN CONTENT */}
            <div className={`flex flex-col gap-8 max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12 z-0 relative transition-all duration-500 origin-center ${showExitConfirm ? 'scale-95 blur-md opacity-40 pointer-events-none' : 'scale-100 blur-none opacity-100'}`}>
                
                {/* THE HERO TERMINAL */}
                <div className={`relative p-10 sm:p-16 bg-surface/80 backdrop-blur-2xl border rounded-[3rem] flex flex-col items-center justify-center text-center overflow-hidden transition-all duration-1000 ${glowColor}`}>
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 blur-[100px] rounded-full pointer-events-none ${bgGlow}`}></div>
                    
                    <div className="relative z-10">
                        <h2 className="text-[0.65rem] font-black text-muted uppercase tracking-[0.3em] mb-4">Terminal Diagnostics Report</h2>
                        <div className={`text-8xl sm:text-9xl font-black tracking-tighter drop-shadow-lg mb-2 ${statusColor}`}>
                            {diagnostics.score}%
                        </div>
                        <div className={`text-xl sm:text-2xl font-black uppercase tracking-widest bg-bg/50 px-6 py-2 rounded-lg inline-block backdrop-blur-md border border-border2/50 ${statusColor}`}>
                            {diagnostics.verdict}
                        </div>

                        <div className="flex justify-center gap-4 sm:gap-8 mt-10">
                            <div className="bg-surface2 border border-border2/50 px-8 py-5 rounded-3xl flex flex-col items-center min-w-[140px] shadow-sm">
                                <span className="text-[0.65rem] text-gray-400 uppercase tracking-widest font-black mb-1">Hit Rate</span>
                                <span className="text-2xl font-black text-white">{diagnostics.correctItems} <span className="text-gray-400 text-lg">/ {diagnostics.totalItems}</span></span>
                            </div>
                            <div className="bg-surface2 border border-border2/50 px-8 py-5 rounded-3xl flex flex-col items-center min-w-[140px] shadow-sm">
                                <span className="text-[0.65rem] text-gray-400 uppercase tracking-widest font-black mb-1">Time Used</span>
                                <span className="text-2xl font-black text-white">{formatTime(diagnostics.timeTakenSecs)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SUBJECT PERFORMANCE BREAKDOWN */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {[
                        { label: 'Mathematics', score: diagnostics.subjectScores?.Math, color: 'bg-reeBlue shadow-[0_0_15px_rgba(59,130,246,0.5)]' },
                        { label: 'ESAS', score: diagnostics.subjectScores?.ESAS, color: 'bg-reeAmber shadow-[0_0_15px_rgba(245,158,11,0.5)]' },
                        { label: 'EE Professional', score: diagnostics.subjectScores?.EE, color: 'bg-reePurple shadow-[0_0_15px_rgba(139,92,246,0.5)]' }
                    ].map((subj, i) => (
                        <div key={i} className="bg-surface/80 backdrop-blur-md border border-border2/60 p-6 rounded-3xl shadow-sm transition-transform hover:-translate-y-1">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{subj.label}</span>
                                <span className="text-xl font-black text-white">{subj.score !== null && subj.score !== undefined ? `${subj.score}%` : 'N/A'}</span>
                            </div>
                            <div className="w-full h-2.5 bg-surface3/50 rounded-full overflow-hidden border border-border2/30 shadow-inner">
                                <div className={`h-full transition-all duration-1500 ease-out ${subj.color}`} style={{ width: `${subj.score || 0}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CRITICAL INSIGHTS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    <div className="bg-surface/80 backdrop-blur-md border border-border2/60 p-8 rounded-[2rem] shadow-sm flex flex-col hover:border-reeRed/30 transition-colors">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-6">
                            <span className="text-reeRed animate-pulse">⚠️</span> Tactical Vulnerabilities
                        </h3>
                        {/* 🚀 Scrollable Frame */}
                        <div className="flex flex-col gap-3 flex-1 max-h-[400px] overflow-y-auto pr-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-surface2/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-500/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
                            {diagnostics.weakTopics?.length > 0 ? diagnostics.weakTopics.map((topic, i) => (
                                <div key={i} className="px-5 py-4 bg-reeRed/10 border border-reeRed/20 rounded-xl text-red-400 text-sm font-black uppercase tracking-wider shadow-inner">
                                    {topic}
                                </div>
                            )) : (
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border2/50 rounded-2xl opacity-60 p-6 text-center">
                                    <span className="text-2xl mb-2">🛡️</span>
                                    <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">Optimal Coverage Maintained</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-surface/80 backdrop-blur-md border border-border2/60 p-8 rounded-[2rem] shadow-sm flex flex-col hover:border-reeAmber/30 transition-colors">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-2">
                            <span>⏱️</span> Chrono-Anomalies <span className="text-reeAmber bg-reeAmber/10 px-2 py-0.5 rounded-md border border-reeAmber/20">{diagnostics.chronoAnomalies?.length || 0}</span>
                        </h3>
                        <p className="text-[0.65rem] text-gray-400 font-medium mb-6">Items that consumed over 3 minutes of resolution time.</p>
                        
                        {/* 🚀 Scrollable Frame */}
                        <div className="flex flex-col gap-4 flex-1 max-h-[400px] overflow-y-auto pr-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-surface2/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-500/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
                            {diagnostics.chronoAnomalies?.length > 0 ? diagnostics.chronoAnomalies.map((q, i) => (
                                <div key={i} className="p-6 bg-surface2 border border-border2/60 rounded-2xl text-base text-gray-200 font-medium [&_p]:!m-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-sm">
                                    <LatexRenderer content={q.text || q.question} />
                                </div>
                            )) : (
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border2/50 rounded-2xl opacity-60 p-6 text-center">
                                    <span className="text-2xl mb-2">⚡</span>
                                    <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">Optimal Velocity Maintained</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 🚀 CRITICAL BLIND SPOTS DEEP DIVE (Fixed Infinite Scroll & Typography) */}
                <div className="bg-surface/80 backdrop-blur-md border border-reeRed/40 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_0_40px_rgba(239,68,68,0.1)] flex flex-col mt-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-reeRed/5 blur-[80px] rounded-full pointer-events-none"></div>
                    
                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-2 relative z-10">
                        <span className="w-2 h-2 bg-reeRed rounded-full animate-pulse"></span> Critical Blind Spots <span className="text-reeRed bg-reeRed/10 px-2 py-0.5 rounded-md border border-reeRed/20">{diagnostics.blindSpots?.length || 0}</span>
                    </h3>
                    <p className="text-[0.65rem] text-gray-400 font-medium mb-8 relative z-10">Items marked "High Confidence" that evaluated as Incorrect. Review immediately.</p>

                    {/* 🚀 Safe Scrolling Boundary Applied Here */}
                    <div className="flex flex-col gap-6 relative z-10 max-h-[800px] overflow-y-auto pr-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-surface2/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-500/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
                        {diagnostics.blindSpots?.length > 0 ? diagnostics.blindSpots.map((q, i) => (
                            <div key={i} className="p-6 sm:p-8 bg-surface2 border border-border2/60 rounded-[2rem] flex flex-col gap-6 shadow-sm">
                                
                                {/* Question Text */}
                                <div className="text-base sm:text-xl font-medium text-gray-100 [&_p]:!m-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    <LatexRenderer content={q.text || q.question} />
                                </div>
                                
                                {/* Strict WCAG High Contrast Answer Blocks */}
                                <div className="flex flex-col sm:flex-row gap-5 pt-6 border-t border-border2/50">
                                    <div className="flex-1 bg-[#2a1215] border border-reeRed/40 p-6 rounded-[1.5rem] relative overflow-hidden shadow-inner">
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-5 text-7xl font-black text-reeRed select-none pointer-events-none">✕</div>
                                        <span className="block text-[0.65rem] text-red-400 font-black uppercase tracking-widest mb-3 relative z-10">Your Selected Answer</span>
                                        <div className="text-base sm:text-lg text-red-300 [&_p]:!m-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] line-through decoration-red-500/50 font-medium relative z-10">
                                            <LatexRenderer content={q.userAnswer || 'No Answer Selected'} />
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-[#0f291e] border border-reeGreen/40 p-6 rounded-[1.5rem] shadow-[0_0_15px_rgba(34,197,94,0.05)] relative overflow-hidden">
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-5 text-7xl font-black text-reeGreen select-none pointer-events-none">✓</div>
                                        <span className="block text-[0.65rem] text-green-400 font-black uppercase tracking-widest mb-3 relative z-10">Verified Target Knowledge</span>
                                        <div className="text-base sm:text-lg text-green-300 font-black [&_p]:!m-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative z-10">
                                            <LatexRenderer content={q.answer} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="py-16 flex flex-col items-center justify-center border-2 border-dashed border-reeGreen/30 rounded-[2rem] bg-reeGreen/5 shadow-inner">
                                <span className="text-5xl mb-4">🛡️</span>
                                <span className="text-sm text-reeGreen font-black uppercase tracking-widest">No Blind Spots Detected</span>
                                <span className="text-xs text-gray-400 font-medium mt-2">Your confidence aligns perfectly with your competence.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 🚀 HIGH-VISIBILITY EXIT BUTTON */}
                <div className="flex justify-center mt-10 relative z-10">
                    <button 
                        onClick={() => setShowExitConfirm(true)}
                        className="px-12 py-6 bg-reeBlue hover:bg-blue-600 border-2 border-reeBlue/50 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all duration-300 shadow-[0_4px_25px_rgba(59,130,246,0.35)] hover:shadow-[0_6px_30px_rgba(59,130,246,0.5)] hover:-translate-y-1 active:scale-95 cursor-pointer flex items-center gap-3"
                    >
                        Terminate Diagnostics & Return <span>→</span>
                    </button>
                </div>

            </div>
        </>
    );
}