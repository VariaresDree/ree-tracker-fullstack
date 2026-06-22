import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchMultiplayerBattle } from '../services/dbQueries';
import toast from 'react-hot-toast';

export default function BattleLobby() {
  const { battleId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [battle, setBattle] = useState(null);
  const [isLobbyLoading, setIsLobbyLoading] = useState(true);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!battleId || !currentUser) return;

    const fetchBattle = async () => {
      try {
        const data = await fetchMultiplayerBattle(battleId);
        if (data?.battle) {
          setBattle(data.battle);
        } else {
          toast.error("Battle matrix collapsed or deleted.");
          navigate('/arena');
        }
      } catch (err) {
        console.error("Battle fetch error:", err);
      } finally {
        setIsLobbyLoading(false);
      }
    };

    fetchBattle();
    pollRef.current = setInterval(fetchBattle, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [battleId, currentUser, navigate]);

  const copyInviteLink = () => {
    const text = `Join my live REE.ai Board Battle!\n\nMatrix Code: ${battleId}`;
    navigator.clipboard.writeText(text);
    toast.success("Battle Code Copied! Send to opponents.");
  };

  const isHost = battle?.hostId === currentUser?.uid;
  const isBattleActive = battle?.status === 'in_progress';

  const handleEnterChamber = () => {
    navigate(`/simulator?battleId=${battleId}`);
  };

  if (isLobbyLoading || !battle) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <span className="telemetry-spinner !w-8 !h-8 border-reeRed border-t-transparent"></span>
        <span className="text-muted2 font-mono uppercase tracking-widest text-xs">Locating Battle Coordinates...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 page-fade-in pb-12 w-full pt-4">
      <button onClick={() => navigate('/arena')} className="self-start text-[0.65rem] text-muted hover:text-textMain font-bold uppercase tracking-widest transition-colors flex items-center gap-2 cursor-pointer">
        <span>&#x2B05;&#xFE0F;</span> Disconnect from Lobby
      </button>

      <div className="p-8 bg-surface border border-reeRed/30 rounded-2xl shadow-xl relative overflow-hidden animate-in slide-in-from-bottom-2">
        <div className="absolute top-0 right-0 w-64 h-64 bg-reeRed/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 text-center flex flex-col items-center">
          <span className="text-5xl mb-4">&#x2694;&#xFE0F;</span>
          <h2 className="text-3xl font-black text-textMain tracking-tight uppercase">Multiplayer Mock Battle</h2>
          <p className="text-sm text-reeRed font-bold mt-2 uppercase tracking-widest">Status: {battle.status}</p>

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
              <span className="text-reeAmber font-bold mr-2">Items:</span> {Array.isArray(battle.questions) ? battle.questions.length : '?'}
            </div>
            <div className="px-4 py-2 bg-bg border border-border2 rounded-lg text-xs font-mono text-muted uppercase">
              <span className="text-reePurple font-bold mr-2">Limit:</span> {Math.round((battle.timeLimitSecs || 0) / 60)} Mins
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button onClick={copyInviteLink} className="flex-1 sm:flex-none px-6 py-3 bg-surface2 hover:bg-surface3 border border-border2 text-textMain rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer">
              &#x1F517; Copy Invite Code
            </button>

            {battle.status === 'WAITING' && isHost && (
              <span className="flex-1 sm:flex-none px-8 py-3 bg-reeAmber/10 border border-reeAmber/50 text-reeAmber rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-reeAmber animate-pulse"></span>
                Waiting for opponents...
              </span>
            )}

            {(isBattleActive || battle.status === 'WAITING') && (
              <button onClick={handleEnterChamber} className="flex-1 sm:flex-none px-8 py-3 bg-reeRed hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer">
                Enter Chamber
              </button>
            )}

            {battle.status === 'COMPLETED' && (
              <div className="flex-1 sm:flex-none px-8 py-3 bg-reeGreen/10 border border-reeGreen/50 text-reeGreen rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-reeGreen"></span>
                Battle Completed
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
