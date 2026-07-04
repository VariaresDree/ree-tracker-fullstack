// src/components/ReferenceHub.jsx
import React, { useState } from 'react';
import LatexRenderer from './LatexRenderer';
import { useStore } from '../store/useStore';
import { useReferenceData } from '../hooks/useReferenceData';

// The bundled OFFLINE_FORMULAS seed now lives in ../config/formulaSeed and is
// merged with admin-managed DB rows by useReferenceData (see that hook). This
// component just renders the merged, offline-capable result.

export default function ReferenceHub() {
    const { dynamicTOS } = useStore();
    const safeTOS = dynamicTOS || {};
    const { mergedFormulas } = useReferenceData();

    const [matrixSubject, setMatrixSubject] = useState('EE');
    const [activeSubtopic, setActiveSubtopic] = useState('All');

    const handleSubjectChange = (subj) => {
        setMatrixSubject(subj);
        setActiveSubtopic('All');
    };

    const displayedFormulas = mergedFormulas.filter(f =>
        f.subject === matrixSubject &&
        (activeSubtopic === 'All' || (f.subtopics || []).includes(activeSubtopic))
    );

    return (
        <div className="animate-in fade-in flex flex-col gap-5">
            <div className="flex gap-2">
                {['Mathematics', 'ESAS', 'EE'].map(subj => (
                    <button
                        key={subj}
                        onClick={() => handleSubjectChange(subj)}
                        className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm ${matrixSubject === subj ? 'bg-reeCyan text-bg shadow-[0_0_12px_rgba(6,182,212,0.5)]' : 'bg-surface2 hover:bg-surface3 text-textMain border border-border2'}`}>
                        {subj}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b border-border2/50 pb-4 mt-2">
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={() => setActiveSubtopic('All')}
                        className={`px-4 py-2 rounded-lg text-[0.65rem] uppercase tracking-wider font-bold transition-colors cursor-pointer ${activeSubtopic === 'All' ? 'bg-surface3 border-reeCyan text-reeCyan border' : 'bg-bg border border-border2 text-muted hover:text-textMain'}`}>
                        All
                    </button>
                    <button
                        onClick={() => setActiveSubtopic('General')}
                        className={`px-4 py-2 rounded-lg text-[0.65rem] uppercase tracking-wider font-bold transition-colors cursor-pointer ${activeSubtopic === 'General' ? 'bg-surface3 border-reeCyan text-reeCyan border' : 'bg-bg border border-border2 text-muted hover:text-textMain'}`}>
                        General
                    </button>
                </div>
                <div className="hidden sm:block h-6 w-px bg-border2 shrink-0"></div>
                <select
                    value={['All', 'General'].includes(activeSubtopic) ? "" : activeSubtopic}
                    onChange={(e) => { if(e.target.value) setActiveSubtopic(e.target.value); }}
                    className="flex-1 bg-bg border border-border2 text-textMain p-2 rounded-md text-xs font-bold outline-none focus:border-reeCyan cursor-pointer min-w-[200px] transition-colors"
                >
                    <option value="" disabled>Select a specific subtopic to filter...</option>
                    {(safeTOS[matrixSubject] || []).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
            </div>

            {displayedFormulas.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-border2 rounded-xl text-muted2 text-xs font-mono">
                    No offline formulas registered for "{activeSubtopic}" yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                    {displayedFormulas.map((formula, idx) => (
                        <div key={formula.id || `${formula.title}-${idx}`} className="p-5 bg-surface border border-border2 rounded-xl shadow-sm hover:border-reeCyan/40 transition-colors flex flex-col h-full overflow-hidden">
                            <div className="text-[0.65rem] text-muted2 uppercase tracking-widest font-bold mb-3 border-b border-border2 pb-2 leading-relaxed flex items-center justify-between gap-2" title={formula.title}>
                                <span className="truncate">{formula.title}</span>
                                {formula._seed === false && (
                                    <span className="shrink-0 text-[0.5rem] px-1.5 py-0.5 rounded bg-reePurple/10 border border-reePurple/30 text-reePurple tracking-widest">DB</span>
                                )}
                            </div>

                            <div className="w-full overflow-x-auto math-scroll-mobile pb-4 flex-1 flex items-center">
                                <div className="w-max mx-auto px-2 text-textMain">
                                    <LatexRenderer content={formula.eq} />
                                </div>
                            </div>

                            {activeSubtopic === 'All' && (
                                <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-border2/30">
                                    {(formula.subtopics || []).map(t => (
                                        <span key={t} className={`text-[0.6rem] px-2 py-0.5 rounded border ${t === 'General' ? 'bg-reeCyan/10 border-reeCyan/30 text-reeCyan font-bold tracking-widest uppercase' : 'bg-surface2 border-border2 text-muted2 font-medium'}`}>
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
