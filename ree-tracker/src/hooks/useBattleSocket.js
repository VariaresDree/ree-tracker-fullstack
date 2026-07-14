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
    const [connectionFailed, setConnectionFailed] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [battleStatus, setBattleStatus] = useState(null);
    const [battleConfig, setBattleConfig] = useState(null);
    const [battleStarted, setBattleStarted] = useState(null);
    const [results, setResults] = useState(null);
    const [graded, setGraded] = useState(null);
    const [answerKey, setAnswerKey] = useState(null);
    const [explanationKey, setExplanationKey] = useState(null);
    const [opponentProgress, setOpponentProgress] = useState(new Map());

    useEffect(() => {
        if (!battleId) return;

        setConnectionFailed(false);
        // Guards the async gap below: if the effect is torn down (unmount /
        // battleId change) during `getIdToken()`, we must NOT open a socket —
        // otherwise cleanup (which already ran) can't disconnect it, leaking a
        // phantom connection that keeps calling setState on the unmounted hook.
        let cancelled = false;
        // If we haven't connected within 10s (offline / server unreachable),
        // surface a failure state so the UI can offer a retry.
        let failTimer = setTimeout(() => { if (!cancelled) setConnectionFailed(true); }, 10000);

        const connect = async () => {
            const user = auth.currentUser;
            if (!user) { clearTimeout(failTimer); if (!cancelled) setConnectionFailed(true); return; }

            const token = await user.getIdToken();
            if (cancelled) return; // torn down during the await — don't open a socket

            const socket = io(`${BACKEND_URL}/battle`, {
                auth: { token },
                transports: ['websocket', 'polling']
            });

            socketRef.current = socket;

            socket.on('connect', () => {
                clearTimeout(failTimer);
                setConnectionFailed(false);
                setConnected(true);
                socket.emit('join-battle', { battleId });
            });

            socket.on('disconnect', () => setConnected(false));

            socket.on('connect_error', () => {
                setConnected(false);
            });

            socket.on('lobby-update', (data) => {
                if (data.participants) setParticipants(data.participants);
                if (data.status) setBattleStatus(data.status);
                if (data.config) setBattleConfig(data);
            });

            socket.on('battle-started', (data) => {
                setBattleStarted(data);
                setBattleStatus('IN_PROGRESS');
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
                setGraded(data);
            });

            socket.on('battle-complete', (data) => {
                setBattleStatus('COMPLETED');
                setResults(data.results);
                // Answer key + offline explanations revealed only once
                // everyone finished — feeds the post-battle review screen.
                if (data.answerKey) setAnswerKey(data.answerKey);
                if (data.explanationKey) setExplanationKey(data.explanationKey);
            });

            socket.on('error', (data) => {
                console.error('Battle socket error:', data.message);
            });
        };

        connect();

        return () => {
            cancelled = true;
            clearTimeout(failTimer);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [battleId]);

    const startBattle = useCallback(() => {
        socketRef.current?.emit('start-battle', { battleId });
    }, [battleId]);

    // Live per-question answer — the server grades it against its own key
    // and broadcasts opponent progress itself. Replaces the old
    // client-computed `battle-progress` event (a score-forgery vector).
    const sendAnswer = useCallback((questionId, userAnswer, confidenceLevel = 'MED', timeSpentMs = 0) => {
        socketRef.current?.emit('battle-answer', { battleId, questionId, userAnswer, confidenceLevel, timeSpentMs });
    }, [battleId]);

    // Final submission carries only the attempts (for disconnect-gap
    // recovery); the server computes score/total/timing itself.
    const submitResult = useCallback((attempts = []) => {
        socketRef.current?.emit('battle-submit', { battleId, attempts });
    }, [battleId]);

    return {
        connected,
        connectionFailed,
        participants,
        battleStatus,
        battleConfig,
        battleStarted,
        results,
        graded,
        answerKey,
        explanationKey,
        opponentProgress: Array.from(opponentProgress.values()),
        startBattle,
        sendAnswer,
        submitResult
    };
}
