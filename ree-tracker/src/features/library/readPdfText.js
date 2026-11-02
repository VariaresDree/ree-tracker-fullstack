// src/features/library/readPdfText.js
//
// A PDF's text, for Admin's question extraction and formula cards. pdf.js runs
// its own worker, so this stays on the page: inside a worker of ours it has no
// `workerSrc` to start from and no `window` to fall back on. pdf.js loads on
// first use (never add it to manualChunks: a named chunk is a static import of
// the entry, see vite.config.js).
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export const SCANNED_PDF_MESSAGE = 'This PDF looks scanned. Upload its pages as images.';
// A page of real text clears this easily; a scan yields nothing, or a stray page number.
const MIN_CHARS_PER_PAGE = 20;

/** Resolves to the text of up to `maxPages` pages; throws SCANNED_PDF_MESSAGE on a scan. */
export async function readPdfText(file, { maxPages = 10, onProgress } = {}) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const task = pdfjs.getDocument({ data: await file.arrayBuffer(), disableFontFace: true });
  try {
    const pdf = await task.promise;
    const count = Math.min(pdf.numPages, maxPages);
    const pages = [];
    for (let i = 1; i <= count; i += 1) {
      onProgress?.(`Reading page ${i} of ${count}…`);
      const page = await pdf.getPage(i);
      const { items } = await page.getTextContent();
      pages.push(items.map((item) => item.str).join(' '));
    }
    const text = pages.join('\n\n');
    if (text.replace(/\s/g, '').length < MIN_CHARS_PER_PAGE * count) throw new Error(SCANNED_PDF_MESSAGE);
    return text;
  } finally {
    await task.destroy();
  }
}
