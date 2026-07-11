// src/components/FloatingPomodoro.jsx
// Draggable floating Pomodoro pill. Follows the user across pages so a
// running focus block stays visible with the sidebar closed — the historical
// complaint was that navigating away reset the timer; the countdown now lives
// in the store's timestamp model and this widget is just another view of it.
//
// Always mounted in MainLayout and carries the OWNER clock (completion mode
// switch fires here exactly once), rendering null while hidden. Deliberately
// absent from ExamLayout routes (Board Sim / Gauntlet stay distraction-free).
// Visibility: running → shown (unless dismissed for this run); paused → only
// if pinned. Position persists across sessions.
import { useRef, useState, useEffect } from 'react';
import { useSessionSlice } from '../store/slices';
import { usePomodoroClock, formatClock } from '../hooks/usePomodoroClock';
import { Play, Pause, Pin, PinOff, X } from './ui/icons';

const PILL_W = 210;
const PILL_H = 52;
const clampPos = (x, y) => ({
  x: Math.min(Math.max(8, x), (window.innerWidth || 1280) - PILL_W - 8),
  y: Math.min(Math.max(8, y), (window.innerHeight || 800) - PILL_H - 8),
});

export default function FloatingPomodoro() {
  const { startPomodoro, pausePomodoro, pomodoroWidget, setPomodoroWidget } = useSessionSlice();
  const { pomodoro, remaining } = usePomodoroClock({ owner: true });

  // Live drag offset in local state (fast), persisted to the store on release.
  const [dragPos, setDragPos] = useState(null);
  const dragRef = useRef(null);

  // Keep a persisted position inside the viewport after window resizes.
  useEffect(() => {
    const onResize = () => {
      if (pomodoroWidget.x == null) return;
      const c = clampPos(pomodoroWidget.x, pomodoroWidget.y);
      if (c.x !== pomodoroWidget.x || c.y !== pomodoroWidget.y) setPomodoroWidget(c);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pomodoroWidget.x, pomodoroWidget.y, setPomodoroWidget]);

  const visible = (pomodoro.isRunning && !pomodoroWidget.dismissed) || (pomodoroWidget.pinned && !pomodoroWidget.dismissed);
  if (!visible) return null;

  const onPointerDown = (e) => {
    // Buttons handle their own clicks; drag only from the pill body.
    if (e.target.closest('button')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = pomodoroWidget.x != null
      ? { x: pomodoroWidget.x, y: pomodoroWidget.y }
      : { x: (window.innerWidth || 1280) - PILL_W - 24, y: (window.innerHeight || 800) - PILL_H - 88 };
    dragRef.current = { startX, startY, origin };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const { startX, startY, origin } = dragRef.current;
    setDragPos(clampPos(origin.x + (e.clientX - startX), origin.y + (e.clientY - startY)));
  };
  const onPointerUp = () => {
    if (dragRef.current && dragPos) setPomodoroWidget(dragPos);
    dragRef.current = null;
    setDragPos(null);
  };

  const pos = dragPos ?? (pomodoroWidget.x != null ? { x: pomodoroWidget.x, y: pomodoroWidget.y } : null);
  const style = pos
    ? { left: pos.x, top: pos.y }
    : { right: 24, bottom: 88 }; // default: above the mobile bottom nav

  const modeColor = pomodoro.isWork ? 'var(--color-reeAmber)' : 'var(--accent-success)';

  return (
    <div
      role="timer"
      aria-label={`Pomodoro ${pomodoro.isWork ? 'focus' : 'break'} timer, ${formatClock(remaining)} remaining`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="fixed z-[70] flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full bg-surface/95 backdrop-blur-md border border-border2 shadow-xl select-none touch-none cursor-grab active:cursor-grabbing"
      style={style}
    >
      <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: modeColor }} aria-hidden="true" />
      <span className="text-eyebrow shrink-0" style={{ color: modeColor }}>
        {pomodoro.isWork ? 'Focus' : 'Break'}
      </span>
      <span className="font-mono text-sm font-bold tabular-nums tracking-wider text-textMain">
        {formatClock(remaining)}
      </span>
      <button
        onClick={pomodoro.isRunning ? pausePomodoro : startPomodoro}
        aria-label={pomodoro.isRunning ? 'Pause timer' : 'Start timer'}
        className="p-1.5 rounded-full text-muted hover:text-textMain hover:bg-surface3 transition-colors cursor-pointer"
      >
        {pomodoro.isRunning ? <Pause size={14} strokeWidth={1.75} aria-hidden="true" /> : <Play size={14} strokeWidth={1.75} aria-hidden="true" />}
      </button>
      <button
        onClick={() => setPomodoroWidget({ pinned: !pomodoroWidget.pinned })}
        aria-label={pomodoroWidget.pinned ? 'Unpin floating timer' : 'Pin floating timer'}
        aria-pressed={pomodoroWidget.pinned}
        className={`p-1.5 rounded-full transition-colors cursor-pointer hover:bg-surface3 ${pomodoroWidget.pinned ? 'text-[var(--accent)]' : 'text-muted hover:text-textMain'}`}
      >
        {pomodoroWidget.pinned ? <Pin size={14} strokeWidth={1.75} aria-hidden="true" /> : <PinOff size={14} strokeWidth={1.75} aria-hidden="true" />}
      </button>
      <button
        onClick={() => setPomodoroWidget({ dismissed: true, pinned: false })}
        aria-label="Hide floating timer"
        className="p-1.5 rounded-full text-muted hover:text-textMain hover:bg-surface3 transition-colors cursor-pointer"
      >
        <X size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
