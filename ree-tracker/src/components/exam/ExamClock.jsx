// src/components/exam/ExamClock.jsx
//
// A self-ticking exam clock. It owns its own interval and re-renders ONLY
// itself.
//
// Why this exists: the exam engines held `timeRemaining` in React state and
// called setState every second. That state lives in the hook the PAGE consumes,
// so every tick re-rendered the whole exam tree — SimulatorActive, the
// QuestionCard and its KaTeX subtree, and ExamNavigator's one button per
// question. For a 100-item PRC mock that is ~100 buttons plus a LaTeX render
// reconciled 3,600 times an hour, for up to six hours, on the low-end Android
// devices this app targets.
//
// The fix is the pattern usePomodoroClock already uses: derive the displayed
// value from an absolute end timestamp and force a local re-render on a tick,
// so the ticking is contained.
//
// `endTime` is an absolute epoch-ms deadline, NOT a countdown. That is
// deliberate — it means the display cannot drift, and it stays correct across a
// backgrounded tab (where timers are throttled to ~1/minute) because the value
// is recomputed from the clock rather than decremented.
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui';
import { Eye, EyeOff } from '../ui/icons';
import { formatExamTime } from '../../utils/examFormat';

/** Seconds left until `endTime`, floored at 0. */
export function remainingSecs(endTime, now = Date.now()) {
    if (!endTime) return 0;
    return Math.max(0, Math.round((endTime - now) / 1000));
}

/** Under five minutes is the "critical" styling threshold. */
export const CRITICAL_SECS = 300;

/** Minutes-left marks a screen reader hears. */
const MILESTONE_MINUTES = [60, 30, 10, 5, 1];

/**
 * The milestone (in minutes) crossed between two readings, or null. A first
 * reading crosses nothing, so starting at 15 minutes left does not announce 30
 * and 60. If a throttled tab skips several, the latest (smallest) one wins.
 */
export function crossedMilestone(prevSecs, nowSecs) {
    if (prevSecs == null || nowSecs == null) return null;
    const crossed = MILESTONE_MINUTES.filter((m) => prevSecs > m * 60 && nowSecs <= m * 60);
    return crossed.length ? Math.min(...crossed) : null;
}

export default function ExamClock({
    endTime,
    showTime = true,
    onToggleTime,
    onExpire,
    paused = false,
}) {
    // The tick counter exists only to force a re-render; the displayed value is
    // always recomputed from `endTime`, so a missed or late tick self-corrects.
    const [, force] = useState(0);
    const firedRef = useRef(false);
    const prevSecsRef = useRef(null);
    const [spoken, setSpoken] = useState('');

    const remaining = remainingSecs(endTime);
    const critical = remaining < CRITICAL_SECS;

    useEffect(() => {
        if (!endTime || paused) return undefined;
        const id = setInterval(() => force((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, [endTime, paused]);

    // Expiry is reported ONCE per deadline. Firing from an effect (rather than
    // during render) keeps the parent's state update out of this component's
    // render pass; the ref guard survives the re-renders the tick causes.
    useEffect(() => {
        if (!endTime || paused) return;
        if (remaining > 0) { firedRef.current = false; return; }
        if (firedRef.current) return;
        firedRef.current = true;
        onExpire?.();
    }, [remaining, endTime, paused, onExpire]);

    // The visible clock is aria-live="off" (a per-second announcement would
    // make a screen reader unusable), so time is spoken only at milestones —
    // and not while the learner has hidden the time on purpose.
    useEffect(() => {
        const crossed = crossedMilestone(prevSecsRef.current, remaining);
        prevSecsRef.current = remaining;
        if (crossed && showTime && !paused) setSpoken(crossed === 1 ? '1 minute left' : `${crossed} minutes left`);
    }, [remaining, showTime, paused]);

    return (
        <div className="flex items-center gap-2">
            <span role="status" className="sr-only">{spoken}</span>
            <Button
                size="icon"
                variant="ghost"
                onClick={onToggleTime}
                aria-label={showTime ? 'Hide time' : 'Show time'}
                className="text-muted hover:text-textMain"
            >
                {showTime
                    ? <Eye size={16} strokeWidth={1.75} aria-hidden="true" />
                    : <EyeOff size={16} strokeWidth={1.75} aria-hidden="true" />}
            </Button>
            <div
                data-testid="exam-clock"
                className={`text-lg sm:text-xl font-bold font-mono tabular-nums tracking-widest px-4 py-1 rounded-[var(--radius-default)] border transition-all duration-300 ${!showTime ? 'blur-sm opacity-20' : ''} ${critical ? 'animate-pulse' : 'bg-surface/50 text-textMain border-border2/60 shadow-inner'}`}
                style={critical ? {
                    color: 'var(--accent-danger)',
                    background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent-danger) 30%, transparent)',
                } : undefined}
                // The clock updates every second; announcing it would make a
                // screen reader unusable for the length of an exam.
                aria-live="off"
            >
                {formatExamTime(remaining)}
            </div>
        </div>
    );
}
