// src/components/MediaViewer.jsx
import { useState } from 'react';
import ZoomableImage from './ZoomableImage';
import { Button } from './ui';
import { AudioWaveform, ExternalLink, Globe, Minus, Plus } from './ui/icons';
import { externalPdfUrl, isDriveUrl, normalizePdfUrl } from '../utils/pdfUrl';
import { driveFolderId, folderEmbedUrl, folderOpenUrl, googleDocPreview, linkHost, youtubeEmbed } from '../features/materials/handoutLink';

const ZOOM_MIN = 100;
const ZOOM_MAX = 250;
const ZOOM_STEP = 50;

function OpenExternally({ href, label, variant = 'secondary' }) {
  return (
    <Button as="a" size="sm" variant={variant} href={href} target="_blank" rel="noopener noreferrer">
      <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" /> {label}
    </Button>
  );
}

// A PDF in a frame: Drive's viewer, or the browser's own. Another site's frame
// can't be zoomed from here, and both bring their own zoom on a computer, at the
// foot of the frame or the top (so nothing may clip it). On a phone neither
// shows any, and Drive refits its page to the frame's width: widening the frame
// enlarges the page, sharply, and the box around it scrolls.
// Also Google's previews of a Docs file and a Drive folder's file list: each
// passes its own frame src and its way out.
function PdfFrame({ url, title, src = normalizePdfUrl(url), openHref = externalPdfUrl(url), openLabel = isDriveUrl(url) ? 'Open in Drive' : 'Open in a new tab', note = null, zoomable = true }) {
  const [zoom, setZoom] = useState(ZOOM_MIN);
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <div className="flex items-center justify-between gap-2 shrink-0">
        {zoomable && <div className="flex items-center gap-1 sm:hidden">
          <Button size="icon" variant="secondary" aria-label="Zoom out" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((z) => z - ZOOM_STEP)}>
            <Minus size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
          <span className="text-xs text-muted2 w-12 text-center tabular-nums" aria-live="polite">{zoom}%</span>
          <Button size="icon" variant="secondary" aria-label="Zoom in" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((z) => z + ZOOM_STEP)}>
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>}
        <div className="ml-auto">
          <OpenExternally href={openHref} label={openLabel} />
        </div>
      </div>
      {note && <p className="text-xs text-muted2 shrink-0">{note}</p>}
      <div className="flex-1 min-h-0 overflow-auto rounded-[var(--radius-default)] border border-border2 bg-surface2">
        <iframe
          src={src}
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

// A website can't be shown inside the app (most refuse to be framed), so it
// opens in the browser.
function WebLink({ url }) {
  return (
    <div className="p-8 text-center border border-border2 rounded-[var(--radius-lg)] bg-surface mt-8 flex flex-col items-center gap-4">
      <Globe size={32} strokeWidth={1.5} aria-hidden="true" className="text-muted" />
      <div className="flex flex-col gap-1 min-w-0 max-w-full">
        <p className="text-sm font-bold text-textMain [overflow-wrap:anywhere]">{linkHost(url) || url}</p>
        <p className="text-sm text-muted2">This site opens in your browser.</p>
      </div>
      <OpenExternally href={url} label="Open the site" variant="primary" />
    </div>
  );
}

export default function MediaViewer({ item }) {
  if (!item) return null;

  switch (item.type) {
    case 'video': {
      const embedUrl = youtubeEmbed(item.url) || item.url;
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

    case 'folder': {
      const id = driveFolderId(item.url);
      if (!id) return <WebLink url={item.url} />;
      return (
        <PdfFrame
          url={item.url} title={item.title} src={folderEmbedUrl(id)} openHref={folderOpenUrl(id)} openLabel="Open in Google Drive" zoomable={false}
          note="Tap a file to open it. If the list stays empty, open the folder in Google Drive."
        />
      );
    }

    case 'doc':
      return <PdfFrame url={item.url} title={item.title} src={googleDocPreview(item.url) || item.url} openHref={item.url} openLabel="Open in Google" />;

    case 'link':
      return <WebLink url={item.url} />;

    default:
      return (
        <div className="p-8 text-center border-2 border-dashed border-border2 rounded-[var(--radius-lg)] text-muted2 text-sm mt-8 flex flex-col items-center gap-4">
          <p>This file type can't be shown here.</p>
          <OpenExternally href={item.url} label="Open in a new tab" />
        </div>
      );
  }
}
