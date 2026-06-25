// src/components/HeatmapChart.jsx
import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';

const normKey = (s) => String(s || '').trim().toLowerCase();

function HeatmapChart({ stats }) {
    const [activeTab, setActiveTab] = useState('Mathematics');
    const [viewMode, setViewMode] = useState('accuracy');

    // 🚀 FIXED: Dynamic TOS completely replaces the static fallback
    const { dynamicTOS } = useStore();
    const safeTOS = dynamicTOS || {};
    const microTopics = stats?.microTopics || {};

    // Case/whitespace-insensitive index so a stored subtopic like
    // "algebra & complex numbers" still matches the TOS label
    // "Algebra & Complex Numbers" instead of silently rendering an empty tile.
    const microByNorm = useMemo(() => {
        const m = {};
        for (const [k, v] of Object.entries(microTopics)) m[normKey(k)] = v;
        return m;
    }, [microTopics]);

    const displayedTopics = (safeTOS[activeTab] || []).map(topicName => {
        return {
            name: topicName,
            data: microByNorm[normKey(topicName)] || { attempts: 0, correct: 0, totalTime: 0 }
        };
    }).sort((a, b) => {
        return b.data.attempts - a.data.attempts;
    });

    const targetLimit = activeTab === 'EE' ? 216 : 144;

    return (
        <div className="p-6 bg-surface border border-border2 rounded-xl shadow-md flex flex-col h-full min-h-0">
            <div className="flex justify-between items-center mb-4 border-b border-border2 pb-4 shrink-0">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-textMain flex items-center gap-2">
                        <span>{viewMode === 'accuracy' ? '🔥' : '⏱️'}</span> 
                        {viewMode === 'accuracy' ? 'Topic Mastery Heatmap' : 'Speed Mapping (Risk)'}
                    </h3>
                    <p className="text-[0.65rem] text-muted2 mt-1 uppercase tracking-widest">
                        {viewMode === 'accuracy' ? 'Historical accuracy per vector' : `Average resolution time vs. ${targetLimit}s limit`}
                    </p>
                </div>
                <button 
                    onClick={() => setViewMode(viewMode === 'accuracy' ? 'speed' : 'accuracy')}
                    className="text-[0.65rem] px-3 py-1.5 bg-surface2 border border-border2 rounded-lg hover:bg-surface3 text-textMain cursor-pointer font-bold uppercase tracking-wider transition-colors shadow-sm shrink-0 ml-2"
                >
                    Switch to {viewMode === 'accuracy' ? 'Speed' : 'Accuracy'}
                </button>
            </div>

            <div className="flex gap-2 mb-4 shrink-0">
                {['Mathematics', 'ESAS', 'EE'].map(subj => (
                    <button 
                        key={subj}
                        onClick={() => setActiveTab(subj)}
                        className={`flex-1 py-2.5 rounded-lg text-[0.65rem] font-bold uppercase tracking-widest transition-colors border cursor-pointer ${activeTab === subj ? 'bg-reeBlue/10 border-reeBlue/50 text-reeBlue shadow-sm' : 'bg-bg border-border2 text-muted hover:text-textMain'}`}
                    >
                        {subj === 'Mathematics' ? 'Math' : subj}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2 min-h-0 stagger-fade-in">
                {displayedTopics.map((item, idx) => {
                    // 🚀 SAFE MATH: Guards against Divide by Zero logic errors
                    const hasData = item.data.attempts > 0;
                    const pct = hasData ? Math.round((item.data.correct / item.data.attempts) * 100) : 0;
                    const avgTime = hasData ? Math.round((item.data.totalTime / 1000) / item.data.attempts) : 0;
                    
                    let bgClass = "bg-bg border-border2 opacity-40 grayscale";
                    let textClass = "text-muted";
                    let metricDisplay = "--";
                    let subLabel = "Awaiting Telemetry";

                    if (hasData) {
                        if (viewMode === 'accuracy') {
                            metricDisplay = `${pct}%`;
                            subLabel = `${item.data.correct} / ${item.data.attempts} correct`;
                            
                            if (pct >= 85) { bgClass = "bg-reeGreen/10 border-reeGreen/40"; textClass = "text-reeGreen"; } 
                            else if (pct >= 70) { bgClass = "bg-green-400/10 border-green-400/30"; textClass = "text-green-400"; } 
                            else if (pct >= 50) { bgClass = "bg-reeAmber/10 border-reeAmber/30"; textClass = "text-reeAmber"; } 
                            else { bgClass = "bg-reeRed/10 border-reeRed/40"; textClass = "text-reeRed"; }
                        } else {
                            metricDisplay = `${avgTime}s`;
                            if (avgTime > targetLimit + 30) { bgClass = "bg-reeRed/10 border-reeRed/40"; textClass = "text-reeRed"; subLabel = "CRITICAL RISK"; } 
                            else if (avgTime > targetLimit) { bgClass = "bg-reeAmber/10 border-reeAmber/30"; textClass = "text-reeAmber"; subLabel = "BORDERLINE"; } 
                            else { bgClass = "bg-reeGreen/10 border-reeGreen/40"; textClass = "text-reeGreen"; subLabel = "OPTIMAL SPEED"; }
                        }
                    }

                    return (
                        <div key={idx} className={`p-4 rounded-xl border flex justify-between items-center transition-all shrink-0 ${bgClass}`}>
                            <div className="flex flex-col min-w-0 pr-4">
                                <div className={`text-sm font-bold truncate ${hasData ? 'text-textMain' : 'text-muted'}`} title={item.name}>
                                    {item.name}
                                </div>
                                <div className={`text-[0.6rem] uppercase tracking-widest mt-1 font-bold ${textClass}`}>
                                    {subLabel}
                                </div>
                            </div>
                            <div className={`text-2xl font-black font-mono shrink-0 ${textClass}`}>
                                {metricDisplay}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default React.memo(HeatmapChart);