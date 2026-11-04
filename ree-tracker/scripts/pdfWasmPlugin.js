// pdf.js decodes some images with WebAssembly, fetched from `wasmUrl` at run time:
// JBIG2 (what many black-and-white scanners write), JPEG 2000, and ICC colour.
// Without these, a scanned page comes out blank. They ship in the package, not the
// bundle, so this copies them into the build, where the service worker precaches them.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

export const PDF_WASM_DIR = 'pdfjs-wasm';
export const PDF_WASM_FILES = ['jbig2.wasm', 'openjpeg.wasm', 'qcms_bg.wasm'];

const require = createRequire(import.meta.url);

export const pdfWasmSource = (name) => join(dirname(require.resolve('pdfjs-dist/package.json')), 'wasm', name);

export function pdfWasmPlugin() {
  return {
    name: 'pdf-wasm',
    apply: 'build',
    generateBundle() {
      for (const name of PDF_WASM_FILES) {
        this.emitFile({ type: 'asset', fileName: `${PDF_WASM_DIR}/${name}`, source: readFileSync(pdfWasmSource(name)) });
      }
    },
  };
}
