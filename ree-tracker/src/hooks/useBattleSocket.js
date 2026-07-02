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
    const [graded, setGraded] = useState(null);
    const [answerKey, setAnswerKey] = useState(null);
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

            // Server ack for OUR submission — authoritative score, no answer
            // key yet (opponents may still be playing).
            socket.on('battle-graded', (data) => {
                setGraded(data);
            });

            socket.on('battle-complete', (data) => {
                setBattleStatus('COMPLETED');
                setResults(data.results);
                // Answer key revealed only once everyone finished — feeds the
                // post-battle review screen.
                if (data.answerKey) setAnswerKey(data.answerKey);
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
        participants,
        battleStatus,
        battleConfig,
        battleStarted,
        results,
        graded,
        answerKey,
        opponentProgress: Array.from(opponentProgress.values()),
        startBattle,
        sendAnswer,
        submitResult
    };
}
