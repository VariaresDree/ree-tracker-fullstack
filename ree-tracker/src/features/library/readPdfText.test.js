// The one PDF reader behind Admin's question extraction and formula cards.
// pdf.js itself is stubbed here: jsdom can't run its worker, so the real load
// is covered by e2e-authed/pdfExtraction.spec.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const destroy = vi.fn();
let pages = [];
const getDocument = vi.fn(() => ({
  promise: Promise.resolve({
    numPages: pages.length,
    getPage: async (n) => ({ getTextContent: async () => ({ items: [{ str: pages[n - 1] }] }) }),
  }),
  destroy,
}));
const GlobalWorkerOptions = { workerSrc: '' };
vi.mock('pdfjs-dist', () => ({ getDocument: (...a) => getDocument(...a), GlobalWorkerOptions }));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/assets/pdf.worker.test.mjs' }));

const { readPdfText, SCANNED_PDF_MESSAGE } = await import('./readPdfText');

const file = () => ({ arrayBuffer: async () => new ArrayBuffer(8) });
const WORDS = 'The power factor of a series circuit is the ratio of resistance to impedance.';

beforeEach(() => {
  destroy.mockClear();
  getDocument.mockClear();
  GlobalWorkerOptions.workerSrc = '';
  pages = [WORDS, WORDS];
});

describe('readPdfText', () => {
  it('points pdf.js at its worker before opening the file', async () => {
    getDocument.mockImplementationOnce(() => {
      expect(GlobalWorkerOptions.workerSrc).toBe('/assets/pdf.worker.test.mjs');
      return { promise: Promise.resolve({ numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: WORDS }] }) }) }), destroy };
    });
    await readPdfText(file());
    expect(getDocument).toHaveBeenCalledTimes(1);
  });

  it('returns the text of each page and reports progress', async () => {
    const seen = [];
    const text = await readPdfText(file(), { onProgress: (m) => seen.push(m) });
    expect(text).toBe(`${WORDS}\n\n${WORDS}`);
    expect(seen).toEqual(['Reading page 1 of 2…', 'Reading page 2 of 2…']);
  });

  it('stops at maxPages', async () => {
    pages = [WORDS, WORDS, WORDS];
    expect(await readPdfText(file(), { maxPages: 1 })).toBe(WORDS);
  });

  it('refuses a scanned PDF instead of handing the model an empty text', async () => {
    pages = ['', ' ', '12'];
    await expect(readPdfText(file())).rejects.toThrow(SCANNED_PDF_MESSAGE);
  });

  it('frees the document, also when reading fails', async () => {
    await readPdfText(file());
    expect(destroy).toHaveBeenCalledTimes(1);
    pages = [''];
    await readPdfText(file()).catch(() => {});
    expect(destroy).toHaveBeenCalledTimes(2);
  });
});
