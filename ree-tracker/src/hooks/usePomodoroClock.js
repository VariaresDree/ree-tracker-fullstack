// src/hooks/usePomodoroClock.js
// Per-second display clock for the timestamp-based focus timer. Components
// that show the timer re-render every second while it runs (cheap, no store
// writes); remaining time is always derived from the store's `endsAt`, so any
// number of consumers stay in perfect sync and unmounting one never affects
// the countdown.
//
// Exactly ONE mounted instance passes `owner: true`: FloatingPomodoro on the
// app-shell pages, PomodoroOwner on the exam screens, and the /focus page
// itself (pages/Focus). The owner carries the completion side-effects (the
// next block, the toast, the notification, the chime) so finishing a block
// fires once, not once per visible timer. It also sends the focus blocks the
// timer has logged (POST /api/user/focus-blocks, or queued offline), for
// Progress › Habits › Focus time.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { auth } from '../config/firebaseDb';
import { useStore } from '../store/useStore';
import { completionMessage, modeDurationSecs, progressOf, remainingSecs, shadeDue, shadeMessage } from '../utils/pomodoroLogic';
import { playChime } from '../utils/chime';
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
// registration (the robust path: plain `new Notification()` doesn't work on
// mobile Chrome). Never prompts (that's the ethical opt-in's job) and never
// throws. A tap opens `url` (public/notifications-sw.js reads data.url).
function notifySessionOver(body, { url = '/focus' } = {}) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready
        .then((reg) => reg.showNotification('REE.ai', { body, tag: 'pomodoro', icon: '/pwa-192x192.png', badge: '/badge-96.png', data: { url } }))
        .catch(() => {});
}

// Development only: two owners would move the timer on twice per ending.
let mountedOwners = 0;

export function usePomodoroClock({ owner = false } = {}) {
    const pomodoro = useStore((s) => s.pomodoro);
    const completePomodoro = useStore((s) => s.completePomodoro);
    const notificationsEnabled = useStore((s) => s.notifications.enabled);
    const clearFocusLogs = useStore((s) => s.clearFocusLogs);
    const pendingFocusLogs = pomodoro.pendingFocusLogs;
    const [, force] = useState(0);
    // Derived from the clock at render (the tick below re-renders).
    const remaining = remainingSecs(pomodoro);
    const duration = modeDurationSecs(pomodoro);
    const progress = progressOf(pomodoro);

    // Re-render as each second turns over (aligned to endsAt, so the digits
    // change on the second rather than up to a second late).
    useEffect(() => {
        if (!pomodoro.isRunning || pomodoro.endsAt == null) return undefined;
        let id;
        const tick = () => {
            force((t) => t + 1);
            const ms = (pomodoro.endsAt - Date.now()) % 1000;
            id = setTimeout(tick, (ms > 0 ? ms : 1000) + 10);
        };
        const first = (pomodoro.endsAt - Date.now()) % 1000;
        id = setTimeout(tick, (first > 0 ? first : 1000) + 10);
        return () => clearTimeout(id);
    }, [pomodoro.isRunning, pomodoro.endsAt]);

    // A hidden tab's timers are throttled: look again as soon as it's back.
    useEffect(() => {
        if (!pomodoro.isRunning || typeof document === 'undefined') return undefined;
        const onVisible = () => { if (document.visibilityState === 'visible') force((t) => t + 1); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [pomodoro.isRunning]);

    useEffect(() => {
        if (!owner || !import.meta.env.DEV) return undefined;
        mountedOwners += 1;
        if (mountedOwners > 1) {
            console.warn('usePomodoroClock: more than one owner clock is mounted, so a block would end twice. Mount one (FloatingPomodoro, PomodoroOwner or the /focus page).');
        }
        return () => { mountedOwners -= 1; };
    }, [owner]);

    useEffect(() => {
        if (!owner || !pomodoro.isRunning || remaining > 0) return;
        const before = useStore.getState().pomodoro;
        completePomodoro();
        const after = useStore.getState().pomodoro;
        if (after === before) return;
        const message = completionMessage(before, after);
        toast(message);
        if (notificationsEnabled) notifySessionOver(message, { url: '/focus' });
        if (before.sound) playChime(before.mode === 'exam' ? 'exam' : 'end');
    }, [owner, pomodoro.isRunning, remaining, completePomodoro, notificationsEnabled]);

    // The shading reminder (paper exam): once a section reaches its last N
    // minutes, say so once, with the notification and a chime. The mark is
    // on the persisted timer, so a reload or another owner can't say it twice.
    useEffect(() => {
        if (!owner || !pomodoro.isRunning || !shadeDue(pomodoro)) return;
        const before = useStore.getState().pomodoro;
        useStore.getState().markShadeReminded();
        if (useStore.getState().pomodoro === before) return;
        const message = shadeMessage(before);
        toast(message);
        if (notificationsEnabled) notifySessionOver(message, { url: '/focus' });
        if (before.sound) playChime('shade');
    }, [owner, pomodoro, remaining, notificationsEnabled]);

    // Logged focus blocks go out once: taken off the timer's list, then sent
    // or put in the offline queue (which replays them; the server keeps one
    // per block id). One the server refuses outright goes to Sync issues,
    // where it can be retried: a 4-6 h paper exam sent to a server still on
    // the old 3 h limit used to vanish here. A block
    // stamped with another account (one that signed out without the timer
    // being cleared) is dropped, never sent under this account's token.
    useEffect(() => {
        if (!owner || !pendingFocusLogs?.length) return;
        const uid = auth.currentUser?.uid;
        if (!uid) return; // signed-in state not known yet: wait
        const batch = pendingFocusLogs;
        clearFocusLogs(batch.map((b) => b.clientId));
        for (const b of batch) {
            if (b.ownerUid != null && b.ownerUid !== uid) continue;
            const payload = toPayload(b);
            writeOrQueue(FOCUS_BLOCKS_ENDPOINT, 'POST', payload, { queueKey: FOCUS_BLOCKS_ENDPOINT })
                .catch((err) => useStore.getState().quarantineWrite(FOCUS_BLOCKS_ENDPOINT, 'POST', payload, err));
        }
    }, [owner, pendingFocusLogs, clearFocusLogs]);

    return { pomodoro, remaining, duration, progress };
}
