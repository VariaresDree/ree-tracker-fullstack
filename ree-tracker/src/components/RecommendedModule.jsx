// src/components/RecommendedModule.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RecommendedModule({ stats }) {
    const navigate = useNavigate();

    // The hunting algorithm: Find the subtopic with the highest number of incorrect answers
    const weakestLink = useMemo(() => {
        if (!stats?.microTopics) return null;
        
        let highestRiskTopic = null;
        let highestRiskScore = -1;

        Object.entries(stats.microTopics).forEach(([topic, data]) => {
            // Risk score = Total mistakes. We only care if they've attempted it at least 3 times.
            if (data.attempts >= 3) {
                const mistakes = data.attempts - data.correct;
                if (mistakes > highestRiskScore) {
                    highestRiskScore = mistakes;
                    highestRiskTopic = topic;
                }
            }
        });

        return { topic: highestRiskTopic, score: highestRiskScore };
    }, [stats]);

    if (!weakestLink?.topic) {
        return (
            <div className="p-6 bg-surface border border-border2 rounded-xl shadow-sm text-center">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-2">Tactical Recommendation</h3>
                <p className="text-xs text-muted2 font-mono">Insufficient telemetry. Complete more simulations to generate targeting data.</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-surface border border-reeRed/30 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.05)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-reeRed"></div>
            
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-reeRed mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-reeRed rounded-full animate-pulse"></span> Critical Vulnerability Detected
                    </h3>
                    <div className="text-lg font-black text-textMain leading-tight line-clamp-2" title={weakestLink.topic}>
                        {weakestLink.topic}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-5 text-xs">
                <div className="flex flex-col">
                    <span className="text-[0.6rem] text-muted uppercase tracking-widest">Risk Level</span>
                    <span className="font-bold text-reeRed">High ({weakestLink.score} Errors)</span>
                </div>
                <div className="w-px h-6 bg-border2"></div>
                <div className="flex flex-col">
                    <span className="text-[0.6rem] text-muted uppercase tracking-widest">Action Required</span>
                    <span className="font-bold text-textMain">Active Recall</span>
                </div>
            </div>

            <button 
                onClick={() => navigate('/review')} 
                className="w-full py-3 bg-reeRed/10 hover:bg-reeRed/20 border border-reeRed/30 text-reeRed text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex justify-center items-center gap-2 group-hover:border-reeRed/60"
            >
                Launch Focused Review <span>→</span>
            </button>
        </div>
    );
}