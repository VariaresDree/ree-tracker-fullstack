// src/hooks/usePomodoroClock.js
// Per-second display clock for the timestamp-based Pomodoro. Components that
// show the timer re-render every second while it runs (cheap, no store
// writes); remaining time is always derived from the store's `endsAt`, so any
// number of consumers stay in perfect sync and unmounting one never affects
// the countdown.
//
// Exactly ONE mounted instance should pass `owner: true` (MainLayout) — it
// carries the completion side-effect (mode switch + toast) so finishing a
// block fires once, not once per visible timer. It also sends the focus blocks
// the timer has logged (POST /api/user/focus-blocks, or queued offline), for
// Progress › Habits › Focus time.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { remainingSecs } from '../utils/pomodoroLogic';
import { writeOrQueue } from '../services/writeOrQueue';

export const FOCUS_BLOCKS_ENDPOINT = '/api/user/focus-blocks';
const toPayload = (b) => ({
    clientId: b.clientId,
    subject: b.subject,
    minutes: b.minutes,
    startedAt: new Date(b.startedAt).toISOString(),
    endedAt: new Date(b.endedAt).toISOString(),
    completed: !!b.completed,
});

// Best-effort visual "session over" notification via the active service worker
// registration (the robust path — plain `new Notification()` doesn't work on
// mobile Chrome). Never prompts (that's the ethical opt-in's job) and never
// throws; audio was intentionally left out of scope.
function notifySessionOver(body) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready
        .then((reg) => reg.showNotification('REE.ai', { body, tag: 'pomodoro', icon: '/pwa-192x192.png' }))
        .catch(() => {});
}

export function usePomodoroClock({ owner = false } = {}) {
    const pomodoro = useStore((s) => s.pomodoro);
    const switchPomodoroMode = useStore((s) => s.switchPomodoroMode);
    const notificationsEnabled = useStore((s) => s.notifications.enabled);
    const clearFocusLogs = useStore((s) => s.clearFocusLogs);
    const pendingFocusLogs = pomodoro.pendingFocusLogs;
    const [, force] = useState(0);
    const remaining = remainingSecs(pomodoro);

    useEffect(() => {
        if (!pomodoro.isRunning) return undefined;
        const id = setInterval(() => force((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, [pomodoro.isRunning, pomodoro.endsAt]);

    useEffect(() => {
        if (!owner || !pomodoro.isRunning || remaining > 0) return;
        const finishedWork = pomodoro.isWork;
        switchPomodoroMode();
        const message = finishedWork ? 'Focus block done — break time.' : 'Break over — back to focus.';
        toast(message);
        if (notificationsEnabled) notifySessionOver(message);
    }, [owner, pomodoro.isRunning, remaining, pomodoro.isWork, switchPomodoroMode, notificationsEnabled]);

    // Logged focus blocks go out once: taken off the timer's list, then sent
    // or put in the offline queue (which replays them; the server keeps one
    // per block id). One the server refuses outright is dropped.
    useEffect(() => {
        if (!owner || !pendingFocusLogs?.length) return;
        const batch = pendingFocusLogs;
        clearFocusLogs(batch.map((b) => b.clientId));
        for (const b of batch) {
            writeOrQueue(FOCUS_BLOCKS_ENDPOINT, 'POST', toPayload(b), { queueKey: FOCUS_BLOCKS_ENDPOINT }).catch(() => {});
        }
    }, [owner, pendingFocusLogs, clearFocusLogs]);

    return { pomodoro, remaining };
}

export const formatClock = (seconds) => {
    const safe = Math.max(0, seconds | 0);
    const m = Math.floor(safe / 60).toString().padStart(2, '0');
    const s = (safe % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};
