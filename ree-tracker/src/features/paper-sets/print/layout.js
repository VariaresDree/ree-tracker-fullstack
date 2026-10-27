// src/features/paper-sets/print/layout.js
//
// The print preview's fixed measures and words, shared by the sheets, the
// pagination and the toolbar.
import { PRACTICE_LINE } from '../paperText';

/** Space under the masthead, between items in a column, between key blocks (mm). */
export const MASTHEAD_GAP_MM = 4;
export const ITEM_GAP_MM = 3.5;
export const KEY_GAP_MM = 4;

export const MASTHEAD_KEY = 'qp:masthead';

/** The LaTeX line's "--" as the dash it typesets to. */
export const practiceText = () => PRACTICE_LINE.replace(/ -- /g, ' \u2013 ');

/** A mixed paper (or one with several sections) shows its Parts. */
export const showsParts = (draw) => draw?.plan?.kind === 'blended' || (draw?.sections || []).length > 1;

export const PAPER_OPTIONS = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
  { value: 'long', label: 'Long 8.5 \u00D7 13 in' },
];

export const SYNC_TEXT = {
  saved: 'Saved',
  saving: 'Saving\u2026',
  queued: 'Saved on this device; syncs when online',
};

/**
 * A formula KaTeX couldn't render: a parse error (.katex-error), or an
 * unknown command, drawn in place in LatexRenderer's error colour.
 */
export const BROKEN_FORMULA = '.katex-error, .katex-html [style*="--accent-danger"]';

/** "Items 3 and 27 have a formula that doesn't render ..." */
export function brokenFormulaLine(ns) {
  if (!ns.length) return null;
  const list = ns.length === 1 ? `Item ${ns[0]} has` : `Items ${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]} have`;
  return `${list} a formula that doesn\u2019t render: it shows as typed (in red here). Edit ${ns.length === 1 ? 'it' : 'them'} before you print.`;
}
