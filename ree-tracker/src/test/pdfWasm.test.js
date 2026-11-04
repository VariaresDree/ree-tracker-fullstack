// src/test/pdfWasm.test.js
// A pdf.js upgrade could rename these, and the build would fail, or scans would go
// blank. Fail here first, with the reason.
import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { PDF_WASM_FILES, pdfWasmPlugin, pdfWasmSource } from '../../scripts/pdfWasmPlugin.js';

describe('pdf.js image decoders', () => {
  it.each(PDF_WASM_FILES)('%s is in the package', (name) => {
    expect(existsSync(pdfWasmSource(name))).toBe(true);
    expect(statSync(pdfWasmSource(name)).size).toBeGreaterThan(1000);
  });

  it('every one goes into the build, where the precache will find it', () => {
    const emitted = [];
    pdfWasmPlugin().generateBundle.call({ emitFile: (f) => emitted.push(f.fileName) });
    expect(emitted).toEqual(PDF_WASM_FILES.map((n) => `pdfjs-wasm/${n}`));
  });
});
