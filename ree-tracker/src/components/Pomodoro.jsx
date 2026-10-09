// src/components/Pomodoro.jsx
// Sidebar Pomodoro panel. Purely a VIEW over the store's timestamp-based
// timer (utils/pomodoroLogic) — the countdown itself lives in `endsAt`, so
// closing the sidebar or navigating away no longer resets anything. The
// floating widget (FloatingPomodoro) renders the same state.
import { useState } from 'react';
import { useSessionSlice } from '../store/slices';
import { usePomodoroClock, formatClock } from '../hooks/usePomodoroClock';
import { Button } from './ui';
import { Settings2, Play, Pause, RotateCcw } from './ui/icons';
import { MIN_MINUTES, MAX_MINUTES, clampMinutes } from '../utils/pomodoroLogic';

// The settings edit a draft: the inputs wrote straight into the timer, so
// clearing a field set a 0-minute block, and Save reset a running timer even
// when nothing changed.
export default function Pomodoro() {
  const { updatePomodoro, startPomodoro, pausePomodoro, resetPomodoro } = useSessionSlice();
  const { pomodoro, remaining } = usePomodoroClock();
  const [draft, setDraft] = useState(null); // { work, rest } while editing

  if (draft) {
    const save = () => {
      const workDuration = clampMinutes(draft.work, pomodoro.workDuration);
      const breakDuration = clampMinutes(draft.rest, pomodoro.breakDuration);
      setDraft(null);
      if (workDuration === pomodoro.workDuration && breakDuration === pomodoro.breakDuration) return;
      updatePomodoro({ workDuration, breakDuration });
      resetPomodoro();
    };
    return (
      <div className="flex flex-col gap-2 p-3 bg-surface border border-border2 rounded-[var(--radius-default)] text-center w-full text-xs text-textMain transition-all shadow-inner">
        <div className="text-eyebrow">Timer settings</div>
        <div className="flex items-end justify-center gap-3">
          <label className="flex flex-col gap-1 items-center">
            <span className="text-muted2">Focus</span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              value={draft.work}
              onChange={(e) => setDraft((d) => ({ ...d, work: e.target.value }))}
              className="w-14 py-1 bg-bg text-center rounded-[var(--radius-sm)] border border-border2 font-mono font-bold focus:border-[var(--accent)]"
              style={{ color: 'var(--color-reeAmber-text)' }}
            />
          </label>
          <label className="flex flex-col gap-1 items-center">
            <span className="text-muted2">Break</span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              value={draft.rest}
              onChange={(e) => setDraft((d) => ({ ...d, rest: e.target.value }))}
              className="w-14 py-1 bg-bg text-center rounded-[var(--radius-sm)] border border-border2 font-mono font-bold focus:border-[var(--accent)]"
              style={{ color: 'var(--accent-success)' }}
            />
          </label>
        </div>
        <p className="text-muted2">Minutes, {MIN_MINUTES}–{MAX_MINUTES}. Changing them restarts the timer.</p>
        <div className="flex gap-2 mt-1">
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => setDraft(null)}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={save}>Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-surface border border-border2 rounded-[var(--radius-lg)] flex flex-col items-center gap-2.5 shadow-md transition-all">
      {/* Header Info */}
      <div className="flex justify-between items-center w-full border-b border-border2/40 pb-2">
        <span className="text-eyebrow" style={{ color: pomodoro.isWork ? 'var(--color-reeAmber-text)' : 'var(--accent-success)' }}>
          {pomodoro.isWork ? 'Focus' : 'Break'}
        </span>
        {/* The shared Button primitive's `icon` size already handles the
            44x44 touch target correctly (h-9 w-9, pointer-coarse:h-11 w-11)
            — the !h-7 !w-7 override here was defeating it, measuring 28x28
            live at 360px. */}
        <Button size="icon" variant="ghost" onClick={() => setDraft({ work: String(pomodoro.workDuration), rest: String(pomodoro.breakDuration) })} aria-label="Timer settings" className="text-muted hover:text-textMain">
          <Settings2 size={14} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>

      {/* Amplified High-Visibility Clock digits */}
      <div
        className={`font-mono text-3xl font-bold tabular-nums tracking-widest my-1 ${pomodoro.isRunning && remaining < 60 ? 'animate-pulse' : 'text-textMain'}`}
        style={pomodoro.isRunning && remaining < 60 ? { color: 'var(--accent-danger)' } : undefined}
      >
        {formatClock(remaining)}
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center gap-2 w-full border-t border-border2/30 pt-2">
        <Button size="sm" variant="ghost" onClick={pomodoro.isRunning ? pausePomodoro : startPomodoro} className="text-muted2 hover:text-textMain">
          {pomodoro.isRunning
            ? <><Pause size={14} strokeWidth={1.75} aria-hidden="true" /> Pause</>
            : <><Play size={14} strokeWidth={1.75} aria-hidden="true" /> Start</>}
        </Button>
        <div className="w-px h-3 bg-border2"></div>
        <Button size="sm" variant="ghost" onClick={resetPomodoro} className="text-muted2 hover:text-textMain">
          <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" /> Reset
        </Button>
      </div>
    </div>
  );
}
