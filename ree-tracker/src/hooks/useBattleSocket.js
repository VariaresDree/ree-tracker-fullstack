import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { auth } from '../config/firebaseDb';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export function useBattleSocket(battleId) {
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [battleStatus, setBattleStatus] = useState(null);
    const [battleConfig, setBattleConfig] = useState(null);
    const [battleStarted, setBattleStarted] = useState(null);
    const [results, setResults] = useState(null);
    const [opponentProgress, setOpponentProgress] = useState(new Map());

    useEffect(() => {
        if (!battleId) return;

        const connect = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();

            const socket = io(`${BACKEND_URL}/battle`, {
                auth: { token },
                transports: ['websocket', 'polling']
            });

            socketRef.current = socket;

            socket.on('connect', () => {
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

            socket.on('battle-complete', (data) => {
                setBattleStatus('COMPLETED');
                setResults(data.results);
            });

            socket.on('error', (data) => {
                console.error('Battle socket error:', data.message);
            });
        };

        connect();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [battleId]);

    const startBattle = useCallback(() => {
        socketRef.current?.emit('start-battle', { battleId });
    }, [battleId]);

    const sendProgress = useCallback((score, itemsAnswered) => {
        socketRef.current?.emit('battle-progress', { battleId, score, itemsAnswered });
    }, [battleId]);

    const submitResult = useCallback((score, total, timeTakenSecs, attempts = []) => {
        socketRef.current?.emit('battle-submit', { battleId, score, total, timeTakenSecs, attempts });
    }, [battleId]);

    return {
        connected,
        participants,
        battleStatus,
        battleConfig,
        battleStarted,
        results,
        opponentProgress: Array.from(opponentProgress.values()),
        startBattle,
        sendProgress,
        submitResult
    };
}
