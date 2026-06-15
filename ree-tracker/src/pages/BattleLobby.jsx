// src/pages/BattleLobby.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, collection, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'; 
import { db } from '../config/firebaseDb'; 
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function BattleLobby() {
  const { battleId } = useParams(); 
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [battle, setBattle] = useState(null);
  const [participants, setParticipants] = useState([]); 
  const [isLobbyLoading, setIsLobbyLoading] = useState(true);

  // =========================================================================
  // EFFECT: Live Battle Lobby Sync
  // =========================================================================
  useEffect(() => {
    if (!battleId || !currentUser) return;

    setIsLobbyLoading(true);

    const battleRef = doc(db, "battles", battleId);
    const participantsRef = collection(db, "battles", battleId, "participants");

    // 1. AUTO-JOIN LOBBY: Register the user in the database so others see them
    const joinLobby = async () => {
        try {
            await setDoc(doc(participantsRef, currentUser.uid), {
                name: currentUser.displayName || 'Agent',
                liveScore: 0,
                itemsAnswered: 0,
                status: 'waiting', 
                joinedAt: new Date().toISOString()
            }, { merge: true });
        } catch (err) {
            console.error("Failed to inject into lobby:", err);
        }
    };
    joinLobby();

    // 2. LISTEN TO BATTLE CONFIG (Host changes)
    const unsubBattle = onSnapshot(battleRef, (snap) => {
      if (snap.exists()) {
        setBattle({ id: snap.id, ...snap.data() });
      } else {
        toast.error("Battle matrix collapsed or deleted.");
        navigate('/arena');
      }
    });

    // 3. LISTEN TO PARTICIPANTS (Live Scores)
    const unsubParticipants = onSnapshot(participantsRef, (snapshot) => {
      const combatants = [];
      snapshot.forEach((docSnap) => {
        combatants.push({ uid: docSnap.id, ...docSnap.data() });
      });
      
      combatants.sort((a, b) => {
        if (b.score !== undefined && a.score !== undefined) {
             if (b.score !== a.score) return b.score - a.score;
             return a.timeTaken - b.timeTaken;
        }
        return (b.itemsAnswered || 0) - (a.itemsAnswered || 0);
      });

      setParticipants(combatants);
      setIsLobbyLoading(false);
    }, (error) => {
      console.error("Lobby Sync Error:", error);
      toast.error("Lost connection to the multiplayer matrix.");
    });
    
    return () => {
        unsubBattle();
        unsubParticipants();
    }; 
  }, [battleId, currentUser, navigate]);

  // =========================================================================
  // HANDLERS & UTILS
  // =========================================================================
  const copyInviteLink = () => {
    const text = `Join my live REE.ai Board Battle!\n\nMatrix Code: ${battleId}`;
    navigator.clipboard.writeText(text);
    toast.success("Battle Code Copied! Send to opponents.");
  };

  const isHost = battle?.hostId === currentUser?.uid;

  const handleStartBattle = async () => {
      try {
          await updateDoc(doc(db, 'battles', battleId), { status: 'in_progress' });
      } catch (err) {
          toast.error("Failed to initialize combat sequence.");
      }
  };

  const handleEnterChamber = async () => {
      await setDoc(doc(db, 'battles', battleId, 'participants', currentUser.uid), { status: 'in_progress' }, { merge: true });
      navigate(`/simulator?battleId=${battleId}`); 
  };

  const formatTime = (secs) => {
      if (!secs) return '--';
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}m ${s}s`;
  };

  // =========================================================================
  // RENDER: LOBBY UI
  // =========================================================================
  if (isLobbyLoading || !battle) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <span className="telemetry-spinner !w-8 !h-8 border-reeRed border-t-transparent"></span>
            <span className="text-muted2 font-mono uppercase tracking-widest text-xs">Locating Battle Coordinates...</span>
        </div>
      );
  }

  // FIXED: Explicitly detect if user has finished the exam to remove the Enter Chamber button
  const hasParticipated = participants.some(p => p.uid === currentUser?.uid && p.score !== undefined);
  const isBattleActive = battle?.status === 'in_progress';

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 page-fade-in pb-12 w-full pt-4">
      
      {/* Lobby Exit Header: 
         Routes directly back to the Arena (Combat Terminal tab is default) 
      */}
      <button onClick={() => navigate('/arena')} className="self-start text-[0.65rem] text-muted hover:text-textMain font-bold uppercase tracking-widest transition-colors flex items-center gap-2 cursor-pointer">
          <span>⬅️</span> Disconnect from Lobby
      </button>

      {/* Battle Config Payload */}
      <div className="p-8 bg-surface border border-reeRed/30 rounded-2xl shadow-xl relative overflow-hidden animate-in slide-in-from-bottom-2">
        <div className="absolute top-0 right-0 w-64 h-64 bg-reeRed/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 text-center flex flex-col items-center">
            <span className="text-5xl mb-4">⚔️</span>
            <h2 className="text-3xl font-black text-textMain tracking-tight uppercase">Multiplayer Mock Battle</h2>
            <p className="text-sm text-reeRed font-bold mt-2 uppercase tracking-widest">Host: {battle.hostName}</p>
            
            <div className="mt-6 mb-2">
                <span className="text-[0.65rem] font-bold text-muted uppercase tracking-widest block mb-1">Matrix Invite Code</span>
                <span className="text-4xl font-black text-reeRed tracking-[0.2em] bg-reeRed/10 border border-reeRed/30 px-6 py-2 rounded-xl shadow-[inset_0_0_15px_rgba(239,68,68,0.1)] select-all">
                    {battleId}
                </span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-6">
                <div className="px-4 py-2 bg-bg border border-border2 rounded-lg text-xs font-mono text-muted uppercase">
                    <span className="text-reeCyan font-bold mr-2">Target:</span> 
                    {battle.config?.mode === 'blended' ? 'Full Mock' : battle.config?.subject}
                </div>
                <div className="px-4 py-2 bg-bg border border-border2 rounded-lg text-xs font-mono text-muted uppercase">
                    <span className="text-reeAmber font-bold mr-2">Items:</span> {battle.questions?.length}
                </div>
                <div className="px-4 py-2 bg-bg border border-border2 rounded-lg text-xs font-mono text-muted uppercase">
                    <span className="text-reePurple font-bold mr-2">Limit:</span> {Math.round((battle.timeLimitSecs || 0) / 60)} Mins
                </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <button onClick={copyInviteLink} className="flex-1 sm:flex-none px-6 py-3 bg-surface2 hover:bg-surface3 border border-border2 text-textMain rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer">
                    🔗 Copy Invite Code
                </button>
                
                {/* CONDITIONAL ENTRY LOOP */}
                {hasParticipated ? (
                    <div className="flex-1 sm:flex-none px-8 py-3 bg-reeGreen/10 border border-reeGreen/50 text-reeGreen rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-inner">
                        <span className="w-2 h-2 rounded-full bg-reeGreen animate-pulse"></span>
                        Awaiting Opponent Completion
                    </div>
                ) : (
                    isBattleActive && (
                        <button onClick={handleEnterChamber} className="flex-1 sm:flex-none px-8 py-3 bg-reeRed hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer">
                            Enter Chamber
                        </button>
                    )
                )}
            </div>
        </div>
      </div>

      {/* Combat Controls */}
      <div className="bg-surface2 border border-border2 p-4 rounded-xl flex justify-between items-center shadow-sm">
          <span className="text-sm font-bold text-textMain uppercase tracking-widest flex items-center gap-2">
              <span>👥</span> Connected Agents: {participants.length}
          </span>
          
          {!isBattleActive ? (
              isHost ? (
                  <button onClick={handleStartBattle} className="px-6 py-2.5 bg-reeRed hover:bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer">
                      Deploy Simulation
                  </button>
              ) : (
                  <span className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                      <span className="telemetry-spinner !w-3 !h-3"></span> Waiting for host...
                  </span>
              )
          ) : (
              <span className="text-xs font-bold text-reeRed uppercase tracking-widest flex items-center gap-2 animate-pulse">
                  Combat Active
              </span>
          )}
      </div>

      {/* Live Participants Grid */}
      <div className="bg-surface border border-border2 rounded-2xl shadow-sm overflow-hidden mt-4 animate-in fade-in">
        <div className="p-4 bg-surface2/50 border-b border-border2 flex justify-between items-center">
            <h3 className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-reeRed animate-pulse shadow-[0_0_8px_#ef4444]"></span>
                Live Combat Progress
            </h3>
        </div>
        <div className="flex flex-col p-4 gap-4">
            {participants.length === 0 ? (
                <div className="py-8 text-center text-muted font-mono text-sm">Waiting for challengers to breach the perimeter...</div>
            ) : (
                participants.map((p, idx) => {
                    const isFinished = p.score !== undefined;
                    const progressPct = isFinished ? 100 : Math.round(((p.itemsAnswered || 0) / (battle.questions?.length || 1)) * 100);
                    const isMe = p.uid === currentUser?.uid;
                    
                    return (
                        <div key={idx} className={`p-4 rounded-xl border transition-all ${isMe ? 'bg-reeBlue/5 border-reeBlue/30 shadow-sm' : 'bg-bg border-border2'}`}>
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-black text-muted2">#{idx + 1}</span>
                                    <span className="font-bold text-sm text-textMain">{p.name} {isMe && <span className="ml-2 text-[0.55rem] bg-reeBlue text-white px-1.5 py-0.5 rounded shadow-sm uppercase tracking-widest shrink-0">You</span>}</span>
                                </div>
                                <div className="text-right">
                                    {isFinished ? (
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-reeGreen">{p.score} / {p.total}</span>
                                            <span className="text-[0.6rem] text-muted uppercase">{(p.score/p.total*100).toFixed(0)}% Acc | {formatTime(p.timeTaken)}</span>
                                        </div>
                                    ) : (
                                        <div className="text-xs font-mono font-bold text-reeAmber animate-pulse">
                                            {p.status === 'in_progress' ? 'In Combat...' : 'Standing By'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Real-Time Progress Bar */}
                            {isBattleActive && (
                                <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden border border-border2 mt-2">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${isFinished ? 'bg-reeGreen shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-reeAmber shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} 
                                        style={{ width: `${progressPct}%` }}
                                    ></div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
      </div>
    </div>
  );
}