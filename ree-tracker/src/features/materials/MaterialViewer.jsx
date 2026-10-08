// src/features/materials/MaterialViewer.jsx
//
// The in-page viewer for a handout (PDF, image, audio, video, link): close,
// fullscreen, and a chrome-free whole-screen PDF mode. Shared by the learner
// Library and the Admin handouts tab.
import { useState } from 'react';
import { Button, Badge } from '../../components/ui';
import { X, Maximize2, Minimize2 } from '../../components/ui/icons';
import MediaViewer from '../../components/MediaViewer';
import FullscreenPdfViewer from '../../components/FullscreenPdfViewer';

// `headingLevel`: 1 where the viewer replaces the page (Library), 2 inside a
// page that has its own h1 (Admin).
export default function MaterialViewer({ material, onClose, headingLevel = 1 }) {
  const Heading = `h${headingLevel}`;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfFullscreen, setPdfFullscreen] = useState(false);
  const isPdf = material?.type === 'pdf';

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-[200] bg-bg flex flex-col w-full h-full animate-in fade-in' : 'flex flex-col h-[85vh] page-fade-in w-full max-w-6xl mx-auto pt-4'}>
      <div className={`flex justify-between items-center p-4 bg-surface border-b border-border2 shadow-sm z-10 ${isFullscreen ? '' : 'rounded-t-[var(--radius-lg)] border-x border-t'}`}>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={() => { setIsFullscreen(false); onClose(); }}>
            <X size={14} strokeWidth={1.75} aria-hidden="true" /> Close viewer
          </Button>
          {isPdf ? (
            <Button variant="secondary" size="sm" onClick={() => setPdfFullscreen(true)}>
              <Maximize2 size={14} strokeWidth={1.75} aria-hidden="true" /> Fullscreen PDF
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen
                ? <><Minimize2 size={14} strokeWidth={1.75} aria-hidden="true" /> Exit fullscreen</>
                : <><Maximize2 size={14} strokeWidth={1.75} aria-hidden="true" /> Fullscreen</>}
            </Button>
          )}
        </div>
        <div className="flex flex-col items-end min-w-0">
          <Heading title={material.name} className="font-bold text-sm text-textMain tracking-wide block truncate max-w-full">{material.name}</Heading>
          <Badge tone="signal" className="mt-1 uppercase">{material.type}</Badge>
        </div>
      </div>

      <div className={`flex-1 bg-bg relative overflow-hidden ${isFullscreen ? '' : 'border-x border-b border-border2 rounded-b-xl'}`}>
        <MediaViewer item={{ type: material.type, url: material.url, title: material.name }} />
      </div>

      {pdfFullscreen && isPdf && (
        <FullscreenPdfViewer url={material.url} title={material.name} onClose={() => setPdfFullscreen(false)} />
      )}
    </div>
  );
}
