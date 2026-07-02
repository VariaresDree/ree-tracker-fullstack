// src/components/Pomodoro.jsx
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Button } from './ui';
import { Settings2, Play, Pause, RotateCcw } from './ui/icons';

export default function Pomodoro() {
  const { pomodoro, updatePomodoro, switchPomodoroMode } = useStore();

  // Local state isolates the 1-second re-renders to just this component!
  const [localTimeLeft, setLocalTimeLeft] = useState(pomodoro.timeLeft);
  const [isEditing, setIsEditing] = useState(false);

  // Sync local state when global state changes (e.g., from reset or mode switch)
  useEffect(() => {
    setLocalTimeLeft(pomodoro.timeLeft);
  }, [pomodoro.timeLeft, pomodoro.isWork]);

  // The Isolated Ticking Engine
  useEffect(() => {
    let interval = null;
    if (pomodoro.isRunning && localTimeLeft > 0) {
      interval = setInterval(() => {
        setLocalTimeLeft((prev) => {
          if (prev <= 1) {
            switchPomodoroMode(); // Timer hit 0, switch mode
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!pomodoro.isRunning && localTimeLeft !== pomodoro.timeLeft) {
      // Sync the paused time back to global state so it persists on refresh
      updatePomodoro({ timeLeft: localTimeLeft });
    }
    return () => clearInterval(interval);
  }, [pomodoro.isRunning, localTimeLeft, pomodoro.timeLeft, switchPomodoroMode, updatePomodoro]);

  const togglePomodoro = () => {
    if (pomodoro.isRunning) {
      updatePomodoro({ isRunning: false, timeLeft: localTimeLeft });
    } else {
      updatePomodoro({ isRunning: true });
    }
  };

  const resetPomodoro = () => {
    const resetTime = pomodoro.isWork ? pomodoro.workDuration * 60 : pomodoro.breakDuration * 60;
    updatePomodoro({ isRunning: false, timeLeft: resetTime });
    setLocalTimeLeft(resetTime);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-surface border border-border2 rounded-[var(--radius-default)] text-center w-full font-mono text-xs text-textMain transition-all shadow-inner">
        <div className="text-eyebrow">Timer settings</div>
        <div className="flex items-center justify-center gap-2">
          <input
            type="number"
            value={pomodoro.workDuration}
            onChange={(e) => updatePomodoro({ workDuration: Number(e.target.value) })}
            aria-label="Focus minutes"
            className="w-12 py-1 bg-bg text-center rounded-[var(--radius-sm)] border border-border2 font-bold outline-none focus:border-[var(--accent)]"
            style={{ color: 'var(--color-reeAmber)' }}
            title="Focus minutes"
          />
          <span className="text-muted">/</span>
          <input
            type="number"
            value={pomodoro.breakDuration}
            onChange={(e) => updatePomodoro({ breakDuration: Number(e.target.value) })}
            aria-label="Break minutes"
            className="w-12 py-1 bg-bg text-center rounded-[var(--radius-sm)] border border-border2 font-bold outline-none focus:border-[var(--accent)]"
            style={{ color: 'var(--accent-success)' }}
            title="Break minutes"
          />
        </div>
        <Button
          size="sm"
          fullWidth
          className="mt-1"
          onClick={() => {
            setIsEditing(false);
            resetPomodoro();
          }}
        >
          Save
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-surface border border-border2 rounded-[var(--radius-lg)] flex flex-col items-center gap-2.5 shadow-md transition-all">
      {/* Header Info */}
      <div className="flex justify-between items-center w-full border-b border-border2/40 pb-2">
        <span className="text-eyebrow" style={{ color: pomodoro.isWork ? 'var(--color-reeAmber)' : 'var(--accent-success)' }}>
          {pomodoro.isWork ? 'Focus' : 'Break'}
        </span>
        <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} aria-label="Timer settings" className="!h-7 !w-7 text-muted hover:text-textMain">
          <Settings2 size={14} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>

      {/* Amplified High-Visibility Clock digits */}
      <div
        className={`font-mono text-3xl font-bold tabular-nums tracking-widest my-1 ${pomodoro.isRunning && localTimeLeft < 60 ? 'animate-pulse' : 'text-textMain'}`}
        style={pomodoro.isRunning && localTimeLeft < 60 ? { color: 'var(--accent-danger)' } : undefined}
      >
        {formatTime(localTimeLeft)}
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center gap-2 w-full border-t border-border2/30 pt-2">
        <Button size="sm" variant="ghost" onClick={togglePomodoro} className="text-muted2 hover:text-textMain">
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
