// The PDF viewer opens its document in PDF.js's worker. Closing it while the
// file was still being read left a document opened afterwards that nothing
// destroyed: the whole PDF stayed in memory until the page reloaded.
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const destroy = vi.fn();
const getDocument = vi.fn(() => ({ promise: new Promise(() => {}), destroy }));
vi.mock('pdfjs-dist', () => ({ getDocument: (...a) => getDocument(...a), GlobalWorkerOptions: {} }));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/worker.mjs' }));

const { default: PdfCanvasViewer } = await import('./PdfCanvasViewer');

// A file whose bytes arrive when the test says, after the viewer has asked for them.
const slowBlob = () => {
  let release;
  let markAsked;
  const asked = new Promise((r) => { markAsked = r; });
  const blob = { arrayBuffer: () => { markAsked(); return new Promise((r) => { release = () => r(new ArrayBuffer(8)); }); } };
  return { blob, asked, release: () => release() };
};

describe('PdfCanvasViewer', () => {
  it('closed while the file loads, it never opens the document', async () => {
    const { blob, asked, release } = slowBlob();
    const { unmount } = render(<PdfCanvasViewer blob={blob} title="Handout" />);
    await asked;
    unmount();
    release();
    await new Promise((r) => setTimeout(r, 20));
    expect(getDocument).not.toHaveBeenCalled();
  });

  it('closed after it opened, it destroys the document', async () => {
    const { blob, asked, release } = slowBlob();
    const { unmount } = render(<PdfCanvasViewer blob={blob} title="Handout" />);
    await asked;
    release();
    await waitFor(() => expect(getDocument).toHaveBeenCalled());
    unmount();
    expect(destroy).toHaveBeenCalled();
  });
});
