// The fast card-math path (2026-11-18): formulas split one result per line, plain
// text with $…$ rendered straight by KaTeX, and anything Markdown handed back.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MathText } from './fastMath';
import { formulaLines, mathSegments, katexHtml, wrapPieces, chunked } from './fastMathText';
import LazyMount from './LazyMount';

describe('formulaLines', () => {
  it('splits a packed formula at top-level ; and qquad', () => {
    expect(formulaLines(String.raw`$x(t) = x_\infty + (x_0 - x_\infty)e^{-t/\tau};\qquad \tau = RC$`))
      .toEqual([String.raw`$x(t) = x_\infty + (x_0 - x_\infty)e^{-t/\tau}$`, String.raw`$\tau = RC$`]);
    expect(formulaLines(String.raw`$\zeta = \frac{\alpha}{\omega_0}\ (\text{series}),\qquad Q = \frac{1}{2\zeta}$`))
      .toEqual([String.raw`$\zeta = \frac{\alpha}{\omega_0}\ (\text{series})$`, String.raw`$Q = \frac{1}{2\zeta}$`]);
  });

  it('never splits inside braces, at thin-space spacing, or a single-result formula', () => {
    const one = String.raw`$i = \frac{V}{R}\;\text{(a; b)}\left(1 - e^{-t}\right)$`;
    expect(formulaLines(one)).toEqual([one]);
    expect(formulaLines('$a = b$')).toEqual(['$a = b$']);
    expect(formulaLines(String.raw`$\begin{cases} a; b \end{cases}$`)).toHaveLength(1);
    expect(formulaLines('8.854 F/m')).toEqual(['8.854 F/m']);
  });

  it('three results become three lines, with their separators trimmed', () => {
    expect(formulaLines(String.raw`$\text{over: } A;\quad \text{critical: } B;\quad \text{under: } C$`))
      .toEqual([String.raw`$\text{over: } A$`, String.raw`$\text{critical: } B$`, String.raw`$\text{under: } C$`]);
  });
});

describe('mathSegments and MathText', () => {
  it('splits text and math, and hands Markdown back', () => {
    expect(mathSegments('current at time $t$')).toEqual([{ math: false, value: 'current at time ' }, { math: true, value: 't' }]);
    expect(mathSegments('**bold** $x$')).toBeNull();
    expect(mathSegments('$$x$$')).toBeNull();
    expect(mathSegments('a stray $ sign')).toBeNull();
    expect(mathSegments('plain words')).toEqual([{ math: false, value: 'plain words' }]);
  });

  it('draws math with KaTeX and caches it', () => {
    const { container } = render(<MathText content="the ratio $\frac{a}{b}$ here" />);
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(container.textContent).toContain('the ratio');
    expect(katexHtml(String.raw`\frac{a}{b}`)).toBe(katexHtml(String.raw`\frac{a}{b}`));
    const { container: d } = render(<MathText content="$x^2$" display />);
    expect(d.querySelector('.katex-display')).not.toBeNull();
  });

  it('a bad formula shows in place instead of throwing', () => {
    const { container } = render(<MathText content="$\frac{a}$" />);
    expect(container.textContent.length).toBeGreaterThan(0);
  });
});

describe('LazyMount', () => {
  it('renders at once where IntersectionObserver is missing, and chunks a list', () => {
    const { getByText } = render(<LazyMount estimate={100}><p>inside</p></LazyMount>);
    expect(getByText('inside')).toBeTruthy();
    expect(chunked([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe('wrapPieces', () => {
  it('breaks a list after its commas and at quad, keeping math as math', () => {
    expect(wrapPieces(String.raw`$a = 1,\ b = 2,\quad c = 3$`)).toBe('$a = 1,$ $b = 2,$ $c = 3$');
  });

  it('turns top-level text runs into words, never one inside a fraction', () => {
    expect(wrapPieces(String.raw`$\text{first digit } 0\text{–}6: \text{solids}$`)).toBe('first digit $0$–$6:$ solids');
    expect(wrapPieces(String.raw`$v = \frac{\text{distance}}{t}$`)).toBe(String.raw`$v = \frac{\text{distance}}{t}$`);
    expect(wrapPieces(String.raw`$|A| \ge 29\quad (\text{three sections})$`)).toBe(String.raw`$|A| \ge 29$ (three sections)`);
  });
});
