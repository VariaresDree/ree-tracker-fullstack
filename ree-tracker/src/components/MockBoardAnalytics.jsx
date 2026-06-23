// src/components/MockBoardAnalytics.jsx
import React, { useState, useEffect } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { fetchSimulationLedger, deleteSimulationRecord } from '../services/dbQueries';
import FocusTrap from './FocusTrap';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonChart } from './SkeletonLoaders';

let CACHED_HISTORY = null;

export default function MockBoardAnalytics() {
  const { currentUser } = useAuth();
  const [history, setHistory] = useState(CACHED_HISTORY || []);
  const [loading, setLoading] = useState(!CACHED_HISTORY);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });

  const loadHistory = async (forceSync = false) => {
    if (!currentUser?.uid) return;
    if (!forceSync && CACHED_HISTORY) {
      setHistory(CACHED_HISTORY);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let data = await fetchSimulationLedger(currentUser.uid, 20);
      CACHED_HISTORY = data;
      setHistory(data);
      if(forceSync) toast.success('Telemetry synced.');
    } catch (error) {
      console.error("Fetch failed:", error);
      toast.error('Failed to sync telemetry.');
    }
    setLoading(false);
  };


  useEffect(() => {
    loadHistory();
  }, [currentUser]);

  const requestDelete = (id, name) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    const { id, name } = deleteModal;
    try {
      await deleteSimulationRecord(currentUser.uid, id);
      const updated = history.filter(h => h.id !== id);
      CACHED_HISTORY = updated;
      setHistory(updated);
      toast.success(`Purged record "${name}".`);
    } catch (error) {
      toast.error(error.message || 'Purge failed.');
    } finally {
      setDeleteModal({ isOpen: false, id: null, name: '' });
    }
  };

  const chartData = [...history].reverse().map((run, index) => ({
    name: `Run ${index + 1}`,
    date: new Date(run.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overall: run.score,
    math: run.subjectScores?.Math || null,
    esas: run.subjectScores?.ESAS || null,
    ee: run.subjectScores?.EE || null,
    verdict: run.verdict,
    config: run.config
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface/95 backdrop-blur-md border border-border2 p-4 rounded-lg shadow-xl font-mono text-xs z-50">
          <p className="font-bold text-textMain mb-2 border-b border-border2 pb-2">
            {data.name} <span className="text-muted font-normal ml-2">{data.date}</span>
          </p>
          <p className={`font-black mb-1 ${data.overall >= 70 ? 'text-reeGreen' : 'text-reeRed'}`}>
            Overall Score: {data.overall}%
          </p>
          {data.math && <p className="text-reeCyan">Math: {data.math}%</p>}
          {data.esas && <p className="text-reePurple">ESAS: {data.esas}%</p>}
          {data.ee && <p className="text-reeAmber">EE: {data.ee}%</p>}
          <p className="text-muted2 mt-2 pt-2 border-t border-border2/50 uppercase tracking-widest text-[0.6rem]">
            Mode: {data.config?.mode} | Items: {data.config?.count || 100}
          </p>
        </div>
      );
    }
    return null;
  };

  const totalRuns = history.length;
  const avgScore = totalRuns > 0 ? Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / totalRuns) : 0;
  const passCount = history.filter(h => h.verdict === 'PASSED' || h.verdict === 'CONDITIONAL PASS').length;
  const passRate = totalRuns > 0 ? Math.round((passCount / totalRuns) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 mt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-black text-textMain tracking-tight">Pre-Board Trajectory Matrix</h2>
          <p className="text-sm text-muted2 mt-1">Simulator diagnostic ledger and readiness analytics</p>
        </div>
        <div className="flex gap-2">
<button onClick={() => loadHistory(true)} className="px-4 py-2.5 bg-surface2 hover:bg-surface3 border border-border2 rounded-lg text-xs font-bold text-textMain transition-colors cursor-pointer flex items-center gap-2">
            <span>🔄</span> Sync Telemetry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card hover-glow p-6 bg-surface border border-border2 rounded-xl shadow-md flex flex-col justify-center items-center text-center">
          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-muted mb-2">Simulations Completed</div>
          <div className="text-4xl font-black text-reeBlue">{totalRuns}</div>
        </div>
        <div className="glass-card hover-glow p-6 bg-surface border border-border2 rounded-xl shadow-md flex flex-col justify-center items-center text-center">
          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-muted mb-2">Average Hit Rate</div>
          <div className={`text-4xl font-black ${avgScore >= 70 ? 'text-reeGreen' : 'text-reeAmber'}`}>{avgScore}%</div>
        </div>
        <div className="glass-card hover-glow p-6 bg-surface border border-border2 rounded-xl shadow-md flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-1 ${passRate >= 70 ? 'bg-reeGreen' : 'bg-reeRed'}`}></div>
          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-muted mb-2">Pass Probability</div>
          <div className={`text-4xl font-black ${passRate >= 70 ? 'text-reeGreen' : 'text-reeRed'}`}>{passRate}%</div>
        </div>
      </div>

      <div className="p-6 bg-surface border border-border2 rounded-xl shadow-md">
        <h3 className="text-sm font-bold uppercase tracking-widest text-textMain mb-6 flex items-center gap-2">
          <span>📈</span> Readiness Trajectory Plot
        </h3>
        {loading ? (
          <div className="h-[350px] flex items-center justify-center"><SkeletonChart /></div>
        ) : chartData.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center text-muted font-mono text-xs border-2 border-dashed border-border2 rounded-xl">
            No simulation data found. Complete a Mock Board to generate telemetry.
          </div>
        ) : (
          <div className="h-[350px] w-full min-w-0 relative">
            <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} iconType="circle" />
                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} label={{ position: 'insideTopRight', value: '70% PRC THRESHOLD', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                    <Bar dataKey="overall" name="Overall Score" barSize={40} radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.overall >= 70 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'} />
                    ))}
                    </Bar>
                    <Line type="monotone" dataKey="math" name="Math Track" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls />
                    <Line type="monotone" dataKey="esas" name="ESAS Track" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls />
                    <Line type="monotone" dataKey="ee" name="EE Track" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls />
                </ComposedChart>
                </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* FULLY BOXED LEDGER REDESIGN */}
      <div className="p-6 bg-surface border border-border2 rounded-xl shadow-md">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border2/50">
           <h3 className="text-sm font-bold uppercase tracking-widest text-textMain flex items-center gap-2">
             <span>🗄️</span> Simulation Ledger
           </h3>
           <span className="text-[0.65rem] text-muted font-bold uppercase tracking-widest bg-surface2 px-3 py-1 rounded-full">{history.length} Records</span>
        </div>
        
        {loading ? (
          <div className="py-8"><SkeletonChart /></div>
        ) : history.length === 0 ? (
          <div className="text-xs text-center text-muted py-8 font-mono border border-dashed border-border2 rounded-xl">Ledger is currently empty.</div>
        ) : (
          <div className="stagger-fade-in flex flex-col gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-3 pl-1 pb-2">
            {history.map((run, idx) => (
              <div key={run.id} className="p-5 bg-bg border border-border2 hover:border-reeBlue/40 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all group shadow-sm">
                
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-md text-[0.65rem] font-black tracking-widest uppercase border ${run.verdict === 'PASSED' ? 'bg-reeGreen/10 text-reeGreen border-reeGreen/30' : run.verdict === 'CONDITIONAL PASS' ? 'bg-reeAmber/10 text-reeAmber border-reeAmber/30' : 'bg-reeRed/10 text-reeRed border-reeRed/30'}`}>
                      {run.verdict}
                    </span>
                    <span className="text-sm font-black text-textMain">{run.score}% Overall</span>
                    <div className="h-4 w-px bg-border2 hidden md:block"></div>
                    <span className="text-xs text-muted font-medium ml-auto md:ml-0">
                      {new Date(run.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-textMain tracking-tight">
                        {run.isPrcStandard ? 'PRC Standard Simulation' : 'Custom Tactical Drill'}
                    </h4>
                    <p className="text-xs text-muted2 mt-1 font-medium flex flex-wrap items-center gap-2">
                        <span className="bg-surface2 px-2 py-0.5 rounded text-textMain capitalize border border-border2">{run.mode || run.config?.mode}</span>
                        <span>•</span>
                        <span>{run.targetSubject && run.targetSubject !== 'blended' ? run.targetSubject : 'Full Matrix'}</span>
                        <span>•</span>
                        <span>{run.totalQs || run.config?.count || 100} Items</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold mt-1">
                    {run.subjectScores?.Math && <span className="text-reeCyan bg-reeCyan/10 px-2.5 py-1 rounded-md border border-reeCyan/20">Math {run.subjectScores.Math}%</span>}
                    {run.subjectScores?.ESAS && <span className="text-reePurple bg-reePurple/10 px-2.5 py-1 rounded-md border border-reePurple/20">ESAS {run.subjectScores.ESAS}%</span>}
                    {run.subjectScores?.EE && <span className="text-reeAmber bg-reeAmber/10 px-2.5 py-1 rounded-md border border-reeAmber/20">EE {run.subjectScores.EE}%</span>}
                    {run.timeTaken && <span className="text-muted2 font-mono ml-2">⏱ {Math.floor(run.timeTaken/3600)}h {Math.floor((run.timeTaken%3600)/60)}m</span>}
                  </div>
                </div>

                <button
                  onClick={() => requestDelete(run.id, `Run ${idx + 1}`)}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-5 py-2.5 bg-surface2 text-muted hover:text-reeRed hover:bg-reeRed/10 border border-border2 hover:border-reeRed/20 rounded-lg transition-all text-xs font-bold shrink-0 w-full md:w-auto"
                >
                  Purge Record
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={deleteModal.isOpen}>
            <div className="modal-entrance bg-surface border border-border2 p-6 rounded-2xl shadow-2xl max-w-md w-full">
              <h3 className="text-lg font-black text-reeRed mb-2 flex items-center gap-2">
                <span>⚠️</span> Purge Simulation Record?
              </h3>
              <p className="text-sm text-muted2 mb-6 leading-relaxed">
                Are you sure you want to delete <strong className="text-textMain">"{deleteModal.name}"</strong> from the ledger? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button data-close-modal onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })} className="px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  Cancel
                </button>
                <button onClick={confirmDelete} className="px-4 py-2 bg-reeRed hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  Purge
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}