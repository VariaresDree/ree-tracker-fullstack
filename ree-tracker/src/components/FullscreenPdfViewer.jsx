// src/components/FullscreenPdfViewer.jsx
// Chrome-free, whole-screen PDF viewer for the Materials Hub. Shows ONLY the
// PDF (Drive /preview or a hosted #toolbar=0 iframe) edge-to-edge, with a
// minimal floating control cluster (Close + Zoom on/off). Zoom enlarges the
// iframe past the viewport and lets the surrounding container pan via native
// scroll — works for both Drive (whose own chrome we can't strip) and hosted
// PDFs. Rendered through a portal so it escapes the page layout.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Minimize2 } from './ui/icons';
import { normalizePdfUrl } from '../utils/pdfUrl';

export default function FullscreenPdfViewer({ url, title = 'Document', onClose }) {
  const [zoomed, setZoomed] = useState(false);
  const closeBtnRef = useRef(null);
  const src = normalizePdfUrl(url);

  // Escape to exit + body scroll lock + focus the close control on open, and
  // restore focus to the trigger on close (WCAG 2.4.3).
  useEffect(() => {
    const prevActive = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (prevActive && typeof prevActive.focus === 'function') prevActive.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[300] bg-black overflow-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — fullscreen PDF viewer`}
    >
      {/* Zoomed = the iframe wrapper grows past the viewport; the fixed parent
          scrolls to pan. Off = fit to screen. */}
      <div
        className="min-w-full min-h-full transition-[width,height] duration-200"
        style={{ width: zoomed ? '160%' : '100%', height: zoomed ? '160%' : '100%' }}
      >
        <iframe
          src={src}
          title={title}
          className="w-full h-full border-0 block bg-black"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>

      {/* Floating controls — kept minimal + off the PDF content, always reachable. */}
      <div className="fixed top-3 right-3 z-[310] flex items-center gap-2">
        <button
          type="button"
          onClick={() => setZoomed((z) => !z)}
          aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
          aria-pressed={zoomed}
          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-[var(--radius-default)] bg-surface/90 backdrop-blur-md border border-border2 text-textMain text-sm font-medium shadow-lg hover:bg-surface2 btn-press cursor-pointer"
        >
          {zoomed
            ? <><Minimize2 size={16} strokeWidth={1.75} aria-hidden="true" /> Zoom out</>
            : <><Maximize2 size={16} strokeWidth={1.75} aria-hidden="true" /> Zoom in</>}
        </button>
        <button
          type="button"
          ref={closeBtnRef}
          onClick={() => onClose?.()}
          aria-label="Close fullscreen viewer"
          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-[var(--radius-default)] bg-surface/90 backdrop-blur-md border border-border2 text-textMain text-sm font-medium shadow-lg hover:bg-surface2 btn-press cursor-pointer"
        >
          <X size={16} strokeWidth={1.75} aria-hidden="true" /> Close
        </button>
      </div>
    </div>,
    document.body,
  );
}
