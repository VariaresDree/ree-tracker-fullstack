// src/features/board-simulator/SimulatorConfig.jsx
import React from 'react';
import { useStore } from '../../store/useStore';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export default function SimulatorConfig({ config, setConfig, session, startSimulation, engine }) {
  const { dynamicTOS } = useStore();
  const safeTOS = dynamicTOS || {};
  const isOnline = useNetworkStatus();

  const isCustom = config.mode === 'subject' && !config.isPrcStandard;
  const isPrcSubject = config.mode === 'subject' && config.isPrcStandard;
  const isBlended = config.mode === 'blended';

  // State-safe profile handler
  const setProfile = (profile) => {
    if (profile === 'custom') {
        setConfig({ 
            ...config, mode: 'subject', isPrcStandard: false, count: 50, 
            subject: config.subject === 'blended' ? 'Mathematics' : config.subject 
        });
    }
    if (profile === 'prc_subject') {
        setConfig({ 
            ...config, mode: 'subject', isPrcStandard: true, count: 100,
            subject: config.subject === 'blended' ? 'Mathematics' : config.subject 
        });
    }
    if (profile === 'prc_blended') {
        setConfig({ ...config, mode: 'blended', isPrcStandard: true, count: 100, subject: 'blended' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 page-fade-in pt-6 pb-12 w-full">
      <div className="p-6 sm:p-10 bg-surface/90 backdrop-blur-xl border border-border2/80 rounded-[2rem] shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-500">
        
        {/* 🚀 Header */}
        <div className="mb-8 border-b border-border2/50 pb-5">
          <h2 className="text-2xl sm:text-3xl font-black text-textMain mb-2 tracking-tight drop-shadow-sm">Pre-Board Simulator</h2>
          <p className="text-sm text-muted2 font-medium">Select your evaluation profile to configure the pressure chamber.</p>
        </div>

        {/* 🚀 Status Warnings */}
        {session?.error && (
            <div className="mb-8 p-4 bg-reeRed/10 border border-reeRed/30 text-reeRed text-sm rounded-xl font-bold animate-in zoom-in">
                {session.error}
            </div>
        )}
        
        {engine?.hasSavedSession && (
            <div className="mb-8 p-6 bg-gradient-to-r from-reeAmber/10 to-transparent border border-reeAmber/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 shadow-inner animate-in fade-in slide-in-from-top-4">
                <div>
                    <h4 className="text-xs font-black text-reeAmber tracking-widest uppercase mb-1.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-reeAmber animate-pulse"></span> Unfinished Matrix Detected
                    </h4>
                    <p className="text-sm text-muted font-medium">You have a cached mock board in progress.</p>
                </div>
                <button onClick={engine.resumeSimulation} className="px-8 py-3.5 bg-reeAmber hover:bg-amber-500 text-bg font-black rounded-xl text-xs uppercase tracking-widest shadow-[0_4px_15px_rgba(245,158,11,0.3)] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto flex justify-center cursor-pointer">
                    Resume Matrix
                </button>
            </div>
        )}

        {/* 🚀 EVALUATION PROFILE */}
        <div className="mb-8">
            <label className="block text-xs font-black text-muted uppercase tracking-widest mb-3 drop-shadow-sm">Evaluation Profile</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => setProfile('custom')} className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer flex flex-col justify-between ${isCustom ? 'bg-reeBlue/10 border-reeBlue/60 text-reeBlue shadow-[0_0_20px_rgba(59,130,246,0.15)] scale-[1.02]' : 'bg-surface2/40 border-border2/60 text-muted hover:border-reeBlue/40 hover:bg-surface3 hover:-translate-y-0.5'}`}>
                    <div className={`text-2xl mb-4 transition-transform ${isCustom ? 'scale-110' : ''}`}>⚙️</div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-widest mb-1.5 ${isCustom ? 'text-reeBlue' : 'text-textMain'}`}>Custom Drill</h3>
                        <p className="text-[0.65rem] text-muted2 leading-relaxed font-medium">Adjustable item count and time limits for focused subject practice.</p>
                    </div>
                </button>
                
                <button onClick={() => setProfile('prc_subject')} className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer flex flex-col justify-between ${isPrcSubject ? 'bg-reeAmber/10 border-reeAmber/60 text-reeAmber shadow-[0_0_20px_rgba(245,158,11,0.15)] scale-[1.02]' : 'bg-surface2/40 border-border2/60 text-muted hover:border-reeAmber/40 hover:bg-surface3 hover:-translate-y-0.5'}`}>
                    <div className={`text-2xl mb-4 transition-transform ${isPrcSubject ? 'scale-110' : ''}`}>🏛️</div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-widest mb-1.5 ${isPrcSubject ? 'text-reeAmber' : 'text-textMain'}`}>PRC Standard</h3>
                        <p className="text-[0.65rem] text-muted2 leading-relaxed font-medium">Strict 100 items. Locked 4 or 6 hour limit depending on the subject.</p>
                    </div>
                </button>

                <button onClick={() => setProfile('prc_blended')} className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer flex flex-col justify-between ${isBlended ? 'bg-reePurple/10 border-reePurple/60 text-reePurple shadow-[0_0_20px_rgba(139,92,246,0.15)] scale-[1.02]' : 'bg-surface2/40 border-border2/60 text-muted hover:border-reePurple/40 hover:bg-surface3 hover:-translate-y-0.5'}`}>
                    <div className={`text-2xl mb-4 transition-transform ${isBlended ? 'scale-110' : ''}`}>⚖️</div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-widest mb-1.5 ${isBlended ? 'text-reePurple' : 'text-textMain'}`}>Full Blended</h3>
                        <p className="text-[0.65rem] text-muted2 leading-relaxed font-medium">The ultimate test. 100 mixed items (Math, ESAS, EE) locked to 5 hours.</p>
                    </div>
                </button>
            </div>
        </div>

        {/* 🚀 TARGET DOMAIN & SUBTOPIC */}
        <div className="flex flex-col sm:flex-row gap-5 mb-8 animate-in fade-in slide-in-from-top-2">
          <div className="flex-1">
            <label className="block text-xs font-black text-muted uppercase tracking-widest mb-3 drop-shadow-sm">Target Domain</label>
            <div className="relative group">
                <select 
                  disabled={isBlended} 
                  value={config.subject} 
                  onChange={e => setConfig({...config, subject: e.target.value, subtopic: safeTOS[e.target.value]?.[0] || 'All'})} 
                  className="w-full bg-surface2/40 border border-border2/60 text-textMain font-bold rounded-xl p-4 text-sm outline-none focus:border-reeBlue focus:ring-2 focus:ring-reeBlue/20 transition-all cursor-pointer appearance-none shadow-sm hover:border-reeBlue/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {Object.keys(safeTOS).map(s => <option key={s} value={s} className="bg-surface text-textMain">{s === 'EE' ? 'Electrical Engineering (EE)' : s}</option>)}
                  {isBlended && <option value="blended" className="bg-surface text-textMain">Blended Matrix</option>}
                </select>
                {!isBlended && <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted transition-transform group-hover:translate-y-0.5">▼</div>}
            </div>
          </div>

          {isCustom && config.subject && config.subject !== 'blended' && (
            <div className="flex-1 animate-in fade-in slide-in-from-left-4">
              <label className="block text-xs font-black text-muted uppercase tracking-widest mb-3 drop-shadow-sm">Specific Topic Focus</label>
              <div className="relative group">
                  <select 
                    value={config.subtopic || 'All'} 
                    onChange={e => setConfig({...config, subtopic: e.target.value})} 
                    className="w-full bg-surface2/40 border border-border2/60 text-textMain font-bold rounded-xl p-4 text-sm outline-none focus:border-reeCyan focus:ring-2 focus:ring-reeCyan/20 transition-all cursor-pointer appearance-none shadow-sm hover:border-reeCyan/40"
                  >
                    <option value="All" className="bg-surface text-textMain">Comprehensive (All Subtopics)</option>
                    {(safeTOS[config.subject] || []).map(t => <option key={t} value={t} className="bg-surface text-textMain">{t}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted transition-transform group-hover:translate-y-0.5">▼</div>
              </div>
            </div>
          )}
        </div>

        {/* 🚀 SIMULATION VOLUME OR ENFORCED TIME */}
        {isCustom ? (
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-3">
                <label className="block text-xs font-black text-muted uppercase tracking-widest mb-3 drop-shadow-sm">Simulation Volume</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[10, 20, 50, 100].map(num => (
                        <button 
                            key={num}
                            onClick={() => setConfig({...config, count: num})}
                            className={`py-4 px-4 rounded-2xl border-2 text-[0.75rem] font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${config.count === num ? 'bg-reeBlue/10 border-reeBlue/60 text-reeBlue shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-[1.02]' : 'bg-surface2/30 border-border2/60 text-muted hover:border-reeBlue/40 hover:text-reeBlue hover:bg-surface3 hover:-translate-y-0.5'}`}
                        >
                            {num} Items
                        </button>
                    ))}
                </div>
            </div>
        ) : (
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-3 p-6 sm:p-8 bg-surface2/40 border border-border2/60 rounded-[1.5rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-inner">
                <div className="flex flex-col gap-1.5">
                    <span className="text-[0.65rem] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-reeAmber rounded-full animate-pulse"></span> Enforced Time Limit
                    </span>
                    <span className="text-sm text-muted2 font-medium">Standardized PRC board conditions are active.</span>
                </div>
                <span className="text-2xl sm:text-3xl font-black text-textMain tracking-widest bg-surface px-8 py-4 rounded-2xl border border-border2/50 shadow-md">
                    {isBlended ? '05:00:00' : (config.subject === 'EE' ? '06:00:00' : '04:00:00')}
                </span>
            </div>
        )}

        {/* 🚀 DATA SOURCE (CUSTOM ONLY) */}
        {isCustom && (
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-4">
                <label className="block text-xs font-black text-muted uppercase tracking-widest mb-3 drop-shadow-sm">Ingestion Source</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                        onClick={() => setConfig({...config, source: 'library'})} 
                        className={`p-5 rounded-2xl border-2 text-[0.8rem] font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 ${config.source === 'library' ? 'border-reeBlue/60 bg-reeBlue/10 text-reeBlue shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-[1.02]' : 'border-border2/60 bg-surface2/30 text-muted hover:border-reeBlue/40 hover:text-reeBlue hover:bg-surface3 hover:-translate-y-0.5'}`}
                    >
                        📚 Global Vault
                    </button>
                    <button 
                        onClick={() => setConfig({...config, source: 'ai'})} 
                        disabled={!isOnline} 
                        className={`p-5 rounded-2xl border-2 text-[0.8rem] font-black transition-all duration-300 flex items-center justify-center gap-3 ${config.source === 'ai' ? 'border-reePurple/60 bg-reePurple/10 text-reePurple shadow-[0_0_15px_rgba(139,92,246,0.15)] scale-[1.02]' : 'border-border2/60 bg-surface2/30 text-muted hover:border-reePurple/40 hover:text-reePurple hover:bg-surface3 hover:-translate-y-0.5'} ${!isOnline ? 'opacity-40 cursor-not-allowed grayscale hover:translate-y-0' : 'cursor-pointer'}`}
                    >
                        ✨ AI Matrix
                    </button>
                </div>
            </div>
        )}

        {/* 🚀 ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border2/50 mt-6">
            <button
                onClick={startSimulation}
                disabled={session?.loading}
                className="relative overflow-hidden flex-1 py-5 bg-reeBlue hover:bg-blue-500 text-white font-black rounded-2xl shadow-[0_4px_25px_rgba(59,130,246,0.35)] transition-all duration-300 hover:shadow-[0_6px_30px_rgba(59,130,246,0.5)] hover:-translate-y-1 flex justify-center items-center gap-3 text-sm tracking-widest uppercase cursor-pointer disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none group"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                {session?.loading && !engine?.isExporting ? <span className="telemetry-spinner !w-5 !h-5 border-white"></span> : '🚀'} INITIATE SIMULATION
            </button>
            <button
                onClick={engine?.exportOfflinePDF}
                disabled={session?.loading}
                className="flex-1 sm:max-w-[280px] py-5 bg-surface2/40 hover:bg-surface3 border-2 border-border2/60 text-textMain rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 cursor-pointer shadow-sm flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
            >
                {session?.loading && engine?.isExporting ? <span className="telemetry-spinner !w-4 !h-4 border-textMain"></span> : '📄'} COMPILE TO PDF
            </button>
        </div>

      </div>
    </div>
  );
}