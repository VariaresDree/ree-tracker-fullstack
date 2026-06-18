// src/features/active-recall/ReviewSetup.jsx
import React from 'react';
import { useStore } from '../../store/useStore'; // 🚀 FIXED: Dynamic Store Import

export default function ReviewSetup({ config, setConfig, session, stats, isOnline, loadNextQuestion, libraryCache }) {
  // 🚀 FIXED: Pull the live syllabus from global memory
  const { dynamicTOS } = useStore();
  const safeTOS = dynamicTOS || {};

  return (
    <div className="p-6 bg-surface border border-border2 rounded-xl shadow-sm">
      <h2 className="text-2xl font-black text-textMain mb-1 tracking-tight">Review Session</h2>
      <p className="text-sm text-muted2 mb-6">Configure the spaced repetition and mental agility protocols.</p>

      {/* SESSION MODE */}
      <div className="mb-6">
        <label className="block text-[0.65rem] font-bold text-muted uppercase tracking-wider mb-2">Session Mode</label>
        <div className="flex gap-3">
          <button onClick={() => { setConfig({...config, sessionMode: 'mcq'}); libraryCache.current = []; }} className={`flex-1 py-3 rounded-lg border text-sm font-bold transition-all cursor-pointer ${config.sessionMode === 'mcq' ? 'bg-reeBlue/20 border-reeBlue text-reeBlue shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-bg border-border2 text-muted hover:border-muted2'}`}>
            📝 Multiple Choice
          </button>
          <button onClick={() => { setConfig({...config, sessionMode: 'flashcard'}); libraryCache.current = []; }} className={`flex-1 py-3 rounded-lg border text-sm font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${config.sessionMode === 'flashcard' ? 'bg-reePurple/20 border-reePurple text-reePurple shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'bg-bg border-border2 text-muted hover:border-muted2'}`}>
            <span>🗂️ Flashcard</span>
            <span className="text-[0.6rem] font-normal opacity-80">(Prioritizes Facts)</span>
          </button>
        </div>
      </div>

      {/* NEW: COGNITIVE FOCUS */}
      <div className="mb-6 animate-in fade-in slide-in-from-top-2">
        <label className="block text-[0.65rem] font-bold text-muted uppercase tracking-wider mb-2">
            Cognitive Focus
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
                onClick={() => { setConfig({ ...config, cognitiveFocus: 'mixed' }); libraryCache.current = []; }}
                className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${config.cognitiveFocus === 'mixed' ? 'bg-textMain/10 border-textMain text-textMain shadow-[0_0_15px_rgba(241,245,249,0.1)]' : 'bg-bg border-border2 text-muted hover:border-textMain/50'}`}
            >
                ⚖️ Standard Mix
            </button>
            <button
                onClick={() => { setConfig({ ...config, cognitiveFocus: 'conceptual' }); libraryCache.current = []; }}
                className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${config.cognitiveFocus === 'conceptual' ? 'bg-reePurple/20 border-reePurple text-reePurple shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'bg-bg border-border2 text-muted hover:border-reePurple/50'}`}
            >
                🧠 Theory (Conceptual)
            </button>
            <button
                onClick={() => { setConfig({ ...config, cognitiveFocus: 'calculation' }); libraryCache.current = []; }}
                className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${config.cognitiveFocus === 'calculation' ? 'bg-reeAmber/20 border-reeAmber text-reeAmber shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-bg border-border2 text-muted hover:border-reeAmber/50'}`}
            >
                🧮 Math (Calculation)
            </button>
        </div>
      </div>

      {/* TARGET MATRIX FOCUS */}
      <div className="mb-6">
        <label className="block text-[0.65rem] font-bold text-muted uppercase tracking-wider mb-2">Target Matrix Focus</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => { setConfig({...config, studyMode: 'interleaved', source: 'library'}); libraryCache.current = []; }} className={`py-2.5 rounded-md border text-xs font-bold transition-all cursor-pointer ${config.studyMode === 'interleaved' ? 'bg-reeAmber/20 border-reeAmber text-reeAmber' : 'bg-bg border-border2 text-muted'}`}>
            🔀 Interleaved
          </button>
          <button onClick={() => { setConfig({...config, studyMode: 'subject', source: 'library'}); libraryCache.current = []; }} className={`py-2.5 rounded-md border text-xs font-bold transition-all cursor-pointer ${config.studyMode === 'subject' ? 'bg-reeBlue/20 border-reeBlue text-reeBlue' : 'bg-bg border-border2 text-muted'}`}>
            📚 By Subject
          </button>
          <button onClick={() => { setConfig({...config, studyMode: 'subtopic', source: 'library'}); libraryCache.current = []; }} className={`py-2.5 rounded-md border text-xs font-bold transition-all cursor-pointer ${config.studyMode === 'subtopic' ? 'bg-reeCyan/20 border-reeCyan text-reeCyan' : 'bg-bg border-border2 text-muted'}`}>
            🎯 Subtopic
          </button>
          <button onClick={() => { setConfig({...config, studyMode: 'bleeding', source: 'library'}); libraryCache.current = []; }} className={`py-2.5 rounded-md border text-xs font-bold transition-all cursor-pointer relative overflow-hidden ${config.studyMode === 'bleeding' ? 'bg-reeRed/20 border-reeRed text-reeRed font-black' : 'bg-bg border-border2 text-reeRed/70 hover:border-reeRed/50'}`}>
            🚨 Bleeding Edge ({stats?.blindSpots?.length || 0})
          </button>
        </div>
      </div>

      {config.studyMode !== 'interleaved' && config.studyMode !== 'bleeding' && (
        <div className="flex gap-4 mb-6 animate-in fade-in duration-300">
          <div className="flex-1">
            <label className="block text-[0.65rem] font-bold text-muted uppercase tracking-wider mb-2">Subject</label>
            {/* 🚀 FIXED: Replaced static TOS with dynamic safeTOS here */}
            <select 
                value={config.subject} 
                onChange={e => { 
                    setConfig({...config, subject: e.target.value, subtopic: safeTOS[e.target.value]?.[0] || ''}); 
                    libraryCache.current = []; 
                }} 
                className="w-full bg-bg border border-border2 text-textMain rounded-md p-2.5 text-xs outline-none focus:border-reeBlue cursor-pointer"
            >
              {Object.keys(safeTOS).map(s => <option key={s} value={s}>{s === 'ESAS' ? 'ESAS' : s}</option>)}
            </select>
          </div>
          {config.studyMode === 'subtopic' && (
            <div className="flex-1">
              <label className="block text-[0.65rem] font-bold text-muted uppercase tracking-wider mb-2">Subtopic</label>
              {/* 🚀 FIXED: Replaced static TOS with dynamic safeTOS here */}
              <select 
                  value={config.subtopic} 
                  onChange={e => { 
                      setConfig({...config, subtopic: e.target.value}); 
                      libraryCache.current = []; 
                  }} 
                  className="w-full bg-bg border border-border2 text-textMain rounded-md p-2.5 text-xs outline-none focus:border-reeCyan cursor-pointer"
              >
                {(safeTOS[config.subject] || []).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {config.studyMode !== 'bleeding' && (
        <div className="mb-8">
          <label className="block text-[0.65rem] font-bold text-muted uppercase tracking-wider mb-2">Data Ingestion Source</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button onClick={() => { setConfig({...config, source: 'library'}); libraryCache.current = []; }} className={`p-3 rounded-md border text-left text-xs font-bold transition-all cursor-pointer ${config.source === 'library' ? 'border-reeBlue bg-reeBlue/10 text-reeBlue' : 'border-border2 bg-bg text-muted hover:border-muted2'}`}>
              📚 Local Library Vault
            </button>
            <button onClick={() => { setConfig({...config, source: 'ai'}); libraryCache.current = []; }} disabled={!isOnline} className={`p-3 rounded-md border text-left text-xs font-bold transition-all ${config.source === 'ai' ? 'border-reePurple bg-reePurple/10 text-reePurple' : 'border-border2 bg-bg text-muted'} ${!isOnline ? 'opacity-50 cursor-not-allowed' : 'hover:border-muted2 cursor-pointer'}`}>
              ✨ AI Generate {!isOnline && ' (Offline)'}
            </button>
            <button onClick={() => { setConfig({...config, source: 'web'}); libraryCache.current = []; }} disabled={!isOnline} className={`p-3 rounded-md border text-left text-xs font-bold transition-all ${config.source === 'web' ? 'border-reeCyan bg-reeCyan/10 text-reeCyan' : 'border-border2 bg-bg text-muted'} ${!isOnline ? 'opacity-50 cursor-not-allowed' : 'hover:border-muted2 cursor-pointer'}`}>
              🌐 Web Grounded {!isOnline && ' (Offline)'}
            </button>
          </div>
        </div>
      )}

      <button onClick={loadNextQuestion} disabled={session.aiLoading || (!isOnline && config.source !== 'library' && config.studyMode !== 'bleeding')} className="w-full py-4 bg-reeBlue hover:bg-reeBlue2 text-white font-bold rounded-lg shadow-md transition-colors flex justify-center items-center gap-2 text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
        {session.aiLoading ? <><span className="telemetry-spinner !w-4 !h-4 border-white border-t-transparent"></span> Booting Engine...</> : '🚀 Initialize Active Review Session'}
      </button>
    </div>
  );
}