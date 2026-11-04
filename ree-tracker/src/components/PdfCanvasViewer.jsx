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
import { memo, useEffect, useRef, useState } from 'react';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Button, Input } from './ui';
import { Minus, Plus, RotateCcw } from './ui/icons';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const STEP = 0.25;
const PAGE_GAP = 12;
// iOS refuses a canvas over about 16 megapixels, and it costs memory on anything.
const MAX_CANVAS_PIXELS = 12_000_000;
const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

const readPlace = (key) => {
  try {
    return Number(localStorage.getItem(key)) || 1;
  } catch {
    return 1;
  }
};
const writePlace = (key, page) => {
  try { localStorage.setItem(key, String(page)); } catch { /* a convenience */ }
};

// memo: a pinch changes the width many times a second, and a textbook has a thousand pages.
const PdfPage = memo(function PdfPage({ pdf, number, total, width, aspect, rootRef }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const [near, setNear] = useState(false);
  const [drawnAspect, setDrawnAspect] = useState(aspect);
  const [failed, setFailed] = useState(false);

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
        if (err?.name === 'RenderingCancelledException') return;
        console.warn('[PDF] A page didn’t draw.', err);
        if (live) setFailed(true);
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
      className="bg-surface shadow-sm shrink-0"
      style={{ width, height: width * drawnAspect }}
    >
      {failed
        ? <p role="alert" className="p-4 text-sm text-center" style={{ color: 'var(--accent-danger)' }}>Page {number} couldn’t be drawn here.</p>
        : near && <canvas ref={canvasRef} role="img" aria-label={`Page ${number} of ${total}`} className="block w-full h-full" />}
    </div>
  );
});

// `placeKey` remembers the page you got to, so a long book reopens where you were.
export default function PdfCanvasViewer({ blob, title, placeKey = null }) {
  const [doc, setDoc] = useState({ status: 'loading' });
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(0);
  const [current, setCurrent] = useState(1);
  const [typed, setTyped] = useState(null);
  const scrollRef = useRef(null);
  const pagesRef = useRef(null);
  const zoomRef = useRef(zoom);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  useEffect(() => {
    let live = true;
    let task = null;
    (async () => {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      // Absolute: the worker resolves it from its own address, in assets/.
      const wasmUrl = new URL('/pdfjs-wasm/', window.location.origin).href;
      task = pdfjs.getDocument({ data: await blob.arrayBuffer(), isEvalSupported: false, wasmUrl });
      const pdf = await task.promise;
      // Page 2 stands for the rest: a cover is often another shape.
      const sample = await pdf.getPage(Math.min(2, pdf.numPages));
      const natural = sample.getViewport({ scale: 1 });
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

  // Which page is in the middle of the view, by where the pages really are: they
  // aren't all one size. A search, since a book can have thousands.
  const onScroll = (e) => {
    const pages = pagesRef.current?.children;
    if (!pages?.length) return;
    const middle = e.currentTarget.scrollTop + e.currentTarget.clientHeight / 2;
    let low = 0;
    let high = pages.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (pages[mid].offsetTop - pagesRef.current.offsetTop <= middle) low = mid;
      else high = mid - 1;
    }
    setCurrent(low + 1);
    if (placeKey) writePlace(placeKey, low + 1);
  };
  const goTo = (page) => {
    const target = pagesRef.current?.children[Math.min(pagesRef.current.children.length, Math.max(1, page)) - 1];
    if (target && scrollRef.current) scrollRef.current.scrollTop = target.offsetTop - pagesRef.current.offsetTop;
  };

  // Back to where you were, once the pages have their sizes.
  const reopened = useRef(false);
  useEffect(() => {
    if (reopened.current || !width || doc.status !== 'ready' || !placeKey) return;
    reopened.current = true;
    const place = readPlace(placeKey);
    if (place > 1) goTo(place);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the sizes arrive
  }, [width, doc.status, placeKey]);

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
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <form
          className="flex items-center gap-1.5 text-sm text-muted2 tabular-nums min-w-0"
          onSubmit={(e) => {
            e.preventDefault();
            const page = Number(typed);
            if (Number.isInteger(page) && page > 0) goTo(page);
            setTyped(null);
          }}
        >
          <span>Page</span>
          <Input
            aria-label={`Go to page, of ${total}`}
            inputMode="numeric"
            autoComplete="off"
            className="shrink-0 px-2 text-center"
            style={{ width: '4.5rem' }}
            value={typed ?? String(current)}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setTyped(e.target.value.replace(/\D/g, ''))}
            onBlur={() => setTyped(null)}
          />
          <span aria-live="polite">of {total}</span>
        </form>
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
        {/* Not before the width is known: with no height, every page counts as in view,
            and a textbook would start drawing all of them at once. */}
        {width > 0 && (
          <div ref={pagesRef} className="flex flex-col items-center w-max min-w-full" style={{ gap: PAGE_GAP }}>
            {Array.from({ length: total }, (_, i) => (
              <PdfPage key={i} pdf={doc.pdf} number={i + 1} total={total} width={width} aspect={doc.aspect} rootRef={scrollRef} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
