// src/features/library/ManualIngestionForm.jsx
import React from 'react';
import { useStore } from '../../store/useStore'; 

export default function ManualIngestionForm({
    manualQ, setManualQ,
    genSubject, setGenSubject,
    genSubtopic, setGenSubtopic,
    handleManualSubmit
}) {
    // 🚀 Connect the dropdowns directly to the cloud-synced Dynamic TOS
    const { dynamicTOS } = useStore(); 

    // Safety fallback in case the store hasn't populated yet
    const safeTOS = dynamicTOS || {};

    return (
        <div className="bg-surface border border-border2 rounded-xl p-6 shadow-sm animate-in fade-in">
            <h3 className="text-lg font-black text-textMain uppercase tracking-widest flex items-center gap-2 mb-6">
                <span className="text-reeCyan">⌨️</span> Manual Entry Terminal
            </h3>
            
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-5">
                {/* Subject and Subtopic Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">Subject</label>
                        <select 
                            value={genSubject} 
                            onChange={e => {
                                setGenSubject(e.target.value);
                                setGenSubtopic(safeTOS[e.target.value]?.[0] || '');
                            }} 
                            className="w-full bg-bg border border-border2 text-textMain p-3 rounded-lg text-sm outline-none focus:border-reeCyan cursor-pointer transition-colors shadow-inner"
                        >
                            {Object.keys(safeTOS).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">Subtopic</label>
                        <select 
                            value={genSubtopic} 
                            onChange={e => setGenSubtopic(e.target.value)} 
                            className="w-full bg-bg border border-border2 text-textMain p-3 rounded-lg text-sm outline-none focus:border-reeCyan cursor-pointer transition-colors shadow-inner"
                        >
                            {(safeTOS[genSubject] || []).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* Configuration Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">Question Type</label>
                        <select 
                            value={manualQ.type || 'calculation'} 
                            onChange={e => setManualQ({...manualQ, type: e.target.value})} 
                            className="w-full bg-bg border border-border2 text-textMain p-3 rounded-lg text-sm outline-none focus:border-reeCyan cursor-pointer transition-colors shadow-inner"
                        >
                            <option value="calculation">🧮 Calculation (Heavy Math)</option>
                            <option value="conceptual">🧠 Conceptual (Theory)</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">Difficulty Metric</label>
                        <select 
                            value={manualQ.difficulty || '2'} 
                            onChange={e => setManualQ({...manualQ, difficulty: e.target.value})} 
                            className="w-full bg-bg border border-border2 text-textMain p-3 rounded-lg text-sm outline-none focus:border-reeCyan cursor-pointer transition-colors shadow-inner"
                        >
                            <option value="1">1 - Foundation (Easy)</option>
                            <option value="2">2 - Core Evaluation (Medium)</option>
                            <option value="3">3 - Advanced (Hard)</option>
                        </select>
                    </div>
                </div>

                {/* Question Text */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">Question Content Text</label>
                    <textarea 
                        required
                        value={manualQ.text || ''} 
                        onChange={e => setManualQ({...manualQ, text: e.target.value})} 
                        className="w-full bg-bg border border-border2 text-textMain p-4 rounded-lg text-sm outline-none min-h-[100px] leading-relaxed custom-scrollbar focus:border-reeCyan transition-colors shadow-inner" 
                        placeholder="Enter the complete question text..." 
                    />
                </div>

                {/* Correct Answer */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[0.65rem] font-bold text-reeGreen uppercase tracking-widest">Verified Correct Answer</label>
                    <input 
                        required
                        value={manualQ.answer || ''} 
                        onChange={e => setManualQ({...manualQ, answer: e.target.value})} 
                        className="w-full bg-bg border border-reeGreen/40 text-textMain p-3.5 rounded-lg text-sm outline-none focus:border-reeGreen transition-colors shadow-[inset_0_0_10px_rgba(34,197,94,0.05)]" 
                        placeholder="The absolute correct value or statement" 
                    />
                </div>

                {/* Distractors */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[0.65rem] font-bold text-reeRed uppercase tracking-widest">Distractors (Wrong Options)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input required value={manualQ.distractor1 || ''} onChange={e => setManualQ({...manualQ, distractor1: e.target.value})} className="w-full bg-bg border border-reeRed/20 text-textMain p-3.5 rounded-lg text-sm outline-none focus:border-reeRed/60 transition-colors shadow-inner" placeholder="Distractor Option 1" />
                        <input required value={manualQ.distractor2 || ''} onChange={e => setManualQ({...manualQ, distractor2: e.target.value})} className="w-full bg-bg border border-reeRed/20 text-textMain p-3.5 rounded-lg text-sm outline-none focus:border-reeRed/60 transition-colors shadow-inner" placeholder="Distractor Option 2" />
                        <input required value={manualQ.distractor3 || ''} onChange={e => setManualQ({...manualQ, distractor3: e.target.value})} className="w-full bg-bg border border-reeRed/20 text-textMain p-3.5 rounded-lg text-sm outline-none focus:border-reeRed/60 transition-colors shadow-inner" placeholder="Distractor Option 3" />
                    </div>
                </div>

                {/* Explanation */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[0.65rem] font-bold text-reeCyan uppercase tracking-widest flex items-center gap-1.5">
                        <span>💾</span> Hardcoded Offline Solution / Explanation (Optional)
                    </label>
                    <textarea 
                        value={manualQ.fixedExplanation || ''} 
                        onChange={e => setManualQ({...manualQ, fixedExplanation: e.target.value})} 
                        className="w-full bg-bg border border-border2 text-textMain p-4 rounded-lg text-sm outline-none min-h-[100px] leading-relaxed custom-scrollbar focus:border-reeCyan transition-colors shadow-inner" 
                        placeholder="Provide step-by-step derivation or conceptual context..." 
                    />
                </div>

                <div className="pt-4 border-t border-border2 mt-2">
                    <button type="submit" className="w-full py-3.5 bg-reeBlue hover:bg-reeBlue2 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] flex justify-center items-center gap-2">
                        <span>🚀</span> Inject into Matrix
                    </button>
                </div>
            </form>
        </div>
    );
}