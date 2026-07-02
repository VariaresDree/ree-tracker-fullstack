import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBattleSocket } from '../hooks/useBattleSocket';
import { Button, Badge, StatusPill, Card, EmptyState } from '../components/ui';
import { ChevronLeft, Swords, Users, Copy, Trophy } from '../components/ui/icons';
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
        results,
        startBattle
    } = useBattleSocket(battleId);

    const isHost = participants.some(p => p.id === currentUser?.uid && p.isHost);
    const canStart = isHost && participants.length >= 2 && battleStatus === 'WAITING';
    const waitingForHost = !isHost && battleStatus === 'WAITING' && participants.length >= 2;

    const copyInviteLink = () => {
        const text = `Join my live REE.ai Board Battle!\n\nBattle code: ${battleId}`;
        navigator.clipboard.writeText(text);
        toast.success("Battle code copied — send it to your opponents.");
    };

    const handleStartBattle = () => {
        startBattle();
        toast.success("Battle started!");
    };

    const handleEnterChamber = () => {
        navigate(`/simulator?battleId=${battleId}`);
    };

    if (!connected && !results) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-[var(--accent-danger)]">
                <span className="telemetry-spinner !w-8 !h-8 border-t-transparent"></span>
                <span className="text-muted2 font-mono uppercase tracking-widest text-xs">Connecting to the lobby…</span>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-6 page-fade-in pb-12 w-full">
            <Button variant="ghost" size="sm" className="self-start text-muted hover:text-textMain" onClick={() => navigate('/arena')}>
                <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> Back to Arena
            </Button>

            <Card elevated grain className="p-8 relative overflow-hidden animate-in slide-in-from-bottom-2"
                style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 30%, transparent)' }}
            >
                <div
                    className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"
                    style={{ background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)' }}
                ></div>
                <div className="relative z-10 text-center flex flex-col items-center">
                    <span
                        className="inline-flex h-14 w-14 items-center justify-center rounded-full mb-4"
                        style={{
                            background: 'color-mix(in srgb, var(--accent-danger) 12%, transparent)',
                            color: 'var(--accent-danger)',
                        }}
                    >
                        <Swords size={26} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <h2 className="text-display text-2xl sm:text-3xl text-textMain tracking-tight">Multiplayer Mock Battle</h2>

                    <span aria-live="polite" className="mt-3">
                        <StatusPill tone={connected ? 'success' : 'danger'}>
                            {connected ? 'Connected' : 'Reconnecting…'}
                        </StatusPill>
                    </span>

                    <div className="mt-6 mb-2">
                        <span className="text-eyebrow block mb-2">Battle code</span>
                        <span
                            className="text-4xl font-bold font-mono tracking-[0.2em] px-6 py-2 rounded-[var(--radius-lg)] select-all inline-block border"
                            style={{
                                color: 'var(--accent-danger)',
                                background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
                                borderColor: 'color-mix(in srgb, var(--accent-danger) 30%, transparent)',
                            }}
                        >
                            {battleId}
                        </span>
                    </div>

                    {battleConfig && (
                        <div className="flex flex-wrap justify-center gap-2 mt-6">
                            <Badge tone="signal">
                                Subject: {battleConfig.config?.mode === 'blended' ? 'Full mock' : battleConfig.config?.subject}
                            </Badge>
                            <Badge tone="neutral">Questions: {battleConfig.questionCount || '?'}</Badge>
                            <Badge tone="velocity">Time: {Math.round((battleConfig.timeLimitSecs || 0) / 60)} min</Badge>
                        </div>
                    )}
                </div>
            </Card>

            {/* Players */}
            <Card elevated className="overflow-hidden">
                <div className="p-5 border-b border-border2 bg-surface2/50 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-textMain flex items-center gap-2">
                        <Users size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent-signal)]" /> Players
                    </h3>
                    <StatusPill tone="success">{participants.length} online</StatusPill>
                </div>
                <div className="p-4 flex flex-col gap-2">
                    {participants.length === 0 ? (
                        <EmptyState
                            compact
                            icon={Users}
                            title="Waiting for players"
                            description="Share your battle code so other reviewers can join."
                        />
                    ) : (
                        participants.map((p) => (
                            <div key={p.id} className={`flex items-center justify-between p-4 rounded-[var(--radius-lg)] border transition-all ${
                                p.id === currentUser?.uid
                                    ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_30%,transparent)]'
                                    : p.connected ? 'bg-surface2 border-border2' : 'bg-surface2/50 border-border2 opacity-50'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <span className={`w-2.5 h-2.5 rounded-full ${p.connected ? 'animate-pulse' : ''}`} style={{ background: p.connected ? 'var(--accent-success)' : 'var(--text-muted)' }}></span>
                                    <span className="text-sm font-bold text-textMain">{p.displayName}</span>
                                    {p.isHost && <Badge tone="neutral" className="uppercase">Host</Badge>}
                                    {p.id === currentUser?.uid && <Badge tone="velocity" className="uppercase">You</Badge>}
                                </div>
                                <div className="flex items-center gap-3">
                                    {p.finished ? (
                                        <StatusPill tone="success">Finished ({p.score}/{p.total})</StatusPill>
                                    ) : battleStatus === 'IN_PROGRESS' ? (
                                        <span className="text-xs font-mono text-muted tabular-nums">{p.itemsAnswered} answered</span>
                                    ) : (
                                        <span className="text-xs text-muted font-mono">{p.connected ? 'Ready' : 'Disconnected'}</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* Final scores */}
            {results && (
                <Card elevated className="p-6 animate-in fade-in slide-in-from-bottom-2"
                    style={{ borderColor: 'color-mix(in srgb, var(--accent-success) 30%, transparent)' }}
                >
                    <h3 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
                        <Trophy size={18} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-reeAmber)' }} /> Final scores
                    </h3>
                    <div className="flex flex-col gap-3">
                        {results.map((r, idx) => (
                            <div key={r.id} className={`flex items-center justify-between p-4 rounded-[var(--radius-lg)] border ${
                                idx === 0 ? '' : 'bg-surface2 border-border2'
                            }`}
                                style={idx === 0 ? {
                                    background: 'color-mix(in srgb, var(--color-reeAmber) 10%, transparent)',
                                    borderColor: 'color-mix(in srgb, var(--color-reeAmber) 30%, transparent)',
                                } : undefined}
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border tabular-nums"
                                        style={idx === 0 ? {
                                            color: 'var(--color-reeAmber)',
                                            background: 'color-mix(in srgb, var(--color-reeAmber) 20%, transparent)',
                                            borderColor: 'var(--color-reeAmber)',
                                        } : { color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}
                                    >{idx + 1}</span>
                                    <span className="text-sm font-bold text-textMain">{r.displayName}</span>
                                    {r.id === currentUser?.uid && <Badge tone="velocity" className="uppercase">You</Badge>}
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--accent-success)' }}>{r.score}/{r.itemsAnswered}</div>
                                    <div className="text-[11px] text-muted font-mono tabular-nums">{Math.round(r.timeTakenSecs / 60)}m</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="secondary" className="flex-1" onClick={copyInviteLink}>
                    <Copy size={16} strokeWidth={1.75} aria-hidden="true" /> Copy battle code
                </Button>

                {canStart && (
                    <Button tone="success" className="flex-1" onClick={handleStartBattle}>
                        Start battle ({participants.length} players)
                    </Button>
                )}

                {battleStatus === 'WAITING' && isHost && participants.length < 2 && (
                    <span aria-live="polite" className="flex-1 flex items-center justify-center">
                        <StatusPill tone="amber" dot>Waiting for another player to join</StatusPill>
                    </span>
                )}

                {waitingForHost && (
                    <span aria-live="polite" className="flex-1 flex items-center justify-center">
                        <StatusPill tone="neutral" dot>Waiting for the host to start</StatusPill>
                    </span>
                )}

                {(battleStatus === 'IN_PROGRESS' || battleStatus === 'WAITING') && (
                    <Button tone="danger" className="flex-1" onClick={handleEnterChamber}>
                        Enter exam room
                    </Button>
                )}

                {battleStatus === 'COMPLETED' && !results && (
                    <span className="flex-1 flex items-center justify-center">
                        <StatusPill tone="success">Battle complete</StatusPill>
                    </span>
                )}
            </div>
        </div>
    );
}
