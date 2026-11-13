// src/components/Scratchpad.jsx
//
// A sketch pad for working a problem by hand.
//
// It is a named dialog: it takes focus when it opens, Escape closes it, and
// focus goes back to whatever opened it. It is not modal: the question stays
// readable.
//
// 2026-11-13:
//   - What you draw is kept per question (`persistKey`, scratchpadStore.js):
//     closing the pad unmounted the canvas and threw the work away.
//   - On a wide screen, or a phone or tablet turned sideways, it docks beside
//     the question (the page makes room, `.scratchpad-docked` in index.css).
//     It used to cover the whole question area from md up, under a blur, so
//     the question being solved was hard to read. On a phone held upright it
//     stays a sheet at the bottom, with the question above it. No blur either way.
//   - Undo, Clear (undone by Undo straight after), and an eraser.
//
// The canvas backing store is sized in DEVICE pixels from the canvas's own box,
// and strokes are redrawn from their points, so lines stay sharp and land under
// the finger on any screen. Pointer events cover mouse, touch and stylus.
import { useEffect, useRef, useState } from 'react';
import { useOverlays } from '../store/overlays';
import useMediaQuery from '../hooks/useMediaQuery';
import { Button, SegmentedControl } from './ui';
import { Undo2, Trash2, X } from './ui/icons';
import { getStrokes, setStrokes } from './scratchpadStore';

const PEN_WIDTH = 3;
const ERASER_WIDTH = 22;
// Beside the question: wide screens, and any phone or tablet held sideways.
export const DOCK_QUERY = '(min-width: 1024px), (orientation: landscape) and (min-width: 640px)';
const DOCK_WIDTH = 'min(45vw, 520px)';
const round = (n) => Math.round(n * 10) / 10;

/** One pad per question: a new `persistKey` remounts it with that question's strokes. */
export default function Scratchpad(props) {
  return <ScratchpadPanel key={props.persistKey ?? ''} {...props} />;
}

function ScratchpadPanel({ isOpen, onClose, persistKey = null }) {
  const panelRef = useRef(null);
  const canvasRef = useRef(null);
  const currentRef = useRef(null);
  const [strokes, setStrokeList] = useState(() => getStrokes(persistKey));
  const [cleared, setCleared] = useState(null); // what Clear removed, until the next stroke
  const [tool, setTool] = useState('pen');
  const docked = useMediaQuery(DOCK_QUERY);
  // The latest strokes for the resize observer and the pointer handlers.
  const strokesRef = useRef(strokes);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);

  // The floating Pomodoro pill hides while this is open (same z-[70] on a
  // phone, and it covered the corner of the sheet).
  const setScratchpadOpen = useOverlays((s) => s.setScratchpadOpen);
  useEffect(() => {
    if (!isOpen) return undefined;
    setScratchpadOpen(true);
    return () => setScratchpadOpen(false);
  }, [isOpen, setScratchpadOpen]);

  // Docked: the page makes room on the right (index.css .scratchpad-docked).
  useEffect(() => {
    if (!isOpen || !docked) return undefined;
    const root = document.documentElement;
    root.style.setProperty('--scratchpad-w', DOCK_WIDTH);
    root.classList.add('scratchpad-docked');
    return () => {
      root.classList.remove('scratchpad-docked');
      root.style.removeProperty('--scratchpad-w');
    };
  }, [isOpen, docked]);

  // The latest onClose for the Escape listener, without re-running the dialog
  // effect (and re-grabbing focus) every time the parent re-renders.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  const ctx = () => canvasRef.current?.getContext?.('2d') || null;

  // Canvas 2D can't resolve CSS variables, so read the design-system accent and
  // pass the computed colour (keeps the stroke themable instead of a hex).
  const styleFor = (c, stroke) => {
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
    c.lineWidth = stroke.erase ? ERASER_WIDTH : PEN_WIDTH;
    c.strokeStyle = getComputedStyle(canvasRef.current || document.documentElement)
      .getPropertyValue('--accent-signal').trim() || '#06b6d4';
  };

  const cssWidth = () => canvasRef.current?.getBoundingClientRect().width || 1;

  const drawStroke = (c, stroke, from = 0) => {
    const s = cssWidth() / (stroke.w || 1);
    const p = stroke.pts;
    if (p.length < 2) return;
    styleFor(c, stroke);
    c.beginPath();
    const start = Math.max(0, from - 2);
    c.moveTo(p[start] * s, p[start + 1] * s);
    if (p.length === 2) c.lineTo(p[0] * s + 0.01, p[1] * s); // a dot
    for (let i = start + 2; i < p.length; i += 2) c.lineTo(p[i] * s, p[i + 1] * s);
    c.stroke();
  };

  const redraw = () => {
    const c = ctx();
    const canvas = canvasRef.current;
    if (!c || !canvas) return;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.restore();
    for (const stroke of strokesRef.current) drawStroke(c, stroke);
  };

  // Fit the backing store to the canvas box at the device pixel ratio, and
  // redraw the strokes at the new size (a resize, a rotation, docking).
  useEffect(() => {
    if (!isOpen) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const fit = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx()?.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS px
      redraw();
    };
    fit();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    observer?.observe(canvas);
    return () => observer?.disconnect();
    // redraw reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, docked]);

  // Undo, Clear: draw what's kept now.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (isOpen) redraw(); }, [strokes]);

  // Dialog behaviour: focus in, Escape out, focus back to the opener.
  useEffect(() => {
    if (!isOpen) return undefined;
    const opener = document.activeElement;
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener?.isConnected) opener.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  const keep = (next) => {
    strokesRef.current = next;
    setStrokes(persistKey, next);
    setStrokeList(next);
  };

  const point = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [round(e.clientX - r.left), round(e.clientY - r.top)];
  };
  const startStroke = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    currentRef.current = { w: round(cssWidth()), erase: tool === 'eraser', pts: point(e) };
    const c = ctx();
    if (c) drawStroke(c, currentRef.current);
  };
  const continueStroke = (e) => {
    const stroke = currentRef.current;
    if (!stroke) return;
    stroke.pts.push(...point(e));
    const c = ctx();
    if (c) drawStroke(c, stroke, stroke.pts.length - 2);
  };
  const endStroke = () => {
    const stroke = currentRef.current;
    if (!stroke) return;
    currentRef.current = null;
    setCleared(null);
    keep([...strokesRef.current, stroke]);
  };

  const undo = () => {
    if (cleared) {
      keep(cleared);
      setCleared(null);
    } else if (strokes.length) {
      keep(strokes.slice(0, -1));
    }
  };

  const clearCanvas = () => {
    if (!strokes.length) return;
    setCleared(strokes);
    keep([]);
  };

  if (!isOpen) return null;

  const canUndo = strokes.length > 0 || !!cleared;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Scratchpad"
      tabIndex={-1}
      data-docked={docked ? 'true' : 'false'}
      className={docked
        // Beside the question, between the phone header and the bottom bar
        // (both 0 where there are none).
        ? 'fixed right-0 top-[var(--phone-header-h,0px)] bottom-[var(--bottom-bar-h,0px)] z-[70] w-[var(--scratchpad-w)] bg-surface border-l-2 border-reeCyan flex flex-col page-fade-in'
        // A sheet on a phone held upright, short enough to read the question
        // above it. See-through, so you can write over the question, without a blur.
        : 'fixed inset-x-0 bottom-0 h-[60dvh] z-[70] bg-surface/80 border-2 border-reeCyan rounded-t-[var(--radius-lg)] overflow-hidden flex flex-col page-fade-in'}
    >
      <div className="flex flex-col gap-2 p-2 bg-bg/90 border-b border-border2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-eyebrow" style={{ color: 'var(--accent-signal)' }}>Scratchpad</span>
          <Button size="sm" variant="secondary" onClick={onClose} className="touch-target">
            <X size={14} strokeWidth={1.75} aria-hidden="true" /> Close
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            size="sm"
            label="Tool"
            value={tool}
            onChange={setTool}
            options={[{ value: 'pen', label: 'Pen' }, { value: 'eraser', label: 'Eraser' }]}
          />
          <Button size="sm" variant="secondary" onClick={undo} disabled={!canUndo} className="touch-target">
            <Undo2 size={14} strokeWidth={1.75} aria-hidden="true" /> Undo
          </Button>
          <Button size="sm" variant="secondary" onClick={clearCanvas} disabled={strokes.length === 0} className="touch-target">
            <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" /> Clear
          </Button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        aria-label={tool === 'eraser' ? 'Drawing area, eraser' : 'Drawing area'}
        onPointerDown={startStroke}
        onPointerMove={continueStroke}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={endStroke}
        className="flex-1 w-full min-h-0 cursor-crosshair touch-none"
      />
    </div>
  );
}
