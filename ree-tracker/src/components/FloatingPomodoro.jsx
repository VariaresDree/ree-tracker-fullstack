// src/components/FloatingPomodoro.jsx
// Draggable floating focus-timer pill. Follows the user across pages so a
// running block stays visible with the sidebar closed — the historical
// complaint was that navigating away reset the timer; the countdown now lives
// in the store's timestamp model and this widget is just another view of it.
// A tap on the mode and time opens the full-screen timer (/focus); dragging
// from there (6px or more) moves the pill instead.
//
// Always mounted in MainLayout and carries the OWNER clock (completion fires
// here exactly once), rendering null while hidden. Deliberately absent from
// ExamLayout routes (Board Sim / Gauntlet stay distraction-free); there
// PomodoroOwner carries the owner clock with nothing on screen, and /focus
// owns it itself. Visibility: running → shown (unless dismissed for this
// run); paused → only if pinned. Position persists across sessions.
import { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSessionSlice } from '../store/slices';
import { useOverlays } from '../store/overlays';
import { usePomodoroClock } from '../hooks/usePomodoroClock';
import { MODE_LABEL } from '../utils/pomodoroLogic';
import { primeChime } from '../utils/chime';
import { formatClock } from '../utils/time';
import { Play, Pause, Pin, PinOff, X } from './ui/icons';

// The pill's size for keeping it on screen, until it has been measured: a
// focus block's pill. A paper exam's ("Paper exam 5:59:59") is wider, so the
// clamp uses the measured width once there is one.
const PILL_W = 232;
const PILL_H = 52;
// A press that moves this far is a drag, not a tap.
const DRAG_PX = 6;
const clampPos = (x, y, w = PILL_W) => ({
  x: Math.min(Math.max(8, x), (window.innerWidth || 1280) - w - 8),
  y: Math.min(Math.max(8, y), (window.innerHeight || 800) - PILL_H - 8),
});

// The mode's name (text, inline: the eyebrow style sets its own colour after
// Tailwind's text-* utilities) and its dot (a fill).
const MODE_COLOR = {
  focus: 'var(--accent-text)',
  short: 'var(--accent-success)',
  long: 'var(--accent-success)',
  exam: 'var(--color-reeAmber-text)',
};
const MODE_DOT = {
  focus: 'bg-[var(--accent)]',
  short: 'bg-[var(--accent-success)]',
  long: 'bg-[var(--accent-success)]',
  exam: 'bg-[var(--color-reeAmber)]',
};

export default function FloatingPomodoro() {
  const { startPomodoro, pausePomodoro, pomodoroWidget, setPomodoroWidget } = useSessionSlice();
  const scratchpadOpen = useOverlays((s) => s.scratchpadOpen);
  const { pomodoro, remaining } = usePomodoroClock({ owner: true });
  const navigate = useNavigate();
  const location = useLocation();

  // Live drag offset in local state (fast), persisted to the store on release.
  const [dragPos, setDragPos] = useState(null);
  const dragRef = useRef(null);
  // Set when a press turned into a drag, so its click doesn't open /focus.
  const draggedRef = useRef(false);
  const openRef = useRef(null);
  const pillRef = useRef(null);
  const pillWidth = () => pillRef.current?.offsetWidth || PILL_W;

  // Keep a persisted position inside the viewport after window resizes.
  useEffect(() => {
    const onResize = () => {
      if (pomodoroWidget.x == null) return;
      const c = clampPos(pomodoroWidget.x, pomodoroWidget.y, pillWidth());
      if (c.x !== pomodoroWidget.x || c.y !== pomodoroWidget.y) setPomodoroWidget(c);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pomodoroWidget.x, pomodoroWidget.y, setPomodoroWidget]);

  const visible = (pomodoro.isRunning && !pomodoroWidget.dismissed) || (pomodoroWidget.pinned && !pomodoroWidget.dismissed);
  // Out of the way while the Scratchpad is open: both were z-[70], and on a
  // phone the pill sat on the sheet being written on. The clock above keeps
  // running; the pill comes back when the Scratchpad closes.
  const shown = visible && !scratchpadOpen;

  // While the pill shows, the page ends above it and the floating
  // notification offer and Practice's start bar sit above it: it covered
  // the last ~44px of every page (index.css, --fab-space).
  useEffect(() => {
    if (!shown) return undefined;
    const root = document.documentElement.style;
    root.setProperty('--fab-space', '4.5rem');
    return () => root.removeProperty('--fab-space');
  }, [shown]);

  if (!shown) return null;

  const onPointerDown = (e) => {
    draggedRef.current = false;
    // The play, pin and hide buttons handle their own clicks; the pill's
    // body and its open button can be dragged.
    const button = e.target.closest?.('button');
    if (button && button !== openRef.current) return;
    const origin = pomodoroWidget.x != null
      ? { x: pomodoroWidget.x, y: pomodoroWidget.y }
      : { x: (window.innerWidth || 1280) - pillWidth() - 24, y: (window.innerHeight || 800) - PILL_H - 88 };
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin, moving: false };
    // Captured at once, or a quick flick leaves the pill before its first
    // move arrives. On the open button when the press started there: the
    // click goes to the element both ends of the press were on, so capturing
    // on the pill sent a plain tap's click to the pill, not the button.
    (button || e.currentTarget).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moving) {
      if (!(Math.hypot(dx, dy) >= DRAG_PX)) return;
      drag.moving = true; // a drag from here on: its click opens nothing
      draggedRef.current = true;
    }
    setDragPos(clampPos(drag.origin.x + dx, drag.origin.y + dy, pillWidth()));
  };
  const onPointerUp = () => {
    if (dragRef.current?.moving && dragPos) setPomodoroWidget(dragPos);
    dragRef.current = null;
    setDragPos(null);
  };

  const openFocus = () => {
    if (draggedRef.current) { draggedRef.current = false; return; }
    navigate('/focus', { state: { from: location.pathname + location.search } });
  };
  const play = () => { primeChime(); startPomodoro(); };

  const pos = dragPos ?? (pomodoroWidget.x != null ? { x: pomodoroWidget.x, y: pomodoroWidget.y } : null);
  const style = pos
    ? { left: pos.x, top: pos.y }
    // Default: just above the phone's bottom bar (which includes the home-
    // indicator inset); a fixed 88px sat under it on a phone with a tall inset.
    : { right: 24, bottom: 'calc(var(--bottom-bar-h, 0px) + 1rem)' };

  const label = MODE_LABEL[pomodoro.mode] || MODE_LABEL.focus;
  const clock = formatClock(remaining);

  return (
    <div
      ref={pillRef}
      role="timer"
      aria-label={`${label} timer, ${clock} remaining`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="fixed z-[70] flex items-center gap-1 pl-1.5 pr-1.5 py-1.5 rounded-full bg-surface/95 backdrop-blur-md border border-border2 shadow-xl select-none touch-none cursor-grab active:cursor-grabbing"
      style={style}
    >
      <button
        ref={openRef}
        type="button"
        onClick={openFocus}
        title="Open the focus timer"
        className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full hover:bg-surface3 transition-colors cursor-pointer touch-target"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 motion-safe:animate-pulse ${MODE_DOT[pomodoro.mode] || MODE_DOT.focus}`} aria-hidden="true" />
        <span className="sr-only">Open the focus timer: </span>
        <span className="text-eyebrow shrink-0" style={{ color: MODE_COLOR[pomodoro.mode] || MODE_COLOR.focus }}>{label}</span>
        <span className="font-mono text-sm font-bold tabular-nums tracking-wider text-textMain">{clock}</span>
      </button>
      <button
        type="button"
        onClick={pomodoro.isRunning ? pausePomodoro : play}
        aria-label={pomodoro.isRunning ? 'Pause timer' : 'Start timer'}
        className="p-1.5 rounded-full text-muted hover:text-textMain hover:bg-surface3 transition-colors cursor-pointer touch-target inline-flex items-center justify-center"
      >
        {pomodoro.isRunning ? <Pause size={14} strokeWidth={1.75} aria-hidden="true" /> : <Play size={14} strokeWidth={1.75} aria-hidden="true" />}
      </button>
      <button
        type="button"
        onClick={() => setPomodoroWidget({ pinned: !pomodoroWidget.pinned })}
        aria-label={pomodoroWidget.pinned ? 'Unpin floating timer' : 'Pin floating timer'}
        aria-pressed={pomodoroWidget.pinned}
        className={`p-1.5 rounded-full transition-colors cursor-pointer hover:bg-surface3 touch-target inline-flex items-center justify-center ${pomodoroWidget.pinned ? 'text-[var(--accent-text)]' : 'text-muted hover:text-textMain'}`}
      >
        {pomodoroWidget.pinned ? <Pin size={14} strokeWidth={1.75} aria-hidden="true" /> : <PinOff size={14} strokeWidth={1.75} aria-hidden="true" />}
      </button>
      <button
        type="button"
        onClick={() => setPomodoroWidget({ dismissed: true, pinned: false })}
        aria-label="Hide floating timer"
        className="p-1.5 rounded-full text-muted hover:text-textMain hover:bg-surface3 transition-colors cursor-pointer touch-target inline-flex items-center justify-center"
      >
        <X size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
