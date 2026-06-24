// src/features/board-simulator/SimulatorConfig.jsx
import React from 'react';
import { useStore } from '../../store/useStore';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export default function SimulatorConfig({ config, setConfig, session, startSimulation, exportOfflinePDF, isExporting }) {
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
    <div className="max-w-4xl mx-auto flex flex-col gap-6 page-fade-in pt-6 pb-12 w-full z-0 relative">
      
      {/* 🚀 Unified Premium Container */}
      <div className="p-8 sm:p-12 bg-surface/90 backdrop-blur-2xl border border-border2/80 rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-500 relative overflow-hidden">
        
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-reeBlue/5 blur-[120px] rounded-full pointer-events-none"></div>

        {/* 🚀 Header */}
        <div className="mb-10 border-b border-border2/60 pb-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight drop-shadow-sm">Pre-Board Simulator</h2>
          <p className="text-sm text-gray-300 font-medium">Select your evaluation profile to configure the pressure chamber.</p>
        </div>

        {/* 🚀 Status Warnings */}
        {session?.error && (
            <div className="mb-8 p-5 bg-reeRed/20 border-l-4 border-reeRed text-white text-sm rounded-xl font-bold animate-in zoom-in shadow-sm relative z-10">
                {session.error}
            </div>
        )}
        
        {engine?.hasSavedSession && (
            <div className="mb-10 p-6 bg-surface2 border-2 border-reeAmber/50 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 shadow-[0_0_20px_rgba(245,158,11,0.1)] animate-in fade-in slide-in-from-top-4 relative z-10">
                <div>
                    <h4 className="text-xs font-black text-reeAmber tracking-widest uppercase mb-2 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-reeAmber animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.8)]"></span> Unfinished Matrix Detected
                    </h4>
                    <p className="text-sm text-gray-200 font-medium">You have a cached mock board in progress.</p>
                </div>
                <button 
                    onClick={engine.resumeSimulation} 
                    className="px-8 py-4 bg-reeAmber hover:bg-amber-500 text-bg font-black rounded-xl text-xs uppercase tracking-widest shadow-[0_4px_15px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.4)] hover:-translate-y-1 active:scale-95 transition-all duration-300 w-full sm:w-auto flex justify-center cursor-pointer"
                >
                    Resume Matrix
                </button>
            </div>
        )}

        {/* 🚀 EVALUATION PROFILE (High Contrast Cards) */}
        <div className="mb-10 relative z-10">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 drop-shadow-sm">Evaluation Profile</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <button 
                    onClick={() => setProfile('custom')} 
                    className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1 active:scale-95 ${
                        isCustom 
                        ? 'bg-reeBlue/10 border-reeBlue text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                        : 'bg-surface2 border-border2/80 text-gray-300 hover:border-gray-400 hover:bg-surface3'
                    }`}
                >
                    <div className={`text-3xl mb-5 transition-transform duration-300 ${isCustom ? 'scale-110 drop-shadow-md' : 'opacity-70'}`}>⚙️</div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-widest mb-2 ${isCustom ? 'text-reeBlue' : 'text-gray-100'}`}>Custom Drill</h3>
                        <p className="text-xs text-gray-400 leading-relaxed font-medium">Adjustable item count and time limits for focused practice.</p>
                    </div>
                </button>
                
                <button 
                    onClick={() => setProfile('prc_subject')} 
                    className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1 active:scale-95 ${
                        isPrcSubject 
                        ? 'bg-reeAmber/10 border-reeAmber text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                        : 'bg-surface2 border-border2/80 text-gray-300 hover:border-gray-400 hover:bg-surface3'
                    }`}
                >
                    <div className={`text-3xl mb-5 transition-transform duration-300 ${isPrcSubject ? 'scale-110 drop-shadow-md' : 'opacity-70'}`}>🏛️</div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-widest mb-2 ${isPrcSubject ? 'text-reeAmber' : 'text-gray-100'}`}>PRC Standard</h3>
                        <p className="text-xs text-gray-400 leading-relaxed font-medium">Strict 100 items. Locked 4 or 6 hour limit depending on subject.</p>
                    </div>
                </button>

                <button 
                    onClick={() => setProfile('prc_blended')} 
                    className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1 active:scale-95 ${
                        isBlended 
                        ? 'bg-reePurple/10 border-reePurple text-white shadow-[0_0_20px_rgba(139,92,246,0.2)]' 
                        : 'bg-surface2 border-border2/80 text-gray-300 hover:border-gray-400 hover:bg-surface3'
                    }`}
                >
                    <div className={`text-3xl mb-5 transition-transform duration-300 ${isBlended ? 'scale-110 drop-shadow-md' : 'opacity-70'}`}>⚖️</div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-widest mb-2 ${isBlended ? 'text-reePurple' : 'text-gray-100'}`}>Full Blended</h3>
                        <p className="text-xs text-gray-400 leading-relaxed font-medium">The ultimate test. 100 mixed items locked to 5 hours.</p>
                    </div>
                </button>
            </div>
        </div>

        {/* 🚀 TARGET DOMAIN & SUBTOPIC (Solid Background Selects) */}
        <div className="flex flex-col sm:flex-row gap-6 mb-10 animate-in fade-in slide-in-from-top-2 relative z-10">
          <div className="flex-1">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 drop-shadow-sm">Target Domain</label>
            <div className="relative group">
                <select 
                  disabled={isBlended} 
                  value={config.subject} 
                  onChange={e => setConfig({...config, subject: e.target.value, subtopic: safeTOS[e.target.value]?.[0] || 'All'})} 
                  className="w-full bg-surface2 border-2 border-border2/80 text-white font-bold rounded-2xl p-5 text-sm outline-none focus:border-reeBlue transition-all cursor-pointer appearance-none shadow-sm hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {Object.keys(safeTOS).map(s => <option key={s} value={s} className="bg-surface text-white">{s === 'EE' ? 'Electrical Engineering (EE)' : s}</option>)}
                  {isBlended && <option value="blended" className="bg-surface text-white">Blended Matrix</option>}
                </select>
                {!isBlended && <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 transition-transform group-hover:translate-y-0.5">▼</div>}
            </div>
          </div>

          {isCustom && config.subject && config.subject !== 'blended' && (
            <div className="flex-1 animate-in fade-in slide-in-from-left-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 drop-shadow-sm">Specific Topic Focus</label>
              <div className="relative group">
                  <select 
                    value={config.subtopic || 'All'} 
                    onChange={e => setConfig({...config, subtopic: e.target.value})} 
                    className="w-full bg-surface2 border-2 border-border2/80 text-white font-bold rounded-2xl p-5 text-sm outline-none focus:border-reeCyan transition-all cursor-pointer appearance-none shadow-sm hover:border-gray-400"
                  >
                    <option value="All" className="bg-surface text-white">Comprehensive (All Subtopics)</option>
                    {(safeTOS[config.subject] || []).map(t => <option key={t} value={t} className="bg-surface text-white">{t}</option>)}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 transition-transform group-hover:translate-y-0.5">▼</div>
              </div>
            </div>
          )}
        </div>

        {/* 🚀 SIMULATION VOLUME OR ENFORCED TIME */}
        {isCustom ? (
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-3 relative z-10">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 drop-shadow-sm">Simulation Volume</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[10, 20, 50, 100].map(num => (
                        <button 
                            key={num}
                            onClick={() => setConfig({...config, count: num})}
                            className={`py-4 px-4 rounded-2xl border-2 text-sm font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 hover:-translate-y-1 active:scale-95 ${
                                config.count === num 
                                ? 'bg-reeGreen/20 border-reeGreen text-white shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                                : 'bg-surface2 border-border2/80 text-gray-300 hover:border-gray-400 hover:bg-surface3'
                            }`}
                        >
                            {num} Items
                        </button>
                    ))}
                </div>
            </div>
        ) : (
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-3 p-8 bg-surface2 border-2 border-border2/80 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-sm relative z-10">
                <div className="flex flex-col gap-2">
                    <span className="text-[0.65rem] font-black text-reeAmber uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-reeAmber rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span> Enforced Time Limit
                    </span>
                    <span className="text-sm text-gray-300 font-medium">Standardized PRC board conditions are active.</span>
                </div>
                <span className="text-3xl sm:text-4xl font-black text-white tracking-widest bg-surface px-8 py-5 rounded-2xl border border-border2/50 shadow-inner">
                    {isBlended ? '05:00:00' : (config.subject === 'EE' ? '06:00:00' : '04:00:00')}
                </span>
            </div>
        )}

        {/* 🚀 DATA SOURCE (CUSTOM ONLY) */}
        {isCustom && (
            <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 relative z-10">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 drop-shadow-sm">Ingestion Source</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <button 
                        onClick={() => setConfig({...config, source: 'library'})} 
                        className={`p-6 rounded-2xl border-2 text-sm font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 hover:-translate-y-1 active:scale-95 ${
                            config.source === 'library' 
                            ? 'border-reeBlue bg-reeBlue/20 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                            : 'border-border2/80 bg-surface2 text-gray-300 hover:border-gray-400 hover:bg-surface3'
                        }`}
                    >
                        📚 Global Vault
                    </button>
                    <button 
                        onClick={() => setConfig({...config, source: 'ai'})} 
                        disabled={!isOnline} 
                        className={`p-6 rounded-2xl border-2 text-sm font-black transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 ${
                            config.source === 'ai' 
                            ? 'border-reePurple bg-reePurple/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:-translate-y-1' 
                            : 'border-border2/80 bg-surface2 text-gray-300 hover:border-gray-400 hover:bg-surface3 hover:-translate-y-1'
                        } ${!isOnline ? 'opacity-40 cursor-not-allowed grayscale hover:translate-y-0 active:scale-100' : 'cursor-pointer'}`}
                    >
                        ✨ AI Matrix
                    </button>
                </div>
            </div>
        )}

        {/* 🚀 ACTION BUTTONS (Clear Hierarchy & Strong Contrast) */}
        <div className="flex flex-col sm:flex-row gap-5 pt-8 border-t border-border2/60 mt-8 relative z-10">
            <button
                onClick={startSimulation}
                disabled={session?.loading}
                className="relative overflow-hidden flex-1 py-6 bg-reeBlue hover:bg-blue-600 text-white font-black rounded-2xl shadow-[0_4px_25px_rgba(59,130,246,0.4)] transition-all duration-300 hover:shadow-[0_6px_30px_rgba(59,130,246,0.6)] hover:-translate-y-1 active:scale-95 flex justify-center items-center gap-3 text-base tracking-widest uppercase cursor-pointer disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100 group"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                {session?.loading && !engine?.isExporting ? <span className="telemetry-spinner !w-6 !h-6 border-white"></span> : <span className="text-xl">🚀</span>} INITIATE SIMULATION
            </button>
            <button
                onClick={exportOfflinePDF}
                disabled={session?.loading || isExporting}
                className="flex-1 sm:max-w-[300px] py-6 bg-surface2 hover:bg-surface3 border-2 border-border2/80 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all duration-300 cursor-pointer shadow-sm flex items-center justify-center gap-3 hover:-translate-y-1 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100"
            >
                {isExporting ? <span className="telemetry-spinner !w-5 !h-5 border-white"></span> : <span className="text-xl">📄</span>} COMPILE TO PDF
            </button>
        </div>

      </div>
    </div>
  );
}