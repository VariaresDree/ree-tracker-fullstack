// src/features/my-files/LocalFileViewer.jsx
//
// A file from this device, read fresh each time it opens. Its object URL goes when
// the viewer closes, so a viewed file doesn't sit in memory afterwards.
import { Suspense, useEffect, useState } from 'react';
import MediaViewer from '../../components/MediaViewer';
import { Skeleton } from '../../components/ui';
import { getDeviceFileBlob } from '../../services/deviceFiles';
import { lazy } from '../../utils/lazyWithRetry';

const PdfCanvasViewer = lazy(() => import('../../components/PdfCanvasViewer'));

const TEXT_LIMIT = 2 * 1024 * 1024;

function TextView({ blob }) {
  const [text, setText] = useState(null);
  useEffect(() => {
    let live = true;
    blob.slice(0, TEXT_LIMIT).text().then((t) => { if (live) setText(t); });
    return () => { live = false; };
  }, [blob]);
  if (text === null) return <Skeleton className="h-64" />;
  return (
    <div role="group" aria-label="File contents" tabIndex={0} className="flex-1 min-h-0 overflow-auto rounded-[var(--radius-default)] border border-border2 bg-surface2 p-4">
      <pre className="whitespace-pre-wrap break-words font-mono text-sm text-textMain">{text}</pre>
      {blob.size > TEXT_LIMIT && <p className="mt-3 text-sm text-muted2">Only the first 2 MB is shown here.</p>}
    </div>
  );
}

export default function LocalFileViewer({ uid, file }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let live = true;
    let url = null;
    getDeviceFileBlob(uid, file.id).then((blob) => {
      if (!live) return;
      if (!blob) {
        setState({ status: 'missing' });
        return;
      }
      url = URL.createObjectURL(blob);
      setState({ status: 'ready', blob, url });
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [uid, file.id]);

  if (state.status === 'loading') return <p role="status" className="p-6 text-center text-sm text-muted2">Opening {file.name}…</p>;
  if (state.status === 'missing') {
    return <p role="alert" className="p-6 text-center text-sm text-muted2">This file is no longer on this device. A browser can clear a site’s storage when it runs short of space.</p>;
  }
  if (file.kind === 'pdf') {
    return (
      <Suspense fallback={<p role="status" className="p-6 text-center text-sm text-muted2">Opening {file.name}…</p>}>
        <PdfCanvasViewer blob={state.blob} title={file.name} placeKey={`ree:pdf-place:${file.id}`} />
      </Suspense>
    );
  }
  if (file.kind === 'text') return <TextView blob={state.blob} />;
  return <MediaViewer item={{ type: file.kind, url: state.url, title: file.name, mime: file.mime }} />;
}
