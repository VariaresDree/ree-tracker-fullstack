// src/components/Pomodoro.jsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

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
      <div className="flex flex-col gap-2 p-3 bg-surface border border-border2 rounded-xl text-center w-full font-mono text-xs text-textMain transition-all shadow-inner">
        <div className="text-[0.65rem] text-muted font-bold uppercase tracking-wider">Configure Cycle</div>
        <div className="flex items-center justify-center gap-2">
          <input
            type="number"
            value={pomodoro.workDuration}
            onChange={(e) => updatePomodoro({ workDuration: Number(e.target.value) })}
            className="w-12 py-1 bg-bg text-center rounded border border-border2 text-reeAmber font-bold outline-none focus:border-reeBlue"
            title="Focus Duration (Mins)"
          />
          <span className="text-muted">/</span>
          <input
            type="number"
            value={pomodoro.breakDuration}
            onChange={(e) => updatePomodoro({ breakDuration: Number(e.target.value) })}
            className="w-12 py-1 bg-bg text-center rounded border border-border2 text-reeGreen font-bold outline-none focus:border-reeGreen"
            title="Break Duration (Mins)"
          />
        </div>
        <button
          onClick={() => {
            setIsEditing(false);
            resetPomodoro();
          }}
          className="w-full py-1.5 bg-reeBlue hover:bg-reeBlue2 text-white rounded font-bold text-[0.65rem] cursor-pointer transition-colors mt-1 uppercase tracking-wider"
        >
          Lock System Time
        </button>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-surface border border-border2 rounded-2xl flex flex-col items-center gap-2.5 shadow-md transition-all">
      {/* Header Info */}
      <div className="flex justify-between items-center w-full border-b border-border2/40 pb-2">
        <span className={`text-[0.7rem] font-black uppercase tracking-widest ${pomodoro.isWork ? 'text-reeAmber' : 'text-reeGreen'}`}>
          ⚡ {pomodoro.isWork ? 'Focus Phase' : 'Break Matrix'}
        </span>
        <button 
          onClick={() => setIsEditing(true)} 
          className="text-muted hover:text-textMain cursor-pointer transition-colors text-xs p-0.5 rounded"
          title="Adjust Duration Slices"
        >
          ⚙️
        </button>
      </div>

      {/* Amplified High-Visibility Clock digits */}
      <div className={`font-mono text-3xl font-black tracking-widest text-textMain my-1 ${pomodoro.isRunning && localTimeLeft < 60 ? 'text-reeRed animate-pulse' : ''}`}>
        {formatTime(localTimeLeft)}
      </div>

      {/* Control Interface Matrix */}
      <div className="flex justify-center items-center gap-4 w-full border-t border-border2/30 pt-2.5 text-muted2 text-xs font-bold">
        <button onClick={togglePomodoro} className="hover:text-textMain cursor-pointer transition-colors flex items-center gap-1.5">
          {pomodoro.isRunning ? '⏸ Pause' : '▶ Engage'}
        </button>
        <div className="w-px h-3 bg-border2"></div>
        <button onClick={resetPomodoro} className="hover:text-textMain cursor-pointer transition-colors flex items-center gap-1.5" title="Reset Current Cycle">
          ↺ Reset
        </button>
      </div>
    </div>
  );
}