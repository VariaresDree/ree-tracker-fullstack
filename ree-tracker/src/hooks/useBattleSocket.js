import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { auth } from '../config/firebaseDb';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export function useBattleSocket(battleId) {
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);
    // True once we've given up reaching the battle server (offline, no auth, or
    // no successful connect within the timeout). Lets the lobby show a clear
    // "can't reach the server" state instead of an infinite "Connecting…" spinner.
    // The battle this socket failed to reach, if any. Held with its id, so a
    // different battle starts clear without a reset in the effect.
    const [failedFor, setFailedFor] = useState(null);
    const connectionFailed = !!battleId && failedFor === battleId;
    // Bumped by reconnect() to open a new connection without reloading the page.
    const [attemptKey, setAttemptKey] = useState(0);
    const [participants, setParticipants] = useState([]);
    const [battleStatus, setBattleStatus] = useState(null);
    const [battleConfig, setBattleConfig] = useState(null);
    const [battleStarted, setBattleStarted] = useState(null);
    const [results, setResults] = useState(null);
    const [graded, setGraded] = useState(null);
    const [answerKey, setAnswerKey] = useState(null);
    const [explanationKey, setExplanationKey] = useState(null);
    const [opponentProgress, setOpponentProgress] = useState(new Map());
    // The server's last refusal ("no longer accepting new players", "battle
    // is full", "not in progress"). It used to be logged to the console only,
    // so joining a battle that had already started showed "Waiting for
    // players" for good.
    const [error, setError] = useState(null);
    // A final submit the server hasn't acknowledged. One made while the socket
    // was down used to be dropped; it is resent once the server has us back in
    // the lobby, and the UI can say it is waiting to send.
    const pendingSubmitRef = useRef(null);
    const [submitPending, setSubmitPending] = useState(false);
    // When the running battle ends, on THIS device's clock: the server sends
    // its own clock with each update, so a phone whose clock is off still
    // counts down to the server's deadline. { endsAt, closesAt } (epoch ms).
    const [timing, setTiming] = useState(null);
    // The finished battle's rematch: { battleId, status, by: { userId,
    // displayName } }. Announced to the room when someone starts it
    // (`rematch-ready`), and carried in the results replayed to a player who
    // comes back later.
    const [rematch, setRematch] = useState(null);

    useEffect(() => {
        if (!battleId) return;

        // Guards the async gap below: if the effect is torn down (unmount /
        // battleId change) during `getIdToken()`, we must NOT open a socket —
        // otherwise cleanup (which already ran) can't disconnect it, leaking a
        // phantom connection that keeps calling setState on the unmounted hook.
        let cancelled = false;
        // If we haven't connected within 10s (offline / server unreachable),
        // surface a failure state so the UI can offer a retry.
        let failTimer = setTimeout(() => { if (!cancelled) setFailedFor(battleId); }, 10000);
        let retryTimer = null;

        const connect = async () => {
            const user = auth.currentUser;
            if (!user) { clearTimeout(failTimer); if (!cancelled) setFailedFor(battleId); return; }

            await user.getIdToken();
            if (cancelled) return; // torn down during the await — don't open a socket

            const socket = io(`${BACKEND_URL}/battle`, {
                // A function, so every reconnect sends a current token. A token
                // fixed at the first connect expired after an hour, the server
                // refused the reconnect, and only a reload got back in.
                auth: (cb) => {
                    (auth.currentUser || user).getIdToken()
                        .then((token) => cb({ token }), () => cb({}));
                },
                transports: ['websocket', 'polling']
            });

            socketRef.current = socket;

            socket.on('connect', () => {
                clearTimeout(failTimer);
                setFailedFor(null);
                setConnected(true);
                socket.emit('join-battle', { battleId });
            });

            // Dropped after connecting: the same 10 s before saying so (the
            // timer used to arm only once, so a later drop spun forever).
            socket.on('disconnect', () => {
                setConnected(false);
                clearTimeout(failTimer);
                failTimer = setTimeout(() => { if (!cancelled && !socket.connected) setFailedFor(battleId); }, 10000);
            });

            socket.on('connect_error', () => {
                setConnected(false);
                // A refusal from the server (an expired token) stops socket.io's
                // own retries; try again shortly, with a fresh token.
                if (!socket.active && !cancelled) {
                    clearTimeout(retryTimer);
                    retryTimer = setTimeout(() => { if (!cancelled) socket.connect(); }, 3000);
                }
            });

            const takeTiming = (t) => {
                if (!t || !Number.isFinite(t.serverNow)) return;
                const skew = Date.now() - t.serverNow;
                setTiming({ endsAt: t.endsAt + skew, closesAt: t.closesAt + skew });
            };

            socket.on('lobby-update', (data) => {
                if (data.participants) setParticipants(data.participants);
                if (data.status) setBattleStatus(data.status);
                if (data.config) setBattleConfig(data);
                if (data.timing) takeTiming(data.timing);
                setError(null);
                // Back in the lobby after a reconnect: send a submit that
                // hasn't been acknowledged (the server ignores a duplicate).
                if (pendingSubmitRef.current) socket.emit('battle-submit', { battleId, attempts: pendingSubmitRef.current });
            });

            socket.on('battle-started', (data) => {
                setBattleStarted(data);
                setBattleStatus('IN_PROGRESS');
                takeTiming(data);
            });

            socket.on('opponent-progress', (data) => {
                setOpponentProgress(prev => {
                    const next = new Map(prev);
                    next.set(data.id, data);
                    return next;
                });
            });

            socket.on('participant-finished', (data) => {
                setParticipants(prev =>
                    prev.map(p => p.id === data.id ? { ...p, finished: true, score: data.score, total: data.total } : p)
                );
            });

            // Server ack for OUR submission — authoritative score, no answer
            // key yet (opponents may still be playing).
            socket.on('battle-graded', (data) => {
                pendingSubmitRef.current = null;
                setSubmitPending(false);
                setGraded(data);
            });

            socket.on('battle-complete', (data) => {
                setBattleStatus('COMPLETED');
                setResults(data.results);
                // Answer key + offline explanations revealed only once
                // everyone finished — feeds the post-battle review screen.
                if (data.answerKey) setAnswerKey(data.answerKey);
                if (data.explanationKey) setExplanationKey(data.explanationKey);
                if (data.rematch) setRematch(data.rematch);
            });

            socket.on('rematch-ready', (data) => {
                if (data?.battleId) setRematch({ battleId: data.battleId, status: 'WAITING', by: data.by || null });
            });

            socket.on('error', (data) => {
                setError(data?.message || 'The battle server refused that.');
            });
        };

        connect();

        return () => {
            cancelled = true;
            clearTimeout(failTimer);
            clearTimeout(retryTimer);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [battleId, attemptKey]);

    /** Open a new connection (the "Try again" on the can't-connect screen). */
    const reconnect = useCallback(() => {
        setFailedFor(null);
        setAttemptKey((k) => k + 1);
    }, []);

    const startBattle = useCallback(() => {
        socketRef.current?.emit('start-battle', { battleId });
    }, [battleId]);

    // Live per-question answer — the server grades it against its own key
    // and broadcasts opponent progress itself. Replaces the old
    // client-computed `battle-progress` event (a score-forgery vector).
    const sendAnswer = useCallback((questionId, userAnswer, confidenceLevel = 'MED', timeSpentMs = 0) => {
        socketRef.current?.emit('battle-answer', { battleId, questionId, userAnswer, confidenceLevel, timeSpentMs });
    }, [battleId]);

    // Ask again: the server answers a battle whose time is up by finishing it
    // and sending the results (used once the deadline has passed, in case the
    // server restarted and its own timer was lost).
    const rejoin = useCallback(() => {
        const socket = socketRef.current;
        if (socket?.connected) socket.emit('join-battle', { battleId });
        else socket?.connect?.();
    }, [battleId]);

    // Final submission carries only the attempts (for disconnect-gap
    // recovery); the server computes score/total/timing itself.
    const submitResult = useCallback((attempts = []) => {
        pendingSubmitRef.current = attempts;
        setSubmitPending(true);
        const socket = socketRef.current;
        if (socket?.connected) socket.emit('battle-submit', { battleId, attempts });
        // Otherwise it goes out with the next lobby-update after reconnecting.
    }, [battleId]);

    return {
        connected,
        connectionFailed,
        reconnect,
        participants,
        battleStatus,
        battleConfig,
        battleStarted,
        results,
        graded,
        answerKey,
        explanationKey,
        opponentProgress: Array.from(opponentProgress.values()),
        error,
        submitPending,
        timing,
        rematch,
        rejoin,
        startBattle,
        sendAnswer,
        submitResult
    };
}
