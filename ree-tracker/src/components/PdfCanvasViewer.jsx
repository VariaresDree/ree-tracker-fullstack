// src/components/PdfCanvasViewer.jsx
//
// A PDF from this device, drawn with pdf.js. A local PDF in a frame can't be relied
// on in phone browsers, so this draws the pages itself: only those near the view,
// redrawn sharp after a zoom. Buttons, a pinch or ctrl and the wheel all zoom. Load
// it lazily (pdf.js is large), and never add pdf.js to manualChunks: see
// vite.config.js. The worker is precached, so this opens offline.
//
// shortcut: the whole file is read into memory, which a 200 MB PDF may not survive
// on a small phone. A PDFDataRangeTransport over Blob.slice would fix that.
import { useCallback, useEffect, useRef, useState } from 'react';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Button } from './ui';
import { Minus, Plus, RotateCcw } from './ui/icons';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const STEP = 0.25;
const PAGE_GAP = 12;
// iOS refuses a canvas over about 16 megapixels, and it costs memory on anything.
const MAX_CANVAS_PIXELS = 12_000_000;
const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

function PdfPage({ pdf, number, total, width, aspect, rootRef }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const [near, setNear] = useState(false);
  const [drawnAspect, setDrawnAspect] = useState(aspect);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { root: rootRef.current, rootMargin: '100% 0px' },
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, [rootRef]);

  useEffect(() => {
    if (!near || !width) return undefined;
    let live = true;
    let task = null;
    // After a zoom settles: a pinch changes this on every move.
    const timer = setTimeout(async () => {
      try {
        const page = await pdf.getPage(number);
        if (!live) return;
        const natural = page.getViewport({ scale: 1 });
        setDrawnAspect(natural.height / natural.width);
        const dpr = window.devicePixelRatio || 1;
        let scale = (width / natural.width) * dpr;
        const pixels = natural.width * natural.height * scale * scale;
        if (pixels > MAX_CANVAS_PIXELS) scale *= Math.sqrt(MAX_CANVAS_PIXELS / pixels);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        task = page.render({ canvas, viewport });
        await task.promise;
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') console.warn('[PDF] A page didn’t draw.', err);
      }
    }, 120);
    return () => {
      live = false;
      clearTimeout(timer);
      task?.cancel();
    };
  }, [near, pdf, number, width]);

  return (
    <div
      ref={boxRef}
      className="bg-white shadow-sm shrink-0"
      style={{ width, height: width * drawnAspect }}
    >
      {near && <canvas ref={canvasRef} role="img" aria-label={`Page ${number} of ${total}`} className="block w-full h-full" />}
    </div>
  );
}

export default function PdfCanvasViewer({ blob, title }) {
  const [doc, setDoc] = useState({ status: 'loading' });
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(0);
  const [current, setCurrent] = useState(1);
  const scrollRef = useRef(null);
  const zoomRef = useRef(zoom);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  useEffect(() => {
    let live = true;
    let task = null;
    (async () => {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      task = pdfjs.getDocument({ data: await blob.arrayBuffer(), isEvalSupported: false });
      const pdf = await task.promise;
      const first = await pdf.getPage(1);
      const natural = first.getViewport({ scale: 1 });
      if (live) setDoc({ status: 'ready', pdf, aspect: natural.height / natural.width });
    })().catch((err) => {
      if (live) setDoc({ status: err?.name === 'PasswordException' ? 'password' : 'failed' });
    });
    return () => {
      live = false;
      task?.destroy();
    };
  }, [blob]);

  // Fit to the room there is, and follow a rotated phone.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => setFitWidth(Math.max(0, el.clientWidth - 2 * PAGE_GAP)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [doc.status]);

  // Pinch and ctrl-wheel. Not passive, or they couldn't stop the page zooming too.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    let pinch = null;
    const distance = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e) => {
      if (e.touches.length === 2) pinch = { from: distance(e.touches), zoom: zoomRef.current };
    };
    const onMove = (e) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      setZoom(clampZoom((pinch.zoom * distance(e.touches)) / pinch.from));
    };
    const onEnd = (e) => { if (e.touches.length < 2) pinch = null; };
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(clampZoom(zoomRef.current * (e.deltaY < 0 ? 1.1 : 0.9)));
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('wheel', onWheel);
    };
  }, [doc.status]);

  const width = fitWidth * zoom;
  const onScroll = useCallback((e) => {
    if (doc.status !== 'ready' || !width) return;
    const pageHeight = width * doc.aspect + PAGE_GAP;
    setCurrent(Math.min(doc.pdf.numPages, Math.floor((e.currentTarget.scrollTop + e.currentTarget.clientHeight / 2) / pageHeight) + 1));
  }, [doc, width]);

  if (doc.status === 'failed' || doc.status === 'password') {
    return (
      <p role="alert" className="p-6 text-center text-sm text-muted2">
        {doc.status === 'password' ? 'This PDF has a password, so it can’t be shown here.' : 'This file couldn’t be read as a PDF.'}
      </p>
    );
  }
  if (doc.status === 'loading') {
    return <p role="status" className="p-6 text-center text-sm text-muted2">Opening {title}…</p>;
  }

  const total = doc.pdf.numPages;
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <span className="text-sm text-muted2 tabular-nums" aria-live="polite">Page {current} of {total}</span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="secondary" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => setZoom((z) => clampZoom(z - STEP))}>
            <Minus size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
          <span className="text-xs text-muted2 w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="secondary" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => setZoom((z) => clampZoom(z + STEP))}>
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
          <Button size="icon" variant="secondary" aria-label="Fit to width" title="Fit to width" disabled={zoom === 1} onClick={() => setZoom(1)}>
            <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        role="group"
        aria-label={title}
        tabIndex={0}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-auto rounded-[var(--radius-default)] border border-border2 bg-surface2"
        style={{ touchAction: 'pan-x pan-y', padding: PAGE_GAP }}
      >
        <div className="flex flex-col items-center w-max min-w-full" style={{ gap: PAGE_GAP }}>
          {Array.from({ length: total }, (_, i) => (
            <PdfPage key={i} pdf={doc.pdf} number={i + 1} total={total} width={width} aspect={doc.aspect} rootRef={scrollRef} />
          ))}
        </div>
      </div>
    </div>
  );
}
