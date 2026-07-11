// src/hooks/usePomodoroClock.js
// Per-second display clock for the timestamp-based Pomodoro. Components that
// show the timer re-render every second while it runs (cheap, no store
// writes); remaining time is always derived from the store's `endsAt`, so any
// number of consumers stay in perfect sync and unmounting one never affects
// the countdown.
//
// Exactly ONE mounted instance should pass `owner: true` (MainLayout) — it
// carries the completion side-effect (mode switch + toast) so finishing a
// block fires once, not once per visible timer.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { remainingSecs } from '../utils/pomodoroLogic';

export function usePomodoroClock({ owner = false } = {}) {
    const pomodoro = useStore((s) => s.pomodoro);
    const switchPomodoroMode = useStore((s) => s.switchPomodoroMode);
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
        toast(finishedWork ? 'Focus block done — break time.' : 'Break over — back to focus.', { icon: '⏱️' });
    }, [owner, pomodoro.isRunning, remaining, pomodoro.isWork, switchPomodoroMode]);

    return { pomodoro, remaining };
}

export const formatClock = (seconds) => {
    const safe = Math.max(0, seconds | 0);
    const m = Math.floor(safe / 60).toString().padStart(2, '0');
    const s = (safe % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};
