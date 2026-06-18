// src/features/board-simulator/SimulatorConfig.jsx
import React from 'react';
import { useStore } from '../../store/useStore';

export default function SimulatorConfig({ config, setConfig, session, startSimulation, engine }) {
  const { dynamicTOS } = useStore();
  const safeTOS = dynamicTOS || {};

  const isCustom = config.mode === 'subject' && !config.isPrcStandard;
  const isPrcSubject = config.mode === 'subject' && config.isPrcStandard;
  const isBlended = config.mode === 'blended';

  const setProfile = (profile) => {
    // 🚀 FIXED: Explicitly overwriting the 'count' state to prevent the 20-item lock bug.
    if (profile === 'custom') {
        setConfig({ ...config, mode: 'subject', isPrcStandard: false, count: 50 });
    }
    if (profile === 'prc_subject') {
        setConfig({ ...config, mode: 'subject', isPrcStandard: true, count: 100 });
    }
    if (profile === 'prc_blended') {
        setConfig({ ...config, mode: 'blended', isPrcStandard: true, count: 100, subject: 'blended' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 page-fade-in pt-6 pb-12 w-full">
      <div className="p-6 md:p-8 bg-surface border border-border2 rounded-2xl shadow-xl">
        <div className="mb-6 border-b border-border2 pb-4">
          <h2 className="text-2xl font-black text-textMain tracking-tight">Pre-Board Simulator</h2>
          <p className="text-sm text-muted2 mt-1">Select your evaluation profile to configure the chamber.</p>
        </div>

        {session?.error && <div className="mb-6 p-3 bg-reeRed/10 border border-reeRed/30 text-reeRed text-sm rounded-lg font-bold">{session.error}</div>}
        
        {engine?.hasSavedSession && (
            <div className="mb-6 p-4 bg-reeAmber/10 border border-reeAmber/30 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse shadow-inner">
                <div>
                    <h4 className="text-sm font-bold text-reeAmber tracking-widest uppercase">⚠️ Unfinished Session Detected</h4>
                    <p className="text-xs text-muted mt-1">You have a cached mock board in progress.</p>
                </div>
                <button onClick={engine.resumeSimulation} className="px-6 py-2.5 bg-reeAmber hover:bg-amber-600 text-bg font-black rounded-lg text-xs uppercase tracking-wider cursor-pointer transition-colors w-full sm:w-auto">
                    Resume Matrix
                </button>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <button onClick={() => setProfile('custom')} className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${isCustom ? 'bg-reeBlue/10 border-reeBlue shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-bg border-border2 hover:border-reeBlue/50 opacity-70 hover:opacity-100'}`}>
                <div className={`text-xl mb-2 ${isCustom ? 'text-reeBlue' : 'text-muted'}`}>⚙️</div>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-1 ${isCustom ? 'text-reeBlue' : 'text-textMain'}`}>Custom Drill</h3>
                <p className="text-[0.65rem] text-muted2 leading-relaxed">Adjustable item count and time limits for focused subject practice.</p>
            </button>
            
            <button onClick={() => setProfile('prc_subject')} className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${isPrcSubject ? 'bg-reeAmber/10 border-reeAmber shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-bg border-border2 hover:border-reeAmber/50 opacity-70 hover:opacity-100'}`}>
                <div className={`text-xl mb-2 ${isPrcSubject ? 'text-reeAmber' : 'text-muted'}`}>🏛️</div>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-1 ${isPrcSubject ? 'text-reeAmber' : 'text-textMain'}`}>PRC Standard</h3>
                <p className="text-[0.65rem] text-muted2 leading-relaxed">Strict 100 items. Locked 4 or 6 hour limit depending on the subject.</p>
            </button>

            <button onClick={() => setProfile('prc_blended')} className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${isBlended ? 'bg-reePurple/10 border-reePurple shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'bg-bg border-border2 hover:border-reePurple/50 opacity-70 hover:opacity-100'}`}>
                <div className={`text-xl mb-2 ${isBlended ? 'text-reePurple' : 'text-muted'}`}>⚖️</div>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-1 ${isBlended ? 'text-reePurple' : 'text-textMain'}`}>Full Blended</h3>
                <p className="text-[0.65rem] text-muted2 leading-relaxed">The ultimate test. 100 mixed items (Math, ESAS, EE) locked to 5 hours.</p>
            </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 p-6 bg-surface2/50 border border-border2 rounded-xl">
          <div className="flex flex-col gap-2">
            <label className="text-[0.65rem] font-bold text-muted uppercase tracking-wider">Target Domain</label>
            <select disabled={isBlended} value={config.subject} onChange={e => setConfig({...config, subject: e.target.value, subtopic: 'All'})} className="w-full bg-bg border border-border2 p-3 rounded-lg text-sm font-bold text-textMain outline-none focus:border-reeBlue cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {Object.keys(safeTOS).map(s => <option key={s} value={s}>{s === 'EE' ? 'Electrical Engineering (EE)' : s}</option>)}
              {isBlended && <option value="blended">Blended Matrix</option>}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[0.65rem] font-bold text-muted uppercase tracking-wider">Data Source</label>
            <select value={config.source} onChange={e => setConfig({...config, source: e.target.value})} className="w-full bg-bg border border-border2 p-3 rounded-lg text-sm font-bold text-textMain outline-none focus:border-reeBlue cursor-pointer">
              <option value="library">Global Vault (Curated)</option>
              <option value="ai">AI Dynamic Generation</option>
            </select>
          </div>

          {isCustom && config.subject && config.subject !== 'blended' && (
            <div className="flex flex-col gap-2 sm:col-span-2 animate-in fade-in">
              <label className="text-[0.65rem] font-bold text-muted uppercase tracking-wider">Specific Topic Focus</label>
              <select value={config.subtopic || 'All'} onChange={e => setConfig({...config, subtopic: e.target.value})} className="w-full bg-bg border border-border2 p-3 rounded-lg text-sm font-bold text-textMain outline-none focus:border-reeBlue cursor-pointer">
                <option value="All">Comprehensive (All Subtopics)</option>
                {(safeTOS[config.subject] || []).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {isCustom ? (
            <div className="flex flex-col gap-2 sm:col-span-2 mt-2">
              <label className="text-[0.65rem] font-bold text-muted uppercase tracking-wider">Volume Parameter</label>
              <select disabled={config.isPrcStandard} value={config.count} onChange={e => setConfig({...config, count: Number(e.target.value)})} className="w-full bg-bg border border-border2 p-3 rounded-lg text-sm font-bold text-textMain outline-none focus:border-reeBlue cursor-pointer disabled:opacity-50">
                <option value={10}>10 Items (Quick Drill)</option>
                <option value={20}>20 Items (Standard Session)</option>
                <option value={50}>50 Items (Extended Drill)</option>
                <option value={100}>100 Items (Full Mock)</option>
              </select>
            </div>
          ) : (
            <div className="sm:col-span-2 p-3 bg-bg border border-border2 rounded-lg flex items-center justify-between">
              <span className="text-[0.65rem] text-muted font-bold uppercase tracking-widest">Enforced Time Limit</span>
              <span className="text-sm font-black text-textMain tracking-widest">
                  {isBlended ? '5:00:00' : (config.subject === 'EE' ? '6:00:00' : '4:00:00')}
              </span>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-4 pt-6 border-t border-border2">
            <button
                onClick={startSimulation}
                disabled={session?.loading}
                className="px-8 py-4 bg-reeBlue hover:bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-colors cursor-pointer flex items-center justify-center gap-2 flex-1 disabled:opacity-50"
            >
                {session?.loading && !engine?.isExporting ? <span className="telemetry-spinner !w-4 !h-4 border-white border-t-transparent"></span> : '🚀'}
                INITIATE SIMULATION
            </button>
            <button
                onClick={engine?.exportOfflinePDF}
                disabled={session?.loading}
                className="px-6 py-4 bg-surface2 hover:bg-surface3 border border-border2 text-textMain rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer shadow-sm flex-1 md:max-w-[250px] disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {session?.loading && engine?.isExporting ? <span className="telemetry-spinner !w-4 !h-4 border-textMain border-t-transparent"></span> : '📄'}
                Compile to PDF
            </button>
        </div>
      </div>
    </div>
  );
}