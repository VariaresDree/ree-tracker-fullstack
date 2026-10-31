import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBattleSocket } from '../hooks/useBattleSocket';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { requestRematch } from '../services/dbQueries';
import { Button, Badge, StatusPill, Card, CardHeader, CardTitle, CardBody, EmptyState, IconChip, Page, PageHeader } from '../components/ui';
import { ChevronLeft, Swords, Users, Copy, Trophy, ClipboardList, Clock, RotateCcw } from '../components/ui/icons';
import { formatTimeOfDay } from '../utils/time';
import toast from 'react-hot-toast';

const REMATCH_NEEDS_CONNECTION = 'Rematch needs a connection. Reconnect and try again.';

export default function BattleLobby() {
    const { battleId } = useParams();
    // One room per battle: a rematch opens the new battle on this same route,
    // and nothing of the old one (its results, its players) may carry over.
    return <BattleRoom key={battleId} battleId={battleId} />;
}

function BattleRoom({ battleId }) {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const isOnline = useNetworkStatus();

    const {
        connected,
        connectionFailed,
        reconnect,
        participants,
        battleStatus,
        battleConfig,
        results,
        error,
        timing,
        rematch,
        startBattle
    } = useBattleSocket(battleId);

    // While it runs: minutes left, ticking on.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (battleStatus !== 'IN_PROGRESS') return undefined;
        const t = setInterval(() => setNow(Date.now()), 30 * 1000);
        return () => clearInterval(t);
    }, [battleStatus]);

    // Only players connected now can take part: the server drops anyone
    // disconnected when the battle starts.
    const present = participants.filter(p => p.connected !== false);
    const isHost = participants.some(p => p.id === currentUser?.uid && p.isHost);
    const canStart = isHost && present.length >= 2 && battleStatus === 'WAITING';
    const waitingForHost = !isHost && battleStatus === 'WAITING' && present.length >= 2;
    const [starting, setStarting] = useState(false);

    const copyInviteLink = async () => {
        const text = `Join my live REE.ai Board Battle!\n\nBattle code: ${battleId}`;
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Battle code copied — send it to your opponents.");
        } catch {
            toast.error(`Couldn’t copy. The code is ${battleId}.`);
        }
    };

    // "Battle started!" used to show before the server agreed; the status
    // change (battle-started) now moves the screen on.
    const handleStartBattle = () => {
        setStarting(true);
        startBattle();
    };

    const handleEnterChamber = () => {
        navigate(`/simulator?battleId=${battleId}`);
    };

    // This player's own row: once they've submitted there is no exam room to
    // go back to, only the time the results are due.
    const me = participants.find(p => p.id === currentUser?.uid);
    const iFinished = !!me?.finished;
    const minsLeft = timing ? Math.ceil((timing.endsAt - now) / 60000) : null;
    const myResult = results?.find(r => r.id === currentUser?.uid);

    // Rematch: the same settings in a new lobby. A battle has one; when
    // someone else started it, the room offers to join theirs instead. One
    // that has already started (or finished) is no longer offered.
    const rematchOpen = !rematch || rematch.status === 'WAITING';
    const rematchByOther = !!(rematch?.status === 'WAITING' && rematch.by?.userId && rematch.by.userId !== currentUser?.uid);
    const canRematch = !!(results && myResult) && rematchOpen && !rematchByOther;
    const [rematching, setRematching] = useState(false);
    // Joining one someone else started asks the server too: it hands back
    // that lobby, or says it has started without you (409) rather than
    // sending you to a room that takes no one new.
    const handleRematch = async () => {
        if (!isOnline) return toast.error(REMATCH_NEEDS_CONNECTION);
        setRematching(true);
        try {
            const res = await requestRematch(battleId);
            navigate(`/battle/${res.battleId}`);
        } catch (err) {
            toast.error(err?.message === '[OFFLINE]' ? REMATCH_NEEDS_CONNECTION : (err?.message || "Couldn't start a rematch."));
            setRematching(false);
        }
    };

    // Can't reach the battle server (offline, or no connect within the timeout):
    // show a clear, actionable state instead of an endless "Connecting…" spinner.
    if (!connected && !results && (!isOnline || connectionFailed)) {
        return (
            <Page width="reading">
                <Button variant="ghost" size="sm" className="self-start text-muted hover:text-textMain" onClick={() => navigate('/exams?tab=battles')}>
                    <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> Back to Exams
                </Button>
                <EmptyState
                    titleAs="h1"
                    icon={Swords}
                    title={isOnline ? "Can't reach the battle server" : "You're offline"}
                    description={isOnline
                        ? 'The live battle server is unreachable right now. Check your connection and try again.'
                        : 'Live battles need an internet connection. Reconnect, then retry.'}
                    action={<Button onClick={reconnect}>Reconnect</Button>}
                />
            </Page>
        );
    }

    // The server refused us (the battle already started, is full, or is gone)
    // and we're not a player in it: say so instead of "Waiting for players".
    const amIn = participants.some(p => p.id === currentUser?.uid);
    if (error && !amIn && !results) {
        return (
            <Page width="reading">
                <Button variant="ghost" size="sm" className="self-start text-muted hover:text-textMain" onClick={() => navigate('/exams?tab=battles')}>
                    <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> Back to Exams
                </Button>
                <EmptyState
                    titleAs="h1"
                    icon={Swords}
                    title="You can’t join this battle"
                    description={error}
                    action={<Button onClick={() => navigate('/exams?tab=battles')}>Host or join another</Button>}
                />
            </Page>
        );
    }

    // Still handshaking while online — brief, bounded by the 10s socket timeout.
    if (!connected && !results) {
        return (
            <Page width="reading">
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-[var(--accent-danger)]">
                    <span className="telemetry-spinner !w-8 !h-8 border-t-transparent"></span>
                    <span className="text-muted2 font-mono uppercase tracking-widest text-xs">Connecting to the lobby…</span>
                </div>
            </Page>
        );
    }

    return (
        <Page width="reading">
            <Button variant="ghost" size="sm" className="self-start -mb-2 text-muted hover:text-textMain" onClick={() => navigate('/exams?tab=battles')}>
                <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> Back to Exams
            </Button>

            <PageHeader
                title="Battle room"
                meta={(
                    <span aria-live="polite">
                        <StatusPill tone={connected ? 'success' : 'danger'}>
                            {connected ? 'Connected' : 'Reconnecting…'}
                        </StatusPill>
                    </span>
                )}
            />

            <Card elevated grain padding="lg" className="relative overflow-hidden animate-in slide-in-from-bottom-2"
                style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 30%, transparent)' }}
            >
                <div
                    className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"
                    style={{ background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)' }}
                ></div>
                <div className="relative z-10 text-center flex flex-col items-center">
                    <IconChip icon={Swords} tone="danger" size="lg" round />

                    <div className="mt-4 mb-2 max-w-full">
                        <span className="text-eyebrow block mb-2">Battle code</span>
                        <span
                            className="text-4xl font-bold font-mono tracking-[0.2em] px-6 py-2 rounded-[var(--radius-default)] select-all inline-block border max-w-full [overflow-wrap:anywhere]"
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
            <Card elevated>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent-signal)]" /> Players
                    </CardTitle>
                    <StatusPill tone="success">{present.length} online</StatusPill>
                </CardHeader>
                <CardBody className="flex flex-col gap-2">
                    {participants.length === 0 ? (
                        <EmptyState
                            compact
                            icon={Users}
                            title="Waiting for players"
                            description="Share your battle code so other reviewers can join."
                        />
                    ) : (
                        participants.map((p) => (
                            <div key={p.id} className={`flex items-center justify-between gap-3 p-4 rounded-[var(--radius-default)] border transition-[background-color,border-color,opacity] ${
                                p.id === currentUser?.uid
                                    ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_30%,transparent)]'
                                    : p.connected ? 'bg-surface2 border-border2' : 'bg-surface2/50 border-border2 opacity-50'
                            }`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.connected ? 'animate-pulse' : ''}`} style={{ background: p.connected ? 'var(--accent-success)' : 'var(--text-muted)' }}></span>
                                    <span className="text-sm font-bold text-textMain truncate">{p.displayName}</span>
                                    {p.isHost && <Badge tone="neutral" className="uppercase shrink-0">Host</Badge>}
                                    {p.id === currentUser?.uid && <Badge tone="velocity" className="uppercase shrink-0">You</Badge>}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
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
                    {/* Open-seat placeholder: the lobby has no player cap, so this
                        signals "room for at least one more" rather than a fake N/M
                        count. Only while genuinely still recruiting — hidden once
                        the battle has actually started, where a lone player is a
                        real 1-player match rather than a still-forming lobby. */}
                    {participants.length === 1 && battleStatus === 'WAITING' && (
                        <div className="flex items-center justify-between gap-3 p-4 rounded-[var(--radius-default)] border border-dashed border-border2 bg-surface2/20">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-dashed border-muted2 animate-pulse"></span>
                                <span className="text-sm font-medium text-muted2">Open seat — send them the code</span>
                            </div>
                            <Button size="sm" variant="ghost" onClick={copyInviteLink} className="shrink-0">
                                <Copy size={14} strokeWidth={1.75} aria-hidden="true" /> Copy code
                            </Button>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Final scores */}
            {results && (
                <Card elevated className="animate-in fade-in slide-in-from-bottom-2"
                    style={{ borderColor: 'color-mix(in srgb, var(--accent-success) 30%, transparent)' }}
                >
                    <CardHeader>
                        <div className="min-w-0">
                            <CardTitle className="flex items-center gap-2">
                                <Trophy size={18} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-reeAmber-text)' }} /> Final scores
                            </CardTitle>
                            <p className="text-xs text-muted2 mt-1">
                                Results are recorded. Progress can take a minute to catch up after a multiplayer exam.
                            </p>
                        </div>
                    </CardHeader>
                    <CardBody>
                        <div className="flex flex-col gap-3">
                            {results.map((r, idx) => (
                                <div key={r.id} className={`flex items-center justify-between gap-3 p-4 rounded-[var(--radius-default)] border ${
                                    idx === 0 ? '' : 'bg-surface2 border-border2'
                                }`}
                                    style={idx === 0 ? {
                                        background: 'color-mix(in srgb, var(--color-reeAmber) 10%, transparent)',
                                        borderColor: 'color-mix(in srgb, var(--color-reeAmber) 30%, transparent)',
                                    } : undefined}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border tabular-nums shrink-0"
                                            style={idx === 0 ? {
                                                color: 'var(--color-reeAmber-text)',
                                                background: 'color-mix(in srgb, var(--color-reeAmber) 20%, transparent)',
                                                borderColor: 'var(--color-reeAmber)',
                                            } : { color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}
                                        >{idx + 1}</span>
                                        <span className="text-sm font-bold text-textMain truncate">{r.displayName}</span>
                                        {r.id === currentUser?.uid && <Badge tone="velocity" className="uppercase shrink-0">You</Badge>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--accent-success)' }}>{r.score}/{r.total ?? battleConfig?.questionCount ?? r.itemsAnswered}</div>
                                        <div className="text-micro text-muted font-mono tabular-nums">
                                            {Math.round(r.timeTakenSecs / 60)}m
                                            {r.elo && Number.isFinite(r.elo.delta) && <> · rating {r.elo.delta >= 0 ? '+' : '−'}{Math.abs(Math.round(r.elo.delta))}</>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Always there, so a rematch started while you look is announced. */}
                        <div aria-live="polite">
                            {rematchByOther && (
                                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[var(--radius-default)] border"
                                    style={{
                                        background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
                                        borderColor: 'color-mix(in srgb, var(--accent-danger) 30%, transparent)',
                                    }}
                                >
                                    <p className="text-sm text-textMain flex items-center gap-2 min-w-0">
                                        <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" style={{ color: 'var(--accent-danger)' }} />
                                        <span><span className="font-semibold">{rematch.by.displayName}</span> started a rematch</span>
                                    </p>
                                    <Button tone="danger" size="sm" className="shrink-0" aria-label="Join the rematch" loading={rematching} disabled={rematching} onClick={handleRematch}>
                                        Join
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                <Button variant="secondary" className="flex-1" onClick={copyInviteLink}>
                    <Copy size={16} strokeWidth={1.75} aria-hidden="true" /> Copy battle code
                </Button>

                {canStart && (
                    <Button tone="success" className="flex-1" onClick={handleStartBattle} loading={starting} disabled={starting}>
                        Start battle ({present.length} players)
                    </Button>
                )}

                {battleStatus === 'WAITING' && isHost && present.length < 2 && (
                    <span aria-live="polite" className="flex-1 flex items-center justify-center">
                        <StatusPill tone="amber" dot>Waiting for another player to join</StatusPill>
                    </span>
                )}

                {waitingForHost && (
                    <span aria-live="polite" className="flex-1 flex items-center justify-center">
                        <StatusPill tone="neutral" dot>Waiting for the host to start</StatusPill>
                    </span>
                )}

                {/* Only enter the exam room once the battle has actually STARTED.
                    Entering during WAITING dropped a non-host into the simulator
                    before `battle-started` fired (host still assembling the lobby). */}
                {battleStatus === 'IN_PROGRESS' && !iFinished && (minsLeft == null || minsLeft > 0) && (
                    <Button tone="danger" className="flex-1" onClick={handleEnterChamber}>
                        Enter exam room{minsLeft != null && ` · ${minsLeft} min left`}
                    </Button>
                )}

                {battleStatus === 'IN_PROGRESS' && (iFinished || (minsLeft != null && minsLeft <= 0)) && (
                    <span aria-live="polite" className="flex-1 flex flex-col items-center justify-center gap-1 text-center">
                        <StatusPill tone="success" dot>{iFinished ? 'Your answers are in' : 'Time is up'}</StatusPill>
                        {timing && (
                            <span className="text-xs text-muted2 inline-flex items-center gap-1">
                                <Clock size={12} strokeWidth={1.75} aria-hidden="true" />
                                Results by {formatTimeOfDay(timing.closesAt)}, even if someone has left
                            </span>
                        )}
                    </span>
                )}

                {results && myResult && (
                    <Button as={Link} to={`/exams/sittings/${encodeURIComponent(`${battleId}:${currentUser.uid}`)}`} className="flex-1">
                        <ClipboardList size={16} strokeWidth={1.75} aria-hidden="true" /> Review your answers
                    </Button>
                )}

                {canRematch && (
                    <Button tone="danger" variant="outline" className="flex-1" onClick={handleRematch} loading={rematching} disabled={rematching}>
                        <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" /> Rematch
                    </Button>
                )}

                {battleStatus === 'COMPLETED' && !results && (
                    <span className="flex-1 flex items-center justify-center">
                        <StatusPill tone="success">Battle complete</StatusPill>
                    </span>
                )}
            </div>
        </Page>
    );
}
