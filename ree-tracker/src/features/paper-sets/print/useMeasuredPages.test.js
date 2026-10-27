// Display formulas wider than their column: shrunk to fit down to 70%, and
// past that broken into lines after their operators (shrunk again only when
// one piece is still too wide).
import { describe, it, expect } from 'vitest';
import { fitDisplays } from './useMeasuredPages';

function display(room, need, wrappedNeed = need) {
  const el = document.createElement('div');
  el.className = 'katex-display';
  Object.defineProperty(el, 'clientWidth', { get: () => room });
  Object.defineProperty(el, 'scrollWidth', { get: () => (el.classList.contains('ree-display-wrap') ? wrappedNeed : need) });
  return el;
}

describe('fitDisplays', () => {
  it('leaves a formula that fits, and shrinks one a little too wide', () => {
    const root = document.createElement('div');
    const fits = display(100, 100);
    const wide = display(100, 120);
    root.append(fits, wide);
    fitDisplays(root);
    expect(fits.style.fontSize).toBe('');
    expect(wide.style.fontSize).toBe('83.3%');
    expect(wide.classList.contains('ree-display-wrap')).toBe(false);
  });

  it('breaks a much wider one into lines, and shrinks it only if a piece still overflows', () => {
    const root = document.createElement('div');
    const breaks = display(100, 200, 90);
    const piece = display(100, 300, 125);
    const huge = display(100, 300, 400);
    root.append(breaks, piece, huge);
    fitDisplays(root);
    expect(breaks.classList.contains('ree-display-wrap')).toBe(true);
    expect(breaks.style.fontSize).toBe('');
    expect(piece.style.fontSize).toBe('80%');
    expect(huge.style.fontSize).toBe('70%');
    // Again after a re-render: the same result.
    fitDisplays(root);
    expect(piece.style.fontSize).toBe('80%');
  });
});
