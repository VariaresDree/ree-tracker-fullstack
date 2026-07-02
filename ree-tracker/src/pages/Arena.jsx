// src/pages/Arena.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMultiplayerBattle, fetchPaginatedLeaderboard } from '../services/dbQueries';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import FocusTrap from '../components/FocusTrap';
import toast from 'react-hot-toast';

const GAUNTLET_TIERS = [
  { level: 1, name: 'Initiate Protocol', reqQs: 200, items: 50, timeLimit: 75 },
  { level: 2, name: 'Specialist Matrix', reqQs: 500, items: 75, timeLimit: 110 },
  { level: 3, name: 'Architect Core', reqQs: 1000, items: 100, timeLimit: 150 },
  { level: 4, name: 'Apex Agent', reqQs: 2000, items: 100, timeLimit: 120 }
];

export default function Arena() {
  const { currentUser } = useAuth();
  const { stats } = useStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('terminal'); 
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(null);

  const [hostConfig, setHostConfig] = useState({
    mode: 'custom', 
    subject: 'EE',
    count: 20,
    timeLimitMins: 30
  });

  useEffect(() => {
      const lockUntil = stats?.gauntletLockUntil;
      if (!lockUntil || lockUntil <= Date.now()) {
          setCooldownTimer(null);
          return;
      }

      const interval = setInterval(() => {
          const diff = lockUntil - Date.now();
          if (diff <= 0) {
              setCooldownTimer(null);
              clearInterval(interval);
          } else {
              const h = Math.floor(diff / (1000 * 60 * 60));
              const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const s = Math.floor((diff % (1000 * 60)) / 1000);
              setCooldownTimer(`${h}h ${m}m ${s}s`);
          }
      }, 1000);

      return () => clearInterval(interval);
  }, [stats?.gauntletLockUntil]);

  useEffect(() => {
    // SAFE FALLBACK: Checks if leaderboard exists before reading length
    if (activeTab === 'leaderboard' && (leaderboard || []).length === 0) {
        const loadInitialArena = async () => {
          setIsLoadingRankings(true);
          try {
            const { agents, lastDoc: newLastDoc } = await fetchPaginatedLeaderboard(20, null);
            setLeaderboard(agents || []);
            setLastDoc(newLastDoc);
            setHasMore((agents || []).length === 20);
          } catch (error) {
            toast.error("Failed to connect to the Global Matrix.");
          }
          setIsLoadingRankings(false);
        };
        loadInitialArena();
    }
  }, [activeTab, leaderboard]);

  const observer = useRef();
  const lastElementRef = useCallback(node => {
    if (isLoadingRankings || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(async entries => {
      if (entries[0].isIntersecting && hasMore) {
        setIsFetchingMore(true);
        try {
            const { agents, lastDoc: newLastDoc } = await fetchPaginatedLeaderboard(20, lastDoc);
            setLeaderboard(prev => [...(prev || []), ...(agents || [])]);
            setLastDoc(newLastDoc);
            setHasMore((agents || []).length === 20);
        } catch (error) {
            toast.error("Network disruption while fetching rankings.");
        }
        setIsFetchingMore(false);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoadingRankings, isFetchingMore, hasMore, lastDoc]);

  const handleJoinBattle = async (e) => {
      e.preventDefault();
      const code = inviteCode.trim().toUpperCase();
      if (code.length !== 6) return toast.error("Invite code must be exactly 6 characters.");

      setIsJoining(true);
      try {
          await fetchMultiplayerBattle(code);
          toast.success("Battle coordinates verified! Entering lobby...");
          navigate(`/battle/${code}`);
      } catch (error) {
          toast.error("Invalid or expired Battle Code.");
          setInviteCode(''); 
      }
      setIsJoining(false);
  };

  const initiateGauntlet = (level) => {
      if (cooldownTimer) {
          return toast.error("System locked. Await cooldown cycle.");
      }
      navigate(`/gauntlet/${level}`); 
  };

  const getRankBadge = (index) => {
    if (index === 0) return "bg-yellow-400/20 border-yellow-400 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]";
    if (index === 1) return "bg-gray-300/20 border-gray-300 text-gray-300 shadow-[0_0_15px_rgba(209,213,219,0.2)]";
    if (index === 2) return "bg-amber-700/20 border-amber-700 text-amber-700 shadow-[0_0_15px_rgba(180,83,9,0.2)]";
    return "bg-surface2 border-border2 text-muted";
  };

  const handleDeployLobby = async () => {
      const toastId = toast.loading("Deploying lobby code...");
      try {
          const { createMultiplayerBattle } = await import('../services/dbQueries');

          let finalTime = hostConfig.timeLimitMins;
          if (hostConfig.mode === 'blended') finalTime = 300;
          if (hostConfig.mode === 'prc') finalTime = hostConfig.subject === 'EE' ? 360 : 240;

          // Send only the pool SPEC — the server samples the questions itself
          // (a client-assembled pool would require shipping answer keys).
          const finalConfig = {
              mode: hostConfig.mode === 'blended' ? 'blended' : 'subject',
              subject: hostConfig.mode === 'blended' ? 'Blended' : hostConfig.subject,
              count: hostConfig.mode === 'prc' || hostConfig.mode === 'blended' ? 100 : hostConfig.count,
              timeLimitMins: finalTime,
              isPrcStandard: hostConfig.mode === 'prc' || hostConfig.mode === 'blended'
          };

          const battleId = await createMultiplayerBattle(finalConfig, finalTime * 60);

          toast.success("Lobby Successfully Created!", { id: toastId });
          setShowHostModal(false);
          navigate(`/battle/${battleId}`);
      } catch (error) {
          toast.error(error.message || "Failed to generate lobby.", { id: toastId });
      }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 page-fade-in pb-12 w-full pt-4">
      
      <div className="flex flex-wrap border-b border-border2 mt-2">
        <button 
          onClick={() => setActiveTab('terminal')} 
          className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === 'terminal' 
              ? 'text-reeRed border-b-2 border-reeRed bg-reeRed/5' 
              : 'text-muted hover:text-textMain hover:bg-surface2'
          }`}
        >
          ⚔️ Combat Terminal
        </button>
        <button 
          onClick={() => setActiveTab('gauntlet')} 
          className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === 'gauntlet' 
              ? 'text-reePurple border-b-2 border-reePurple bg-reePurple/5' 
              : 'text-muted hover:text-textMain hover:bg-surface2'
          }`}
        >
          🛡️ The Gauntlet
        </button>
        <button 
          onClick={() => setActiveTab('leaderboard')} 
          className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === 'leaderboard' 
              ? 'text-reeAmber border-b-2 border-reeAmber bg-reeAmber/5' 
              : 'text-muted hover:text-textMain hover:bg-surface2'
          }`}
        >
          🏆 Global Rankings
        </button>
      </div>

      {activeTab === 'terminal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
            
            <div className="p-6 md:p-8 bg-surface border border-reeRed/30 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[320px]">
                <div className="absolute top-0 right-0 w-48 h-48 bg-reeRed/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div>
                  <h3 className="text-xl font-black text-textMain uppercase tracking-widest flex items-center gap-2 mb-2 relative z-10">
                      <span className="text-reeRed">📥</span> Sync Inbound Coordinates
                  </h3>
                  <p className="text-xs text-muted2 mb-6 relative z-10 leading-relaxed">
                      Enter an active 6-digit multiplayer terminal code below to connect to a waiting room and compete concurrently with other reviewers.
                  </p>
                </div>

                <form onSubmit={handleJoinBattle} className="flex flex-col xl:flex-row gap-3 relative z-10 w-full mt-auto">
                    <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="ENTER LOBBY MATRIX CODE"
                        maxLength={6}
                        className="flex-1 w-full bg-bg border border-border2 text-textMain px-4 py-3.5 rounded-xl text-sm font-black tracking-[0.2em] outline-none focus:border-reeRed transition-colors shadow-inner uppercase placeholder:tracking-normal placeholder:font-bold placeholder:opacity-40"
                    />
                    <button
                        type="submit"
                        disabled={isJoining || inviteCode.length < 6}
                        className="w-full xl:w-auto shrink-0 px-8 py-3.5 bg-reeRed hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50 cursor-pointer flex justify-center items-center btn-press"
                    >
                        {isJoining ? <span className="telemetry-spinner !w-4 !h-4 border-white border-t-transparent"></span> : 'Establish Link'}
                    </button>
                </form>
            </div>

            <div className="p-6 md:p-8 bg-surface border border-border2 rounded-2xl shadow-sm flex flex-col justify-between min-h-[320px]">
                 <div>
                   <h3 className="text-xl font-black text-textMain uppercase tracking-widest flex items-center gap-2 mb-2">
                       <span className="text-reeBlue">📤</span> Deploy Outbound Lobby
                   </h3>
                   <p className="text-xs text-muted2 mb-6 leading-relaxed">
                      Initialize a structured multi-agent mock arena. Build custom subject rules, deploy localized configuration boundaries, and establish an access vector for concurrent diagnostic review.
                   </p>
                 </div>
                 <button 
                    onClick={() => setShowHostModal(true)} 
                    className="px-6 py-4 bg-surface2 hover:bg-surface3 border border-border2 text-textMain rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer w-full mt-auto shadow-sm"
                 >
                    Configure Custom Parameters
                 </button>
            </div>
        </div>
      )}

      {activeTab === 'gauntlet' && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="p-6 bg-surface border border-reePurple/30 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-0 right-0 w-64 h-64 bg-reePurple/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <h3 className="text-2xl font-black text-textMain tracking-tight mb-2 relative z-10 flex items-center gap-3">
                    <span className="text-reePurple">🛡️</span> The Gauntlet Tier Engine
                </h3>
                <p className="text-sm text-muted2 relative z-10 leading-relaxed max-w-2xl">
                    Isolated retention thresholds. Survive escalating tiers of comprehensive, adaptive board simulation variants. Any failed submission sequence triggers a rigid 12-hour terminal lockout penalty.
                </p>
                <div className="mt-4 flex gap-4 relative z-10">
                    <div className="bg-bg border border-border2 px-4 py-2 rounded-lg flex flex-col">
                        <span className="text-[0.6rem] uppercase font-bold text-muted tracking-widest mb-0.5">Current Standing</span>
                        <span className="font-mono text-lg font-black text-reePurple">LEVEL {stats?.gauntletLevel || 1}</span>
                    </div>
                    <div className="bg-bg border border-border2 px-4 py-2 rounded-lg flex flex-col">
                        <span className="text-[0.6rem] uppercase font-bold text-muted tracking-widest mb-0.5">Accumulated Quota</span>
                        <span className="font-mono text-lg font-black text-textMain">{stats?.totalAnswered || 0} Qs</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {GAUNTLET_TIERS.map((tier) => {
                    const currentLevel = stats?.gauntletLevel || 1;
                    const totalAnswered = stats?.totalAnswered || 0;
                    
                    const isPassed = currentLevel > tier.level;
                    const isUnlocked = currentLevel === tier.level && totalAnswered >= tier.reqQs;
                    const isLocked = !isPassed && !isUnlocked;
                    const isCoolingDown = isUnlocked && cooldownTimer;

                    return (
                        <div key={tier.level} className={`p-6 rounded-2xl border flex flex-col transition-all relative overflow-hidden ${
                            isPassed ? 'bg-reeGreen/5 border-reeGreen/30 shadow-sm' :
                            isUnlocked ? 'bg-surface border-reePurple/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]' :
                            'bg-surface2 border-border2 opacity-70 grayscale'
                        }`}>
                            {isPassed && <div className="absolute top-0 right-0 w-32 h-32 bg-reeGreen/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>}
                            {isUnlocked && <div className="absolute top-0 right-0 w-32 h-32 bg-reePurple/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>}

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <span className={`text-[0.65rem] font-black uppercase tracking-widest px-2.5 py-1 rounded border ${
                                    isPassed ? 'bg-reeGreen/20 text-reeGreen border-reeGreen/30' :
                                    isUnlocked ? 'bg-reePurple/20 text-reePurple border-reePurple/30' :
                                    'bg-bg text-muted border-border2'
                                }`}>
                                    Vector {tier.level}
                                </span>
                                <span className="text-2xl opacity-80">
                                    {isPassed ? '🏆' : isUnlocked ? '⚔️' : '🔒'}
                                </span>
                            </div>

                            <h4 className={`text-xl font-black tracking-tight mb-2 relative z-10 ${isPassed ? 'text-reeGreen' : isUnlocked ? 'text-textMain' : 'text-muted'}`}>
                                {tier.name}
                            </h4>
                            
                            <ul className="flex flex-col gap-1.5 text-xs font-mono text-muted mb-6 relative z-10">
                                <li className="flex justify-between"><span>Exam Parameters:</span> <span className="font-bold text-textMain">{tier.items} Items</span></li>
                                <li className="flex justify-between"><span>Operational Limit:</span> <span className="font-bold text-textMain">{tier.timeLimit} Minutes</span></li>
                                <li className="flex justify-between mt-2 pt-2 border-t border-border2/50">
                                    <span>Pre-requisite Telemetry:</span> 
                                    <span className={`font-bold ${totalAnswered >= tier.reqQs ? 'text-reeGreen' : 'text-reeRed'}`}>
                                        {totalAnswered} / {tier.reqQs} Qs
                                    </span>
                                </li>
                            </ul>

                            <div className="mt-auto relative z-10">
                                {isPassed ? (
                                    <button disabled className="w-full py-3 bg-reeGreen/10 text-reeGreen border border-reeGreen/30 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed">
                                        ✓ Sector Mastered
                                    </button>
                                ) : isLocked ? (
                                    <button disabled className="w-full py-3 bg-bg text-muted border border-border2 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed">
                                        Telemetry Target Locked
                                    </button>
                                ) : isCoolingDown ? (
                                    <button disabled className="w-full py-3 bg-reeRed/10 text-reeRed border border-reeRed/50 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]">
                                        Lockout active: {cooldownTimer}
                                    </button>
                                ) : (
                                    <button onClick={() => initiateGauntlet(tier.level)} className="w-full py-3 bg-reePurple hover:bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all cursor-pointer btn-press">
                                        Initiate Level-Up Exam
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-surface border border-border2 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px] h-[65vh] animate-in fade-in slide-in-from-bottom-2">
          
          <div className="p-5 border-b border-border2 bg-surface2/50 flex justify-between items-center shrink-0">
            <h2 className="text-sm font-black text-textMain uppercase tracking-widest flex items-center gap-2">
              <span className="text-reeAmber">🏆</span> Global Telemetry Rankings
            </h2>
            <span className="text-[0.65rem] font-bold text-muted uppercase tracking-widest bg-bg px-2 py-1 rounded border border-border2 shadow-inner">
               Live Matrix Sync
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 stagger-fade-in">
            {isLoadingRankings ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
                <span className="telemetry-spinner !w-8 !h-8 border-reeAmber border-t-transparent"></span>
                <span className="text-xs font-bold text-muted2 uppercase tracking-widest animate-pulse">Syncing Matrix...</span>
              </div>
            ) : (leaderboard || []).length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted2 font-mono py-20">
                No telemetry data available.
              </div>
            ) : (
              <>
                {(leaderboard || []).map((agent, idx) => {
                  const isMe = agent.uid === currentUser?.uid;
                  const isLastElement = idx === (leaderboard || []).length - 1;

                  return (
                    <div 
                      key={agent.uid} 
                      ref={isLastElement ? lastElementRef : null} 
                      className={`grid grid-cols-12 gap-3 p-3 items-center rounded-xl mb-1 transition-colors hover-glow ${isMe ? 'bg-reeBlue/10 border border-reeBlue/30 shadow-sm' : 'hover:bg-surface2 border border-transparent'}`}
                    >
                      <div className="col-span-2 sm:col-span-1 flex justify-center">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black ${getRankBadge(idx)}`}>
                          {idx + 1}
                        </div>
                      </div>
                      <div className="col-span-4 sm:col-span-5 flex items-center gap-3">
                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-bold truncate flex items-center gap-2 ${isMe ? 'text-reeBlue' : 'text-textMain'}`}>
                            {agent.displayName}
                            {isMe && <span className="text-[0.55rem] bg-reeBlue text-white px-1.5 py-0.5 rounded shadow-sm uppercase tracking-widest shrink-0">You</span>}
                          </span>
                          <span className="text-[0.65rem] text-muted font-mono opacity-50 truncate">ID: {agent.uid.slice(0, 8)}</span>
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex justify-center items-center">
                          <span className="text-[0.55rem] font-black text-bg bg-reePurple px-2 py-0.5 rounded uppercase tracking-widest shadow-sm">
                              LVL {agent.gauntletLevel || 1}
                          </span>
                      </div>

                      <div className="col-span-2 text-right">
                        <span className="text-sm font-black text-reeCyan font-mono">{(agent.thetaRating || 0).toFixed(3)}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-sm font-bold text-reeGreen">{agent.streak || 0}</span>
                        <span className="text-xs text-muted ml-1 hidden sm:inline">Days</span>
                      </div>
                    </div>
                  );
                })}

                {isFetchingMore && (
                  <div className="flex items-center justify-center py-6 animate-in fade-in">
                    <span className="telemetry-spinner !w-5 !h-5 border-reeAmber border-t-transparent mr-3"></span>
                  </div>
                )}
                
                {!hasMore && (leaderboard || []).length > 0 && (
                  <div className="text-center py-8">
                     <span className="text-[0.65rem] font-bold text-muted uppercase tracking-widest border-t border-border2 pt-4 px-12">End of Records</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* FIXED UI: CENTRALIZED, NO-SCROLL HOST CONFIGURATION MODAL */}
      {showHostModal && (
        <div className="fixed inset-0 bg-bg/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <FocusTrap active={showHostModal}>
            <div className="bg-surface border border-reeBlue/40 p-5 sm:p-6 rounded-3xl shadow-2xl max-w-4xl w-full relative">
              
              <div className="mb-5">
                  <h3 className="text-xl sm:text-2xl font-black text-textMain tracking-tight">Deploy Multiplayer Simulator</h3>
                  <p className="text-xs sm:text-sm text-muted2 mt-1">Select your evaluation profile to configure the battle chamber.</p>
              </div>

              {/* Top Row: Mode Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <button 
                      onClick={() => setHostConfig({...hostConfig, mode: 'custom'})}
                      className={`p-4 rounded-2xl border text-left transition-all ${hostConfig.mode === 'custom' ? 'bg-reeBlue/10 border-reeBlue shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-surface2 border-border2 hover:border-muted'}`}
                  >
                      <h4 className={`text-sm font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 ${hostConfig.mode === 'custom' ? 'text-reeBlue' : 'text-textMain'}`}>
                          <span>⚙️</span> Custom Drill
                      </h4>
                      <p className="text-[0.65rem] text-muted2 leading-relaxed hidden sm:block">Adjustable item count and time limits for focused multiplayer practice.</p>
                  </button>

                  <button 
                      onClick={() => setHostConfig({...hostConfig, mode: 'prc'})}
                      className={`p-4 rounded-2xl border text-left transition-all ${hostConfig.mode === 'prc' ? 'bg-reeAmber/10 border-reeAmber shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-surface2 border-border2 hover:border-muted'}`}
                  >
                      <h4 className={`text-sm font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 ${hostConfig.mode === 'prc' ? 'text-reeAmber' : 'text-textMain'}`}>
                          <span>🏛️</span> PRC Standard
                      </h4>
                      <p className="text-[0.65rem] text-muted2 leading-relaxed hidden sm:block">Strict 100 items. Locked 4 or 6 hour limit depending on the subject.</p>
                  </button>

                  <button 
                      onClick={() => setHostConfig({...hostConfig, mode: 'blended'})}
                      className={`p-4 rounded-2xl border text-left transition-all ${hostConfig.mode === 'blended' ? 'bg-reePurple/10 border-reePurple shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'bg-surface2 border-border2 hover:border-muted'}`}
                  >
                      <h4 className={`text-sm font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 ${hostConfig.mode === 'blended' ? 'text-reePurple' : 'text-textMain'}`}>
                          <span>⚖️</span> Full Blended
                      </h4>
                      <p className="text-[0.65rem] text-muted2 leading-relaxed hidden sm:block">The ultimate test. 100 mixed items (Math, ESAS, EE) locked to 5 hours.</p>
                  </button>
              </div>

              {/* Bottom Row: Parameter Dropdowns */}
              <div className="bg-surface2 border border-border2 rounded-xl p-4 sm:p-5 flex flex-col gap-4 mb-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                          <label className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">Target Domain</label>
                          <select 
                              disabled={hostConfig.mode === 'blended'}
                              value={hostConfig.mode === 'blended' ? 'Blended' : hostConfig.subject}
                              onChange={(e) => setHostConfig({...hostConfig, subject: e.target.value})}
                              className="bg-bg border border-border2 p-3 rounded-lg text-sm font-bold text-textMain outline-none focus:border-reeBlue transition-colors cursor-pointer disabled:opacity-50"
                          >
                              {hostConfig.mode === 'blended' ? <option value="Blended">Math, ESAS & EE Blended</option> : (
                                  <>
                                      <option value="Mathematics">Mathematics</option>
                                      <option value="ESAS">ESAS</option>
                                      <option value="EE">Electrical Engineering (EE)</option>
                                  </>
                              )}
                          </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                          <label className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">Volume Parameter</label>
                          <select 
                              disabled={hostConfig.mode === 'prc' || hostConfig.mode === 'blended'}
                              value={hostConfig.mode === 'custom' ? hostConfig.count : 100}
                              onChange={(e) => setHostConfig({...hostConfig, count: parseInt(e.target.value)})}
                              className="bg-bg border border-border2 p-3 rounded-lg text-sm font-bold text-textMain outline-none focus:border-reeBlue transition-colors cursor-pointer disabled:opacity-50"
                          >
                              <option value="10">10 Items (Quick Drill)</option>
                              <option value="20">20 Items (Standard Session)</option>
                              <option value="50">50 Items (Extended Drill)</option>
                              <option value="100">100 Items (Full Mock)</option>
                          </select>
                      </div>
                  </div>
                  
                  {hostConfig.mode === 'custom' && (
                      <div className="flex flex-col gap-1.5 border-t border-border2/50 pt-3">
                          <label className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">Time Limit Constraint</label>
                          <select 
                              value={hostConfig.timeLimitMins}
                              onChange={(e) => setHostConfig({...hostConfig, timeLimitMins: parseInt(e.target.value)})}
                              className="bg-bg border border-border2 p-3 rounded-lg text-sm font-bold text-textMain outline-none focus:border-reeBlue transition-colors cursor-pointer sm:max-w-[50%]"
                          >
                              <option value="30">30 Minutes</option>
                              <option value="60">60 Minutes</option>
                              <option value="120">120 Minutes (2 Hours)</option>
                              <option value="180">180 Minutes (3 Hours)</option>
                          </select>
                      </div>
                  )}
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-3 border-t border-border2">
                <button
                  onClick={() => setShowHostModal(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-surface2 hover:bg-surface3 text-textMain rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border border-border2 cursor-pointer"
                >
                  Cancel Protocol
                </button>
                <button
                  onClick={handleDeployLobby}
                  className="w-full sm:w-auto px-8 py-3 bg-reeRed hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-colors cursor-pointer flex items-center justify-center gap-2 btn-press"
                >
                  ⚔️ Deploy Multiplayer Lobby
                </button>
              </div>

            </div>
          </FocusTrap>
        </div>
      )}

    </div>
  );
}