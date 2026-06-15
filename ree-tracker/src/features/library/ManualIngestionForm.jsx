// src/features/library/ManualIngestionForm.jsx
import React from 'react';
import { useStore } from '../../store/useStore';

export default function ManualIngestionForm({ 
  manualQ, setManualQ, genSubject, setGenSubject, genSubtopic, setGenSubtopic, handleManualSubmit 
}) {
  const dynamicTOS = useStore((state) => state.dynamicTOS);

  return (
    <form onSubmit={handleManualSubmit} className="p-6 bg-surface border border-border2 rounded-xl flex flex-col gap-5 shadow-xl animate-in fade-in slide-in-from-top-4">
      <div className="border-b border-border2 pb-3 mb-2">
        <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-reeBlue flex items-center gap-2">
          <span>⚙️</span> Manual Structural Ingestion Terminal
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted mb-1.5">Configuration Track</label>
          <select value={genSubject} onChange={e => { setGenSubject(e.target.value); setGenSubtopic(dynamicTOS[e.target.value]?.[0] || ''); }} className="w-full bg-bg border border-border2 text-textMain p-2.5 rounded-md text-xs outline-none focus:border-reeBlue transition-colors cursor-pointer">
            {Object.keys(dynamicTOS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted mb-1.5">Target Matrix Topic</label>
          <select value={genSubtopic} onChange={e => setGenSubtopic(e.target.value)} className="w-full bg-bg border border-border2 text-textMain p-2.5 rounded-md text-xs outline-none focus:border-reeBlue transition-colors cursor-pointer">
            {(dynamicTOS[genSubject] || []).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted mb-1.5">Question Type</label>
          <select value={manualQ.type} onChange={e => setManualQ({...manualQ, type: e.target.value})} className="w-full bg-bg border border-border2 text-textMain p-2.5 rounded-md text-xs outline-none focus:border-reeBlue cursor-pointer">
            <option value="calculation">🧮 Calculation (Heavy Math)</option>
            <option value="conceptual">🧠 Conceptual (Rules/Facts/Codes)</option>
          </select>
        </div>
        <div>
          <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted mb-1.5">Difficulty Metric</label>
          <select value={manualQ.difficulty} onChange={e => setManualQ({...manualQ, difficulty: Number(e.target.value)})} className="w-full bg-bg border border-border2 text-textMain p-2.5 rounded-md text-xs outline-none focus:border-reeBlue cursor-pointer">
            <option value="1">1 - Foundational (Easy)</option>
            <option value="2">2 - Core Evaluation (Medium)</option>
            <option value="3">3 - Complex Board (Hard)</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted mb-1.5">Question Content Text</label>
        <textarea value={manualQ.text} onChange={e => setManualQ({...manualQ, text: e.target.value})} placeholder="Input calculation problem variables cleanly..." className="w-full bg-bg border border-border2 text-textMain p-3 rounded-md text-sm outline-none h-24 focus:border-reeBlue transition-colors" />
      </div>
      <div className="p-4 bg-bg border border-border2 rounded-xl">
        <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-reeGreen mb-1.5">Verified Correct Answer</label>
        <input value={manualQ.correctAnswer} onChange={e => setManualQ({...manualQ, correctAnswer: e.target.value})} placeholder="The absolute correct value or statement" className="w-full bg-surface border border-reeGreen/40 text-textMain p-2.5 rounded-md text-sm outline-none focus:border-reeGreen mb-4 transition-colors" />
        <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-reeRed mb-1.5">Distractors (Wrong Options)</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {manualQ.distractors.map((dist, idx) => (
            <input key={idx} value={dist} onChange={e => {
              const nextDist = [...manualQ.distractors];
              nextDist[idx] = e.target.value;
              setManualQ({...manualQ, distractors: nextDist});
            }} placeholder={`Distractor Option ${idx + 1}`} className="w-full bg-surface border border-reeRed/30 text-textMain p-2.5 rounded-md text-sm outline-none focus:border-reeRed transition-colors" />
          ))}
        </div>
      </div>
      <div className="p-4 bg-surface2/50 border border-border2 rounded-xl mt-2 mb-2">
        <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-reeCyan mb-1.5 flex items-center gap-2">
          <span>💾</span> Hardcoded Offline Solution / Explanation
        </label>
        <textarea
          value={manualQ.fixedExplanation}
          onChange={e => setManualQ({...manualQ, fixedExplanation: e.target.value})}
          placeholder={manualQ.type === 'calculation' ? "Provide step-by-step math derivation..." : "Explain the core concept or PEC rule..."}
          className="w-full bg-bg border border-border2 text-textMain p-3 rounded-md text-sm outline-none h-20 focus:border-reeCyan transition-colors font-mono"
        />
      </div>
      <button type="submit" className="w-full py-3 bg-reeBlue hover:bg-reeBlue2 text-white font-bold rounded-lg text-xs tracking-wider uppercase transition-colors cursor-pointer shadow-lg mt-2">
        Commit Record to Storage Matrix
      </button>
    </form>
  );
}