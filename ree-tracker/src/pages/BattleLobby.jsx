import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBattleSocket } from '../hooks/useBattleSocket';
import toast from 'react-hot-toast';

export default function BattleLobby() {
    const { battleId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const {
        connected,
        participants,
        battleStatus,
        battleConfig,
        battleStarted,
        results,
        startBattle
    } = useBattleSocket(battleId);

    const isHost = participants.some(p => p.id === currentUser?.uid && p.isHost);
    const canStart = isHost && participants.length >= 2 && battleStatus === 'WAITING';

    const copyInviteLink = () => {
        const text = `Join my live REE.ai Board Battle!\n\nMatrix Code: ${battleId}`;
        navigator.clipboard.writeText(text);
        toast.success("Battle Code Copied! Send to opponents.");
    };

    const handleStartBattle = () => {
        startBattle();
        toast.success("Battle initiated!");
    };

    const handleEnterChamber = () => {
        navigate(`/simulator?battleId=${battleId}`);
    };

    if (!connected && !results) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <span className="telemetry-spinner !w-8 !h-8 border-reeRed border-t-transparent"></span>
                <span className="text-muted2 font-mono uppercase tracking-widest text-xs">Establishing WebSocket Link...</span>
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

                    <div className="flex items-center gap-2 mt-2">
                        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-reeGreen animate-pulse' : 'bg-reeRed'}`}></span>
                        <span className={`text-sm font-bold uppercase tracking-widest ${connected ? 'text-reeGreen' : 'text-reeRed'}`}>
                            {connected ? 'Live Connection' : 'Reconnecting...'}
                        </span>
                    </div>

                    <div className="mt-6 mb-2">
                        <span className="text-[0.65rem] font-bold text-muted uppercase tracking-widest block mb-1">Matrix Invite Code</span>
                        <span className="text-4xl font-black text-reeRed tracking-[0.2em] bg-reeRed/10 border border-reeRed/30 px-6 py-2 rounded-xl shadow-[inset_0_0_15px_rgba(239,68,68,0.1)] select-all">
                            {battleId}
                        </span>
                    </div>

                    {battleConfig && (
                        <div className="flex flex-wrap justify-center gap-4 mt-6">
                            <div className="px-4 py-2 bg-bg border border-border2 rounded-lg text-xs font-mono text-muted uppercase">
                                <span className="text-reeCyan font-bold mr-2">Target:</span>
                                {battleConfig.config?.mode === 'blended' ? 'Full Mock' : battleConfig.config?.subject}
                            </div>
                            <div className="px-4 py-2 bg-bg border border-border2 rounded-lg text-xs font-mono text-muted uppercase">
                                <span className="text-reeAmber font-bold mr-2">Items:</span> {battleConfig.questionCount || '?'}
                            </div>
                            <div className="px-4 py-2 bg-bg border border-border2 rounded-lg text-xs font-mono text-muted uppercase">
                                <span className="text-reePurple font-bold mr-2">Limit:</span> {Math.round((battleConfig.timeLimitSecs || 0) / 60)} Mins
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Live Participants */}
            <div className="bg-surface border border-border2 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border2 bg-surface2/50 flex justify-between items-center">
                    <h3 className="text-sm font-black text-textMain uppercase tracking-widest flex items-center gap-2">
                        <span className="text-reeBlue">👥</span> Connected Agents
                    </h3>
                    <span className="text-[0.65rem] font-bold text-reeGreen uppercase tracking-widest bg-reeGreen/10 px-2 py-1 rounded border border-reeGreen/30">
                        {participants.length} Online
                    </span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                    {participants.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted2 font-mono">Waiting for agents to connect...</div>
                    ) : (
                        participants.map((p) => (
                            <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                p.id === currentUser?.uid ? 'bg-reeBlue/10 border-reeBlue/30' :
                                p.connected ? 'bg-surface2 border-border2' : 'bg-surface2/50 border-border2 opacity-50'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <span className={`w-2.5 h-2.5 rounded-full ${p.connected ? 'bg-reeGreen animate-pulse' : 'bg-muted'}`}></span>
                                    <span className="text-sm font-bold text-textMain">{p.displayName}</span>
                                    {p.isHost && (
                                        <span className="text-[0.55rem] bg-reeAmber text-bg px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Host</span>
                                    )}
                                    {p.id === currentUser?.uid && (
                                        <span className="text-[0.55rem] bg-reeBlue text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest">You</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {p.finished ? (
                                        <span className="text-xs font-bold text-reeGreen uppercase tracking-widest">Finished ({p.score}/{p.total})</span>
                                    ) : battleStatus === 'IN_PROGRESS' ? (
                                        <span className="text-xs font-mono text-muted">{p.itemsAnswered} answered</span>
                                    ) : (
                                        <span className="text-xs text-muted font-mono uppercase">{p.connected ? 'Ready' : 'Disconnected'}</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Results Panel */}
            {results && (
                <div className="bg-surface border border-reeGreen/30 rounded-2xl shadow-xl p-6 animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-xl font-black text-textMain uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span>🏆</span> Battle Results
                    </h3>
                    <div className="flex flex-col gap-3">
                        {results.map((r, idx) => (
                            <div key={r.id} className={`flex items-center justify-between p-4 rounded-xl border ${
                                idx === 0 ? 'bg-reeAmber/10 border-reeAmber/30' : 'bg-surface2 border-border2'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${
                                        idx === 0 ? 'bg-reeAmber/20 border-reeAmber text-reeAmber' :
                                        idx === 1 ? 'bg-gray-300/20 border-gray-300 text-gray-300' :
                                        'bg-surface2 border-border2 text-muted'
                                    }`}>{idx + 1}</span>
                                    <span className="text-sm font-bold text-textMain">{r.displayName}</span>
                                    {r.id === currentUser?.uid && (
                                        <span className="text-[0.55rem] bg-reeBlue text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest">You</span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-reeGreen">{r.score}/{r.itemsAnswered}</div>
                                    <div className="text-[0.6rem] text-muted font-mono">{Math.round(r.timeTakenSecs / 60)}m</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={copyInviteLink} className="flex-1 px-6 py-3 bg-surface2 hover:bg-surface3 border border-border2 text-textMain rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer">
                    &#x1F517; Copy Invite Code
                </button>

                {canStart && (
                    <button onClick={handleStartBattle} className="flex-1 px-8 py-3 bg-reeGreen hover:bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer">
                        &#x1F680; Start Battle ({participants.length} players)
                    </button>
                )}

                {battleStatus === 'WAITING' && isHost && participants.length < 2 && (
                    <span className="flex-1 px-8 py-3 bg-reeAmber/10 border border-reeAmber/50 text-reeAmber rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-reeAmber animate-pulse"></span>
                        Waiting for opponents...
                    </span>
                )}

                {(battleStatus === 'IN_PROGRESS' || battleStatus === 'WAITING') && (
                    <button onClick={handleEnterChamber} className="flex-1 px-8 py-3 bg-reeRed hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer">
                        Enter Chamber
                    </button>
                )}

                {battleStatus === 'COMPLETED' && !results && (
                    <div className="flex-1 px-8 py-3 bg-reeGreen/10 border border-reeGreen/50 text-reeGreen rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-reeGreen"></span>
                        Battle Completed
                    </div>
                )}
            </div>
        </div>
    );
}
