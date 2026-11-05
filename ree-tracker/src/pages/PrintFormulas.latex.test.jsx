// The sheet showed its source: `$\text{V}$` in a variable's unit, and a bare
// `\mathrm{kV}` where a field had no delimiters. The real renderer on purpose, as
// the other print tests mock it and so couldn't see this.
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../hooks/useAppearance', () => ({ useAppearance: () => {} }));
const CARDS = [
  {
    id: '1', subject: 'EE', kind: 'formula', name: 'Capacitor charge', symbol: '\\mathrm{Q}',
    formulaLatex: 'Q = C V', valueUnit: '$\\text{C}$', description: 'Charge held at a voltage.',
    variables: [
      { symbol: '$C$', meaning: 'capacitance', unit: '$\\text{F}$' },
      { symbol: '$V$', meaning: 'voltage', unit: '\\mathrm{V}' },
      { symbol: '$x$', meaning: 'a ratio', unit: 'null' },
    ],
    purposeExamTip: 'Use $C$ in farads.', topic: { name: 'Electric Circuits 2' },
  },
  { id: '2', subject: 'EE', kind: 'constant', name: 'Permittivity', symbol: '$\\varepsilon_0$', formulaLatex: null, valueUnit: '$8.854 \\times 10^{-12} \\text{ F/m}$', variables: [], topic: { name: 'Electric Circuits 2' } },
];
vi.mock('../features/reference/useReferenceCards', () => ({ useReferenceCards: () => ({ cards: CARDS, loading: false }) }));
vi.mock('../features/reference/useCardReviews', () => ({ useCardReviews: () => ({ items: [] }) }));

const { default: PrintFormulas } = await import('./PrintFormulas');

const printed = () => {
  render(<MemoryRouter initialEntries={['/print/formulas?subject=EE']}><PrintFormulas /></MemoryRouter>);
  return document.querySelector('.pf-sheet');
};
// KaTeX keeps a copy of the source in its MathML, which no one sees.
const visibleText = (el) => {
  const copy = el.cloneNode(true);
  copy.querySelectorAll('.katex-mathml').forEach((m) => m.remove());
  return copy.textContent;
};

describe('the print sheet', () => {
  it('typesets every math field, with no source left on the page', () => {
    const text = visibleText(printed());
    expect(text).not.toContain('$');
    expect(text).not.toContain('\\');
    expect(text).not.toContain('null');
  });

  // By text, not role: jsdom can't compute an accessible name through KaTeX's output.
  const article = (name) => [...document.querySelectorAll('.pf-card')].find((a) => a.textContent.includes(name));

  it('shows a formula, the unit of its result, and each variable with its own', () => {
    printed();
    const card = article('Capacitor charge');
    expect(card.textContent).toContain('capacitance');
    expect(card.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(6);
    expect(card.textContent).toMatch(/Result in/);
  });

  it('leads a constant with its value', () => {
    printed();
    expect(visibleText(article('Permittivity'))).toContain('8.854');
  });
});
