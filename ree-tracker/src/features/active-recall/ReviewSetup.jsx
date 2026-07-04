// src/features/active-recall/ReviewSetup.jsx
import React from 'react';

// One-tap preset sessions. Each overrides the relevant knobs but inherits the
// user's currently-selected subject/subtopic from `config`, so a preset respects
// what they were already looking at.
const PRESETS = [
  { id: 'daily', icon: '☀️', label: 'Daily Warm-up', desc: '20 mixed items',
    cfg: { sessionMode: 'mcq', cognitiveFocus: 'mixed', studyMode: 'subject', subtopic: 'All', count: 20, source: 'library' } },
  { id: 'rapid', icon: '⚡', label: 'Rapid Recall', desc: '10 quick items',
    cfg: { sessionMode: 'mcq', cognitiveFocus: 'mixed', studyMode: 'subject', subtopic: 'All', count: 10, source: 'library' } },
  { id: 'weak', icon: '🎯', label: 'Weak-Points Drill', desc: '20 targeted items', online: true,
    cfg: { sessionMode: 'mcq', cognitiveFocus: 'mixed', studyMode: 'bleeding', count: 20, source: 'smart-drill' } },
  { id: 'sweep', icon: '📚', label: 'Full Subject Sweep', desc: '50 items',
    cfg: { sessionMode: 'mcq', cognitiveFocus: 'mixed', studyMode: 'subject', subtopic: 'All', count: 50, source: 'library' } },
];

export default function ReviewSetup({ config, setConfig, session, safeTOS, isOnline, startSession }) {

  const handleModeChange = (mode) => {
      const defaultSubj = 'Mathematics';
      const defaultSub = safeTOS[defaultSubj]?.[0] || 'All';
      setConfig({ ...config, studyMode: mode, subject: defaultSubj, subtopic: defaultSub, source: 'library' });
  };

  // Merge the preset over the live config, persist it (so downstream views like
  // the timer/mode header read the right values), and launch immediately with an
  // explicit config to avoid a setState race.
  const launchPreset = (preset) => {
      const merged = { ...config, ...preset.cfg };
      setConfig(merged);
      startSession(merged);
  };

  return (
    <div className="p-6 sm:p-10 bg-surface/90 backdrop-blur-xl border border-border2/80 rounded-[2rem] shadow-2xl max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-6 duration-500">
      
      <div className="mb-8 border-b border-border2/50 pb-5">
        <h2 className="text-2xl sm:text-3xl font-black text-textMain mb-2 tracking-tight drop-shadow-sm">Review Session</h2>
        <p className="text-sm text-muted2 font-medium">Configure your spaced repetition and mental agility protocols.</p>
      </div>

      {/* ── CUSTOM SESSION BUILDER ─────────────────────────────────────────
          Full control over the session lives here and is presented first, so
          building a bespoke drill is the primary path. One-tap presets follow
          the Initialize button below. */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-[0.7rem] font-black text-reeBlue uppercase tracking-[0.2em]">Custom Session Builder</span>
        <div className="flex-1 h-px bg-border2/40"></div>
      </div>

      {/* SESSION MODE */}
      <div className="mb-8">
        <label className="block text-xs font-black text-muted uppercase tracking-widest mb-3 drop-shadow-sm">Session Mode</label>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => setConfig({...config, sessionMode: 'mcq'})} 
            className={`flex-1 py-4 px-6 rounded-2xl border-2 text-sm font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 ${config.sessionMode === 'mcq' ? 'bg-reeBlue/10 border-reeBlue/60 text-reeBlue shadow-[0_0_20px_rgba(59,130,246,0.15)] scale-[1.02]' : 'bg-surface2/40 border-border2/60 text-muted hover:border-reeBlue/40 hover:text-reeBlue hover:bg-surface3'}`}
          >
            📝 Multiple Choice
          </button>
          <button 
            onClick={() => setConfig({...config, sessionMode: 'flashcard'})} 
            className={`flex-1 py-4 px-6 rounded-2xl border-2 text-sm font-black transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-1 ${config.sessionMode === 'flashcard' ? 'bg-reeAmber/10 border-reeAmber/60 text-reeAmber shadow-[0_0_20px_rgba(245,158,11,0.15)] scale-[1.02]' : 'bg-surface2/40 border-border2/60 text-muted hover:border-reeAmber/40 hover:text-reeAmber hover:bg-surface3'}`}
          >
            <div className="flex items-center gap-2">🗂️ Flashcard</div>
            <span className="text-[0.65rem] font-medium opacity-70 normal-case tracking-wide">(Prioritizes Facts)</span>
          </button>
        </div>
      </div>

      {/* COGNITIVE FOCUS */}
      <div className="mb-8 animate-in fade-in slide-in-from-bottom-2">
        <label className="block text-xs font-black text-muted uppercase tracking-widest mb-3 drop-shadow-sm">Cognitive Focus</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button 
            onClick={() => setConfig({...config, cognitiveFocus: 'mixed'})} 
            className={`py-3.5 px-4 rounded-xl border-2 text-[0.7rem] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${config.cognitiveFocus === 'mixed' ? 'bg-textMain/5 border-textMain/50 text-textMain shadow-sm scale-[1.02]' : 'bg-surface2/30 border-border2/60 text-muted hover:border-textMain/30 hover:text-textMain hover:bg-surface3'}`}
          >
            ⚖️ Standard Mix
          </button>
          <button 
            onClick={() => setConfig({...config, cognitiveFocus: 'conceptual'})} 
            className={`py-3.5 px-4 rounded-xl border-2 text-[0.7rem] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${config.cognitiveFocus === 'conceptual' ? 'bg-reePurple/10 border-reePurple/60 text-reePurple shadow-[0_0_15px_rgba(139,92,246,0.15)] scale-[1.02]' : 'bg-surface2/30 border-border2/60 text-muted hover:border-reePurple/40 hover:text-reePurple hover:bg-surface3'}`}
          >
            🧠 Theory (Conceptual)
          </button>
          <button 
            onClick={() => setConfig({...config, cognitiveFocus: 'calculation'})} 
            className={`py-3.5 px-4 rounded-xl border-2 text-[0.7rem] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${config.cognitiveFocus === 'calculation' ? 'bg-reeRed/10 border-reeRed/60 text-reeRed shadow-[0_0_15px_rgba(239,68,68,0.15)] scale-[1.02]' : 'bg-surface2/30 border-border2/60 text-muted hover:border-reeRed/40 hover:text-reeRed hover:bg-surface3'}`}
          >
            🧮 Math (Calculation)
          </button>
        </div>
      </div>

      {/* STUDY FOCUS */}
      <div className="mb-8">
        <label className="block text-xs font-black text-muted uppercase tracking-widest mb-3 drop-shadow-sm">Study Focus</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button 
            onClick={() => handleModeChange('interleaved')} 
            className={`py-3.5 rounded-xl border text-[0.75rem] font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${config.studyMode === 'interleaved' ? 'bg-reeBlue/10 border-reeBlue/60 text-reeBlue shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-[1.02]' : 'bg-surface2/30 border-border2/60 text-muted hover:border-reeBlue/40 hover:text-reeBlue hover:bg-surface3'}`}
          >
            🔀 Interleaved
          </button>
          <button 
            onClick={() => handleModeChange('subject')} 
            className={`py-3.5 rounded-xl border text-[0.75rem] font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${config.studyMode === 'subject' ? 'bg-reeGreen/10 border-reeGreen/60 text-reeGreen shadow-[0_0_15px_rgba(34,197,94,0.15)] scale-[1.02]' : 'bg-surface2/30 border-border2/60 text-muted hover:border-reeGreen/40 hover:text-reeGreen hover:bg-surface3'}`}
          >
            📚 By Subject
          </button>
          <button 
            onClick={() => handleModeChange('subtopic')} 
            className={`py-3.5 rounded-xl border text-[0.75rem] font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${config.studyMode === 'subtopic' ? 'bg-reeCyan/10 border-reeCyan/60 text-reeCyan shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-[1.02]' : 'bg-surface2/30 border-border2/60 text-muted hover:border-reeCyan/40 hover:text-reeCyan hover:bg-surface3'}`}
          >
            🎯 Subtopic
          </button>
          <button 
            onClick={() => handleModeChange('bleeding')} 
            className={`py-3.5 rounded-xl border text-[0.75rem] font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${config.studyMode === 'bleeding' ? 'bg-reeRed/10 border-reeRed/60 text-reeRed shadow-[0_0_15px_rgba(239,68,68,0.15)] scale-[1.02]' : 'bg-surface2/30 border-border2/60 text-muted hover:border-reeRed/40 hover:text-reeRed hover:bg-surface3'}`}
          >
            🚨 Weak Points
          </button>
        </div>
      </div>

      {['subject', 'subtopic'].includes(config.studyMode) && (
        <div className="flex flex-col sm:flex-row gap-5 mb-8 animate-in fade-in slide-in-from-top-2">
          <div className="flex-1">
            <label className="block text-xs font-black text-muted uppercase tracking-widest mb-3 drop-shadow-sm">Subject</label>
            <div className="relative group">
                <select 
                  value={config.subject} 
                  onChange={e => setConfig({...config, subject: e.target.value, subtopic: safeTOS[e.target.value]?.[0] || 'All'})} 
                  className="w-full bg-surface2/40 border border-border2/60 text-textMain font-bold rounded-xl p-4 text-sm outline-none focus:border-reeBlue focus:ring-2 focus:ring-reeBlue/20 transition-all cursor-pointer appearance-none shadow-sm hover:border-reeBlue/40"
                >
                  {Object.keys(safeTOS).map(s => <option key={s} value={s} className="bg-surface text-textMain">{s}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted transition-transform group-hover:translate-y-0.5">▼</div>
            </div>
          </div>
          {config.studyMode === 'subtopic' && (
            <div className="flex-1 animate-in fade-in slide-in-from-left-4">
              <label className="block text-xs font-black text-muted uppercase tracking-widest mb-3 drop-shadow-sm">Subtopic</label>
              <div className="relative group">
                  <select 
                    value={config.subtopic} 
                    onChange={e => setConfig({...config, subtopic: e.target.value})} 
                    className="w-full bg-surface2/40 border border-border2/60 text-textMain font-bold rounded-xl p-4 text-sm outline-none focus:border-reeCyan focus:ring-2 focus:ring-reeCyan/20 transition-all cursor-pointer appearance-none shadow-sm hover:border-reeCyan/40"
                  >
                    {(safeTOS[config.subject] || []).map(t => <option key={t} value={t} className="bg-surface text-textMain">{t}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted transition-transform group-hover:translate-y-0.5">▼</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🚀 SESSION VOLUME (RESTORED) */}
      <div className="mb-8 animate-in fade-in slide-in-from-bottom-3">
        <label className="block text-xs font-black text-muted uppercase tracking-widest mb-3 drop-shadow-sm">Session Volume</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[10, 20, 50, 100].map(num => (
            <button 
              key={num}
              onClick={() => setConfig({...config, count: num})}
              className={`py-3.5 px-4 rounded-2xl border-2 text-[0.75rem] font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${config.count === num ? 'bg-reeGreen/10 border-reeGreen/60 text-reeGreen shadow-[0_0_15px_rgba(34,197,94,0.15)] scale-[1.02]' : 'bg-surface2/30 border-border2/60 text-muted hover:border-reeGreen/40 hover:text-reeGreen hover:bg-surface3 hover:-translate-y-0.5'}`}
            >
              {num} Items
            </button>
          ))}
        </div>
      </div>

      {config.studyMode !== 'bleeding' && (
        <div className="mb-10">
          <label className="block text-xs font-black text-muted uppercase tracking-widest mb-3 drop-shadow-sm">Question Source</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setConfig({...config, source: 'library'})}
              className={`p-4 rounded-xl border-2 text-[0.8rem] font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 ${config.source === 'library' ? 'border-reeBlue/60 bg-reeBlue/10 text-reeBlue shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-[1.02]' : 'border-border2/60 bg-surface2/30 text-muted hover:border-reeBlue/40 hover:text-reeBlue hover:bg-surface3'}`}
            >
              📚 Local Library Vault
            </button>
            <button
              onClick={() => setConfig({...config, source: 'smart-drill'})}
              disabled={!isOnline}
              className={`p-4 rounded-xl border-2 text-[0.8rem] font-black transition-all duration-300 flex flex-col items-center justify-center gap-1 ${config.source === 'smart-drill' ? 'border-reeRed/60 bg-reeRed/10 text-reeRed shadow-[0_0_15px_rgba(239,68,68,0.15)] scale-[1.02]' : 'border-border2/60 bg-surface2/30 text-muted hover:border-reeRed/40 hover:text-reeRed hover:bg-surface3'} ${!isOnline ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
            >
              <span>🎯 Smart Drill</span>
              <span className="text-[0.6rem] font-medium opacity-70 normal-case">(Targets Weak Areas)</span>
            </button>
            <button
              onClick={() => setConfig({...config, source: 'ai'})}
              disabled={!isOnline}
              className={`p-4 rounded-xl border-2 text-[0.8rem] font-black transition-all duration-300 flex items-center justify-center gap-3 ${config.source === 'ai' ? 'border-reeAmber/60 bg-reeAmber/10 text-reeAmber shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-[1.02]' : 'border-border2/60 bg-surface2/30 text-muted hover:border-reeAmber/40 hover:text-reeAmber hover:bg-surface3'} ${!isOnline ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
            >
              ✨ AI Generator
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => startSession()}
        disabled={session.loading || (!isOnline && config.source !== 'library')}
        className="relative overflow-hidden w-full py-5 bg-reeBlue hover:bg-blue-500 text-white font-black rounded-2xl shadow-[0_4px_25px_rgba(59,130,246,0.35)] transition-all duration-300 hover:shadow-[0_6px_30px_rgba(59,130,246,0.5)] hover:-translate-y-1 flex justify-center items-center gap-3 text-sm tracking-widest uppercase cursor-pointer disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
        {session.loading ? <><span className="telemetry-spinner !w-5 !h-5 border-white"></span> Booting Engine...</> : '🚀 Initialize Active Review Session'}
      </button>

      {/* ── PRESET SESSIONS ────────────────────────────────────────────────
          One-tap quick-starts, shown after the custom builder. Each applies a
          curated config and launches immediately. */}
      <div className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[0.7rem] font-black text-muted uppercase tracking-[0.2em]">Preset Sessions</span>
          <span className="text-[0.6rem] font-medium text-muted2 normal-case tracking-normal">— one-tap start</span>
          <div className="flex-1 h-px bg-border2/40"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRESETS.map(preset => {
            const disabled = session.loading || (preset.online && !isOnline);
            return (
              <button
                key={preset.id}
                onClick={() => launchPreset(preset)}
                disabled={disabled}
                className={`group flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-300 ${disabled ? 'opacity-40 cursor-not-allowed grayscale border-border2/60 bg-surface2/20' : 'cursor-pointer border-border2/60 bg-surface2/30 hover:border-reeBlue/50 hover:bg-surface3 hover:-translate-y-0.5'}`}
              >
                <span className="text-2xl shrink-0">{preset.icon}</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black text-textMain truncate">{preset.label}</span>
                  <span className="text-[0.7rem] font-medium text-muted2">
                    {preset.desc}{preset.online && !isOnline ? ' · needs connection' : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}