// src/components/MissionControl.jsx
import React, { useState, useEffect } from 'react';
import { updateCommandParameters } from '../services/dbQueries';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import FocusTrap from './FocusTrap';
import toast from 'react-hot-toast';

export default function MissionControl({ onExportPDF, isGeneratingPDF, onPurgeRequest }) {
  const { currentUser } = useAuth();
  
  // CRITICAL FIX: Extract stats and explicit reset action properly from the store
  const { stats, resetDailyQuotas } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  const [editDate, setEditDate] = useState(stats?.examDate || '2026-04-15');
  const [editGoal, setEditGoal] = useState(stats?.dailyTarget || 50);

  if (!stats) {
    return <div className="w-full h-32 animate-pulse bg-surface rounded-xl mb-6"></div>;
  }

  useEffect(() => {
    if (stats?.examDate) setEditDate(stats.examDate);
    if (stats?.dailyTarget) setEditGoal(stats.dailyTarget);
  }, [stats?.examDate, stats?.dailyTarget]);

  const targetDate = new Date(stats?.examDate || '2026-04-15');
  const today = new Date();
  const daysLeft = Math.max(0, Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24)));
  const streak = stats?.globalStreak || 0;

  const totalGoal = stats?.dailyTarget || 50;
  const mathGoal = Math.floor(totalGoal * 0.25);
  const esasGoal = Math.floor(totalGoal * 0.30);
  const eeGoal = totalGoal - mathGoal - esasGoal;

  // Extracted dynamically from stats object
  const currentMath = stats?.dailyMath || 0;
  const currentESAS = stats?.dailyESAS || 0;
  const currentEE = stats?.dailyEE || 0;
  const totalCompleted = currentMath + currentESAS + currentEE;

  const handleSaveConfig = async () => {
    try {
      if (currentUser?.uid) {
        await updateCommandParameters(currentUser.uid, {
          examDate: editDate,
          dailyTarget: Number(editGoal)
        });
        
        useStore.setState({ 
            stats: { ...stats, examDate: editDate, dailyTarget: Number(editGoal) } 
        });
        toast.success('Configuration saved.');
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Configuration write failure:", error);
      toast.error('Failed to save configuration.');
    }
  };

  const executeDailyReset = () => {
    resetDailyQuotas();
    toast.success("Today's quotas have been reset.");
    setShowResetModal(false);
  };

  return (
    <div className="w-full mb-2 relative animate-in fade-in">
      
      {/* UNIFIED HEADER BAR */}
      <div className="flex flex-wrap justify-between items-center mb-6 bg-surface2/40 border border-border2/60 px-4 py-3 rounded-xl gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-reeGreen animate-pulse shadow-[0_0_8px_#22c55e]"></span>
          <span className="text-[0.65rem] font-bold tracking-widest uppercase text-textMain">System Telemetry Online</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <button
                onClick={() => setIsEditing(!isEditing)}
                aria-label={isEditing ? 'Close command parameters' : 'Open command parameters'}
                className={`text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-sm cursor-pointer border ${isEditing ? 'bg-reeBlue/20 border-reeBlue/50 text-reeBlue' : 'bg-surface3 hover:bg-surface3/80 border-border2 text-textMain'}`}
            >
                ⚙️ Command Parameters
            </button>
            <button
                onClick={onExportPDF}
                disabled={isGeneratingPDF}
                className="text-[0.65rem] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-md cursor-pointer bg-gradient-to-r from-reeBlue to-reeCyan hover:from-blue-600 hover:to-cyan-500 text-bg disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isGeneratingPDF ? <><span className="telemetry-spinner !w-3 !h-3 border-bg border-t-transparent"></span> Rendering...</> : '📄 Export PDF'}
            </button>
        </div>
      </div>

      {/* COMMAND PARAMETERS DROPDOWN */}
      {isEditing && (
        <div className="p-6 bg-surface border border-reeBlue/40 rounded-xl mb-6 flex flex-col gap-6 animate-in slide-in-from-top-4 shadow-xl relative z-10">
          <div className="flex flex-wrap gap-6">
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted mb-2">Target Board Date</label>
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="bg-bg border border-border2 text-textMain p-2.5 rounded-md text-sm outline-none focus:border-reeBlue transition-colors cursor-pointer" />
            </div>
            <div>
              <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted mb-2">Total Daily Quota Target</label>
              <input type="number" min="10" max="500" value={editGoal} onChange={(e) => setEditGoal(e.target.value)} className="bg-bg border border-border2 text-textMain p-2.5 rounded-md text-sm outline-none focus:border-reeBlue w-32 transition-colors" />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-border2">
            <div className="flex gap-3">
              <button onClick={() => setShowResetModal(true)} className="px-4 py-2 bg-bg border border-border2 hover:border-reeAmber/50 hover:bg-reeAmber/10 text-muted hover:text-reeAmber rounded-md text-xs font-bold transition-all cursor-pointer uppercase tracking-wider">
                ↺ Reset Today's Quota
              </button>
              
              {/* TRIGGER MASTER PURGE MODAL */}
              <button onClick={onPurgeRequest} className="px-4 py-2 bg-bg border border-border2 hover:border-reeRed/50 hover:bg-reeRed/10 text-muted hover:text-reeRed rounded-md text-xs font-bold transition-all cursor-pointer uppercase tracking-wider">
                ⚠ Purge All Analytics
              </button>
            </div>
            <button onClick={handleSaveConfig} className="px-6 py-2.5 bg-reeBlue hover:bg-reeBlue2 text-white font-bold rounded-md text-xs transition-colors cursor-pointer uppercase tracking-wider shadow-md">
              Deploy Overrides
            </button>
          </div>
        </div>
      )}

      {/* CORE TOP ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Countdown */}
        <div className="p-6 bg-surface border border-border2 rounded-xl flex flex-col justify-between shadow-sm hover:border-reeBlue/20 transition-colors">
          <div>
            <div className="text-[0.65rem] font-bold text-muted uppercase tracking-widest mb-2 flex items-center gap-2"><span>📅</span> PRC Board Countdown</div>
            <div className="text-4xl font-black text-textMain tracking-tighter">{daysLeft} <span className="text-sm font-normal text-muted2 tracking-normal">Days</span></div>
            <div className="text-xs text-reeBlue mt-1 font-mono">{targetDate.toLocaleDateString()}</div>
          </div>
          <div className="mt-6 pt-5 border-t border-border2">
            <div className="text-[0.65rem] font-bold text-muted uppercase tracking-widest mb-2 flex items-center gap-2"><span>🔥</span> Operational Streak</div>
            <div className="text-2xl font-black text-reeGreen tracking-tighter">{streak} <span className="text-sm font-normal text-muted2 tracking-normal">Days</span></div>
          </div>
        </div>

        {/* Daily Quotas Tracker */}
        <div className="p-6 bg-surface border border-border2 rounded-xl lg:col-span-2 shadow-sm flex flex-col hover:border-reeBlue/20 transition-colors">
          <div className="flex justify-between items-end mb-6 border-b border-border2 pb-4">
            <div>
              <h3 className="text-base font-bold text-textMain flex items-center gap-2">⚔️ Daily Structural Quotas</h3>
              <p className="text-[0.65rem] text-muted2 mt-1 uppercase tracking-widest">Weighted to match actual board exam distribution</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-textMain leading-none">{totalCompleted}</div>
              <div className="text-xs font-bold text-muted2 uppercase tracking-widest mt-1">/ {totalGoal} Total</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1">
            <div className="bg-bg border border-border2 rounded-xl p-4 flex flex-col justify-center hover:border-reeCyan/30 transition-colors">
              <div className="text-[0.65rem] font-bold text-reeCyan uppercase flex justify-between tracking-widest mb-3 gap-2"><span className="truncate">Mathematics</span><span className="shrink-0">{currentMath} / {mathGoal}</span></div>
              <div className="w-full h-2 bg-surface3 rounded-full overflow-hidden">
                <div className="h-full bg-reeCyan transition-all duration-700 ease-out shadow-[0_0_8px_rgba(6,182,212,0.6)]" style={{ width: `${Math.min((currentMath / mathGoal) * 100, 100)}%` }}></div>
              </div>
            </div>
            <div className="bg-bg border border-border2 rounded-xl p-4 flex flex-col justify-center hover:border-reeAmber/30 transition-colors">
              <div className="text-[0.65rem] font-bold text-reeAmber uppercase flex justify-between tracking-widest mb-3 gap-2"><span className="truncate">ESAS</span><span className="shrink-0">{currentESAS} / {esasGoal}</span></div>
              <div className="w-full h-2 bg-surface3 rounded-full overflow-hidden">
                <div className="h-full bg-reeAmber transition-all duration-700 ease-out shadow-[0_0_8px_rgba(245,158,11,0.6)]" style={{ width: `${Math.min((currentESAS / esasGoal) * 100, 100)}%` }}></div>
              </div>
            </div>
            <div className="bg-bg border border-border2 rounded-xl p-4 flex flex-col justify-center hover:border-reePurple/30 transition-colors">
              <div className="text-[0.65rem] font-bold text-reePurple uppercase flex justify-between tracking-widest mb-3 gap-2"><span className="truncate">EE Professional</span><span className="shrink-0">{currentEE} / {eeGoal}</span></div>
              <div className="w-full h-2 bg-surface3 rounded-full overflow-hidden">
                <div className="h-full bg-reePurple transition-all duration-700 ease-out shadow-[0_0_8px_rgba(139,92,246,0.6)]" style={{ width: `${Math.min((currentEE / eeGoal) * 100, 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={showResetModal}>
            <div className="bg-surface border border-border2 p-6 rounded-2xl shadow-2xl max-w-sm w-full">
              <h3 className="text-lg font-black text-reeAmber mb-2 flex items-center gap-2"><span>↺</span> Reset Daily Quotas?</h3>
              <p className="text-sm text-muted2 mb-6 leading-relaxed">This will revert today's Math, ESAS, and EE volumes back to 0. Your overall streak and deep analytics will remain unaffected.</p>
              <div className="flex justify-end gap-3">
                <button data-close-modal onClick={() => setShowResetModal(false)} className="px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  Cancel
                </button>
                <button onClick={executeDailyReset} className="px-4 py-2 bg-reeAmber hover:bg-yellow-600 text-bg rounded-lg text-xs font-black uppercase tracking-wider shadow-md transition-colors cursor-pointer">
                  Reset Quotas
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}