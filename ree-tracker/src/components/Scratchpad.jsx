// src/components/Scratchpad.jsx
//
// A sketch layer over the question, for working a problem by hand.
//
// It is a named dialog: it takes focus when it opens, Escape closes it, and
// focus goes back to whatever opened it. It is not modal — the question under
// it stays readable.
//
// The canvas backing store is sized in DEVICE pixels from the canvas's own box.
// It used to take the PARENT's CSS size (which includes the header bar), so the
// stroke was stretched and drawn blurry on every high-density phone, and the
// touch path scaled coordinates a second time, so lines landed away from the
// finger. Pointer events cover mouse, touch and stylus in one path.
import { useEffect, useRef } from 'react';

const PEN_WIDTH = 3;

export default function Scratchpad({ isOpen, onClose }) {
  const panelRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  // The latest onClose for the Escape listener, without re-running the dialog
  // effect (and re-grabbing focus) every time the parent re-renders.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  const ctx = () => canvasRef.current?.getContext?.('2d') || null;

  // Canvas 2D can't resolve CSS variables, so read the design-system accent and
  // pass the computed colour (keeps the stroke themable instead of a hex).
  const pen = (c) => {
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = PEN_WIDTH;
    c.strokeStyle = getComputedStyle(canvasRef.current || document.documentElement)
      .getPropertyValue('--accent-signal').trim() || '#06b6d4';
  };

  // Fit the backing store to the canvas box at the device pixel ratio, keeping
  // what has been drawn across a resize or rotation.
  useEffect(() => {
    if (!isOpen) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let cssSize = null;
    const fit = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const dpr = window.devicePixelRatio || 1;
      const c = ctx();
      let snapshot = null;
      if (c && cssSize) {
        snapshot = document.createElement('canvas');
        snapshot.width = canvas.width;
        snapshot.height = canvas.height;
        snapshot.getContext('2d')?.drawImage(canvas, 0, 0);
      }
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      if (c) {
        c.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS px
        pen(c);
        if (snapshot) c.drawImage(snapshot, 0, 0, cssSize.width, cssSize.height);
      }
      cssSize = { width, height };
    };
    fit();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    observer?.observe(canvas);
    return () => observer?.disconnect();
  }, [isOpen]);

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

  const point = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const startStroke = (e) => {
    const c = ctx();
    if (!c) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const [x, y] = point(e);
    c.beginPath();
    c.moveTo(x, y);
    drawingRef.current = true;
  };
  const continueStroke = (e) => {
    if (!drawingRef.current) return;
    const c = ctx();
    if (!c) return;
    const [x, y] = point(e);
    c.lineTo(x, y);
    c.stroke();
  };
  const endStroke = () => { drawingRef.current = false; };

  const clearCanvas = () => {
    const c = ctx();
    const canvas = canvasRef.current;
    if (!c || !canvas) return;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.restore();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Scratchpad"
      tabIndex={-1}
      // A bottom sheet on phones (the page under it can be far taller than
      // the screen, and the canvas sized itself to all of it); over the
      // question area from md up.
      className="fixed inset-x-0 bottom-0 h-[85dvh] z-[70] md:absolute md:inset-0 md:h-auto md:z-[40] bg-surface/95 md:bg-surface/40 backdrop-blur-sm border-2 border-reeCyan rounded-t-xl md:rounded-xl overflow-hidden flex flex-col page-fade-in"
    >
      <div className="flex justify-between items-center p-2 bg-bg/90 border-b border-border2 pointer-events-auto">
        <span className="text-eyebrow flex items-center gap-2" style={{ color: 'var(--accent-signal)' }}>
          Scratchpad
        </span>
        <div className="flex gap-2">
          <button onClick={clearCanvas} className="px-3 py-1 bg-surface2 hover:bg-surface3 text-textMain rounded-[var(--radius-sm)] text-[11px] font-bold uppercase transition-colors shadow-sm cursor-pointer touch-target inline-flex items-center justify-center">
            Clear
          </button>
          <button onClick={onClose} className="px-3 py-1 bg-[var(--accent-danger)] hover:brightness-110 text-white rounded-[var(--radius-sm)] text-[11px] font-bold uppercase transition-all shadow-sm cursor-pointer touch-target inline-flex items-center justify-center">
            Close
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        aria-label="Drawing area"
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
