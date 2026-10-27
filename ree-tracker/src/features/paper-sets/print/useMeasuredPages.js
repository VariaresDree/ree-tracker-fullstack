// src/features/paper-sets/print/useMeasuredPages.js
//
// Heights for pagination: each block (an item, a Part heading, the masthead,
// a worked solution) is rendered once more in a hidden `.ree-measure` layer at
// the width it prints at, and measured once the fonts have loaded (KaTeX's
// fonts change every formula's size). Measured again when the content
// changes, when the window is resized (zoom), and when more fonts finish
// loading.
import { createElement, useEffect, useState } from 'react';

/** The display formulas' smallest size, when one is too wide for its column. */
export const MIN_DISPLAY_SCALE = 0.7;

/**
 * Fit each display formula wider than its column: shrink it (not below 70%);
 * one that would need more breaks into lines after its operators instead (as
 * the LaTeX paper sets one), and shrinks only if a single piece is still too
 * wide. Idempotent: run it again after a re-render.
 */
export function fitDisplays(root) {
  if (!root) return;
  const pct = (v) => `${(Math.max(MIN_DISPLAY_SCALE, v) * 100).toFixed(1)}%`;
  root.querySelectorAll('.katex-display').forEach((el) => {
    el.style.fontSize = '';
    el.classList.remove('ree-display-wrap');
    const room = el.clientWidth;
    let need = el.scrollWidth;
    if (room <= 0 || need <= room + 0.5) return;
    if (room / need >= MIN_DISPLAY_SCALE) {
      el.style.fontSize = pct(room / need);
      return;
    }
    el.classList.add('ree-display-wrap');
    need = el.scrollWidth;
    if (need > room + 0.5) el.style.fontSize = pct(room / need);
  });
}

/**
 * @param {{ id: string, widthMm: number, blocks: { key: string, node: any }[] }[]} groups
 * @param {string} version  changes whenever what the blocks show changes
 * @returns {{ heights: Record<string, number>|null, current: boolean, layer: any }}
 *   heights in CSS px; `current` once they belong to this version
 */
export function useMeasuredPages(groups, version) {
  // A callback ref (state): the measuring effect runs once the layer exists.
  const [root, setRoot] = useState(null);
  const [measured, setMeasured] = useState({ version: null, heights: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let timer;
    const again = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setTick((t) => t + 1), 150);
    };
    window.addEventListener('resize', again);
    document.fonts?.addEventListener?.('loadingdone', again);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', again);
      document.fonts?.removeEventListener?.('loadingdone', again);
    };
  }, []);

  useEffect(() => {
    if (!root) return undefined;
    let live = true;
    // Lay the layer out first, so the fonts it uses start loading, then wait.
    void root.offsetHeight;
    const fonts = document.fonts?.ready || Promise.resolve();
    fonts.then(() => {
      if (!live) return;
      fitDisplays(root);
      const heights = {};
      root.querySelectorAll('[data-measure]').forEach((el) => {
        heights[el.getAttribute('data-measure')] = el.getBoundingClientRect().height;
      });
      setMeasured({ version, heights });
    });
    return () => { live = false; };
  }, [root, version, tick]);

  const layer = createElement(
    'div',
    { ref: setRoot, className: 'ree-measure ree-sheet-type', 'aria-hidden': 'true', inert: true },
    groups.map((g) => createElement(
      'div',
      { key: g.id, style: { width: `${g.widthMm}mm` } },
      g.blocks.map((b) => createElement('div', { key: b.key, 'data-measure': b.key, className: 'ree-measure-block' }, b.node)),
    )),
  );

  return { heights: measured.heights, current: measured.version === version, layer };
}
