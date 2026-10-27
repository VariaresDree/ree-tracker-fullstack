// src/features/paper-sets/print/texExport.js
//
// The set as ONE LaTeX file (the edited set, so it matches the preview), and
// "Open in Overleaf", which posts it to Overleaf's new-project endpoint in a
// new tab, where it compiles. The LaTeX writer loads only when asked for:
// `prepareTex` fetches it (and the QR encoder) as the More menu opens, so the
// Overleaf form can be built and posted inside the click itself (a post to a
// new tab after an await can be blocked as a pop-up).
import { loadQrEncoder, setCodeFor } from '../paperText';

export const OVERLEAF_URL = 'https://www.overleaf.com/docs';

let preparing = null;
let prepared = null;

/** Load the LaTeX writer and the QR encoder, once. */
export function prepareTex() {
  if (!preparing) {
    preparing = Promise.all([import('../../exam-export/buildExamTex'), loadQrEncoder()])
      .then(([mod, qr]) => {
        prepared = { mod, qr };
        return prepared;
      })
      .catch((err) => {
        preparing = null;
        throw err;
      });
  }
  return preparing;
}

/** Test seam. */
export function __resetTexExport() {
  preparing = null;
  prepared = null;
}

function texOptions(draw, prefs) {
  const docs = prefs.docs || { paper: true, sheet: true, key: true };
  return {
    paper: prefs.paper || draw.paper || 'a4',
    documents: { paper: !!docs.paper, sheet: !!docs.sheet, key: !!docs.key },
    includeSolutions: !!(prefs.solutions && docs.key),
    printId: draw.printId,
    setCode: setCodeFor(draw.printId),
  };
}

/**
 * @param {object} draw  effectiveDraw(set)
 * @param {{ paper: string, docs: object, solutions: boolean }} prefs
 * @returns {Promise<{ name: string, content: string, bytes: number, warnings: object }>}
 */
export async function buildSetTex(draw, prefs) {
  const { mod, qr } = await prepareTex();
  return mod.buildExamTexDocumentSync(draw, { ...texOptions(draw, prefs), qr });
}

/** The same, synchronously, once prepareTex has finished; else null. */
export function buildSetTexNow(draw, prefs) {
  if (!prepared) return null;
  return prepared.mod.buildExamTexDocumentSync(draw, { ...texOptions(draw, prefs), qr: prepared.qr });
}

/** Overleaf's "open as a new project": a form POST into a new tab. */
export function openInOverleaf({ name, content }, doc = document) {
  const form = doc.createElement('form');
  form.method = 'POST';
  form.action = OVERLEAF_URL;
  form.target = '_blank';
  form.style.display = 'none';
  const fields = {
    encoded_snip: encodeURIComponent(content),
    snip_name: String(name || 'REE paper').replace(/\.tex$/, ''),
    engine: 'pdflatex',
  };
  for (const [key, value] of Object.entries(fields)) {
    const input = doc.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }
  doc.body.appendChild(form);
  form.submit();
  form.remove();
}
