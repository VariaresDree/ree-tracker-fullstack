// src/components/MediaViewer.jsx
import { useState } from 'react';
import ZoomableImage from './ZoomableImage';
import { Button } from './ui';
import { AudioWaveform, ExternalLink, Minus, Plus } from './ui/icons';
import { externalPdfUrl, isDriveUrl, normalizePdfUrl } from '../utils/pdfUrl';

const extractYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const ZOOM_MIN = 100;
const ZOOM_MAX = 250;
const ZOOM_STEP = 50;

function OpenExternally({ href, label }) {
  return (
    <Button as="a" size="sm" variant="secondary" href={href} target="_blank" rel="noopener noreferrer">
      <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" /> {label}
    </Button>
  );
}

// A PDF in a frame: Drive's viewer, or the browser's own. Another site's frame
// can't be zoomed from here, and both bring their own zoom on a computer, at the
// foot of the frame or the top (so nothing may clip it). On a phone neither
// shows any, and Drive refits its page to the frame's width: widening the frame
// enlarges the page, sharply, and the box around it scrolls.
function PdfFrame({ url, title }) {
  const [zoom, setZoom] = useState(ZOOM_MIN);
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 sm:hidden">
          <Button size="icon" variant="secondary" aria-label="Zoom out" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((z) => z - ZOOM_STEP)}>
            <Minus size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
          <span className="text-xs text-muted2 w-12 text-center tabular-nums" aria-live="polite">{zoom}%</span>
          <Button size="icon" variant="secondary" aria-label="Zoom in" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((z) => z + ZOOM_STEP)}>
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>
        <div className="ml-auto">
          <OpenExternally href={externalPdfUrl(url)} label={isDriveUrl(url) ? 'Open in Drive' : 'Open in a new tab'} />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto rounded-[var(--radius-default)] border border-border2 bg-surface2">
        <iframe
          src={normalizePdfUrl(url)}
          className="block h-full border-0"
          style={{ width: `${zoom}%` }}
          title={title}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export default function MediaViewer({ item }) {
  if (!item) return null;

  switch (item.type) {
    case 'video': {
      let embedUrl = item.url;
      if (item.url.includes('youtube.com') || item.url.includes('youtu.be')) {
        const videoId = extractYouTubeId(item.url);
        if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
      return (
        <div className="w-full aspect-video rounded-[var(--radius-lg)] overflow-hidden border border-border2 shadow-lg bg-black">
          <iframe
            width="100%" height="100%" src={embedUrl} title={item.title} frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      );
    }

    case 'audio':
      return (
        <div className="w-full p-6 bg-surface border border-border2 rounded-[var(--radius-lg)] shadow-sm flex flex-col items-center gap-4 mt-8">
          <div className="w-20 h-20 rounded-full bg-reePurple/10 border border-reePurple/30 flex items-center justify-center text-[var(--brand-purple-text)]"><AudioWaveform size={32} strokeWidth={1.5} aria-hidden="true" /></div>
          <div className="text-sm font-bold text-textMain text-center mt-2 [overflow-wrap:anywhere]">{item.title}</div>
          <div className="text-micro font-mono text-muted uppercase tracking-widest -mt-2">Audio</div>
          <audio controls className="w-full max-w-md mt-4 custom-audio-player">
            {item.mime ? <source src={item.url} type={item.mime} /> : (
              <>
                <source src={item.url} type="audio/mpeg" />
                <source src={item.url} type="audio/wav" />
                <source src={item.url} type="audio/ogg" />
              </>
            )}
          </audio>
        </div>
      );

    case 'image':
      return (
        <div className="w-full flex-1 min-h-0">
          <ZoomableImage src={item.url} alt={item.title} />
        </div>
      );

    case 'pdf':
      return <PdfFrame url={item.url} title={item.title} />;

    default:
      return (
        <div className="p-8 text-center border-2 border-dashed border-border2 rounded-[var(--radius-lg)] text-muted2 text-sm mt-8 flex flex-col items-center gap-4">
          <p>This file type can't be shown here.</p>
          <OpenExternally href={item.url} label="Open in a new tab" />
        </div>
      );
  }
}
