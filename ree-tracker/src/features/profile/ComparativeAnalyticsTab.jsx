// src/features/profile/ComparativeAnalyticsTab.jsx
import React, { useState, useEffect } from 'react';
import { fetchGlobalLeaderboard, fetchSimulationLedger, fetchLeaderboardMe } from '../../services/dbQueries';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import ActivityCalendar from './ActivityCalendar';

export default function ComparativeAnalyticsTab({ currentUser, stats }) {
  const isOnline = useNetworkStatus();
  const [rank, setRank] = useState(null); // null = loading/unranked; number = real rank
  const [isUnranked, setIsUnranked] = useState(false);
  const [totalAgents, setTotalAgents] = useState(0);
  const [onlineAgentsList, setOnlineAgentsList] = useState([]);
  const [simulationCount, setSimulationCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadAnalytics = async () => {
      try {
        const [board, me] = await Promise.all([
          fetchGlobalLeaderboard(100),
          fetchLeaderboardMe(),
        ]);
        if (!isMounted) return;

        // Prefer authoritative /me count when the leaderboard page doesn't include the user
        const totalFromMe = typeof me?.total === 'number' && me.total > 0 ? me.total : (board?.length || 0);
        setTotalAgents(totalFromMe);

        const indexInBoard = (board || []).findIndex(agent => agent.uid === currentUser.uid);
        if (indexInBoard !== -1) {
          setRank(indexInBoard + 1);
          setIsUnranked(false);
        } else if (typeof me?.rank === 'number' && me.rank > 0) {
          setRank(me.rank);
          setIsUnranked(false);
        } else {
          setRank(null);
          setIsUnranked(true);
        }

        const now = Date.now();
        const online = (board || []).filter(agent => {
            if (!agent.lastActive) return false;
            const lastActiveTime = new Date(agent.lastActive).getTime();
            return (now - lastActiveTime) < 15 * 60 * 1000;
        });
        setOnlineAgentsList(online);

        const history = await fetchSimulationLedger(currentUser.uid, 1000);
        if (isMounted) setSimulationCount(history?.length || 0);

      } catch (err) {
        console.error("Failed to fetch comparative data.", err);
      }
    };

    if (currentUser) loadAnalytics();
    return () => { isMounted = false; };
  }, [currentUser]);

  // --- DYNAMIC ALL-MILESTONES ENGINE ---
  const ALL_MILESTONES = [
    { id: 'initiate', icon: '🎓', name: 'Initiate', desc: 'First Mock Complete', condition: simulationCount >= 1, color: 'text-reeCyan bg-reeCyan/10 border-reeCyan/30' },
    { id: 'veteran', icon: '⚡', name: 'Veteran', desc: '10 Mocks Complete', condition: simulationCount >= 10, color: 'text-reePurple bg-reePurple/10 border-reePurple/30' },
    { id: 'relentless', icon: '🔥', name: 'Relentless', desc: '7-Day Active Streak', condition: stats?.globalStreak >= 7, color: 'text-reeAmber bg-reeAmber/10 border-reeAmber/30' },
    { id: 'ironclad', icon: '🛡️', name: 'Ironclad', desc: '30-Day Active Streak', condition: stats?.globalStreak >= 30, color: 'text-reeBlue bg-reeBlue/10 border-reeBlue/30' },
    { id: 'elite', icon: '🧠', name: 'Elite Mastery', desc: 'High Theta (≥ 2.0)', condition: stats?.irt?.theta >= 2.0, color: 'text-reeGreen bg-reeGreen/10 border-reeGreen/30' }
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
      
      {/* Top Section: Split Grid (Left: Ranking, Right: Stacked Stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Global Matrix Ranking */}
        <div className="p-6 bg-surface border border-border2 rounded-xl shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden h-full min-h-[300px]">
          <div className="absolute top-0 left-0 w-32 h-32 bg-reeCyan/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
          <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-6 z-10">Global Matrix Ranking</h3>
          <div className="relative w-56 h-56 flex items-center justify-center z-10">
            <svg className="w-full h-full -rotate-90 transform drop-shadow-md" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-light)" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-reeCyan)" strokeWidth="8" strokeDasharray={typeof rank === 'number' && totalAgents > 0 ? `${((totalAgents - rank + 1) / totalAgents) * 282.7} 282.7` : '0 282.7'} className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute flex flex-col items-center px-4 text-center">
              {typeof rank === 'number' ? (
                <>
                  <span className="text-6xl font-black text-reeCyan">#{rank}</span>
                  <span className="text-[11px] text-muted font-mono uppercase mt-2">Out of {totalAgents || 1} Agent{totalAgents === 1 ? '' : 's'}</span>
                </>
              ) : !isOnline ? (
                <>
                  <span className="text-2xl font-black text-reeCyan leading-tight">Offline</span>
                  <span className="text-[11px] text-muted font-mono uppercase mt-3 max-w-[180px]">
                    Reconnect to see your global ranking
                  </span>
                </>
              ) : isUnranked ? (
                <>
                  <span className="text-2xl font-black text-reeCyan leading-tight">Unranked</span>
                  <span className="text-[11px] text-muted font-mono uppercase mt-3 max-w-[180px]">
                    Answer a few questions to enter the leaderboard
                  </span>
                  {totalAgents > 0 && (
                    <span className="text-[11px] text-muted2 font-mono mt-2">{totalAgents} active agent{totalAgents === 1 ? '' : 's'}</span>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted font-mono uppercase animate-pulse">Syncing rank…</span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted2 mt-8 uppercase tracking-wider z-10">Ranked by calculated IRT Theta proficiency scores.</p>
        </div>

        {/* Right Column: Stacked Statistics */}
        <div className="flex flex-col gap-4">
          <div className="p-6 bg-surface border border-border2 rounded-xl shadow-sm flex flex-col justify-center flex-1 relative overflow-hidden group hover:border-reeAmber/30 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-reeAmber/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
            <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Global Active Streak</h3>
            <div className="text-4xl font-black text-reeAmber my-2 flex items-center gap-3">
              🔥 {stats?.globalStreak || 0} <span className="text-sm text-muted uppercase font-bold tracking-widest mt-2">Days</span>
            </div>
          </div>
          
          <div className="p-6 bg-surface border border-border2 rounded-xl shadow-sm flex flex-col justify-center flex-1 relative overflow-hidden group hover:border-reePurple/30 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-reePurple/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
            <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Lifetime Simulations</h3>
            <div className="text-4xl font-black text-reePurple my-2 flex items-center gap-3">
              ⚡ {simulationCount} <span className="text-sm text-muted uppercase font-bold tracking-widest mt-2">Mocks</span>
            </div>
          </div>

          <div className="p-6 bg-surface border border-border2 rounded-xl shadow-sm flex flex-col flex-1 relative overflow-hidden group hover:border-reeGreen/30 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-reeGreen/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-widest">Active Network Agents</h3>
                  <span className="text-xs font-black text-reeGreen flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-reeGreen animate-pulse"></span> {onlineAgentsList.length} Online
                  </span>
              </div>
              <div className="flex flex-wrap gap-2 overflow-y-auto max-h-24 custom-scrollbar pr-2 relative z-10">
                  {onlineAgentsList.length > 0 ? onlineAgentsList.map((agent, i) => (
                      <span key={i} className="text-[11px] font-bold uppercase tracking-widest bg-reeGreen/10 text-reeGreen border border-reeGreen/20 px-2 py-1 rounded-md shadow-sm">
                          {agent.displayName || 'Agent'}
                      </span>
                  )) : (
                      <span className="text-xs font-mono text-muted">{isOnline ? 'No other agents detected.' : 'Offline — reconnect to see active agents.'}</span>
                  )}
              </div>
          </div>
        </div>

      </div>

      {/* Middle Section: Full-Width Monthly Calendar Heatmap with explicitly set minHeight */}
      <div className="w-full min-h-[250px]">
        <ActivityCalendar activityCalendar={stats?.activityCalendar || {}} targetQuota={50} />
      </div>

      {/* Bottom Section: Operational Milestones (Locked & Unlocked) */}
      <div className="p-6 bg-surface border border-border2 rounded-xl shadow-sm">
        <div className="flex justify-between items-end mb-6 border-b border-border2 pb-4">
          <div>
            <h3 className="text-lg font-black text-textMain flex items-center gap-2 tracking-tight">
              <span>🎖️</span> Operational Milestones
            </h3>
            <p className="text-sm text-muted mt-1 font-medium">Unlock badges by dominating the matrix.</p>
          </div>
          <span className="text-[11px] text-muted font-black uppercase tracking-widest bg-surface2 px-3 py-1.5 rounded-lg border border-border2">
            {ALL_MILESTONES.filter(m => m.condition).length} / {ALL_MILESTONES.length} UNLOCKED
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_MILESTONES.map((badge) => {
            const isUnlocked = badge.condition;
            return (
              <div key={badge.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isUnlocked ? `${badge.color} shadow-sm` : 'bg-surface2 border-border2 opacity-60 grayscale'}`}>
                <div className="text-3xl relative">
                   {badge.icon}
                   {!isUnlocked && <span className="absolute -bottom-1 -right-1 text-xs bg-bg rounded-full p-0.5 shadow">🔒</span>}
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-black uppercase tracking-wide ${isUnlocked ? 'text-inherit' : 'text-muted'}`}>{badge.name}</span>
                  <span className={`text-[11px] font-bold uppercase tracking-widest mt-0.5 ${isUnlocked ? 'opacity-80' : 'text-muted2'}`}>{badge.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}