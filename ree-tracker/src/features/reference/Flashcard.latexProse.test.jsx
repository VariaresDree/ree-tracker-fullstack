// src/features/reference/Flashcard.latexProse.test.jsx
//
// Regression test for a real defect: description, purposeExamTip, and each
// variable's meaning were rendered as bare text nodes while symbol/valueUnit
// went through LatexRenderer — so a card whose description embedded $…$ (17
// of 28 live cards do) showed the literal delimiters on screen instead of
// typeset math. Flashcard.test.jsx mocks LatexRenderer entirely (it's testing
// unrelated height-tracking logic), so this file deliberately does NOT mock
// it — the whole point is proving the REAL react-markdown/rehype-katex
// pipeline runs on these three fields, not just that some renderer was
// called.
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Flashcard from './Flashcard';

const CARD = {
  id: 'c1',
  kind: 'constant',
  symbol: 'k',
  name: 'Boltzmann constant',
  formulaLatex: null,
  valueUnit: '$1.380649 \\times 10^{-23}$ J/K',
  description: 'Relates the average kinetic energy $E = \\frac{3}{2}k_BT$ of particles to temperature.',
  variables: [{ symbol: 'T', meaning: 'temperature in $\\text{K}$', unit: 'K' }],
  purposeExamTip: 'Watch for $k_B$ vs the universal gas constant $R$ on the board exam.',
  subject: 'EE',
  topic: { name: 'Electromagnetism' },
  subtopicTag: null,
  source: null,
};

describe('Flashcard — description/exam-tip/variable-meaning render as math, not raw $', () => {
  it('renders description LaTeX as KaTeX, with no literal $ left in the DOM', () => {
    render(<Flashcard card={CARD} />);
    fireEvent.click(screen.getByRole('button')); // flip to back face

    const back = document.querySelector('.flip-back');
    expect(back.querySelectorAll('.katex').length).toBeGreaterThan(0);
    expect(back.textContent).not.toContain('$');
  });

  it('renders purposeExamTip LaTeX as KaTeX, with no literal $ left in the DOM', () => {
    render(<Flashcard card={CARD} />);
    fireEvent.click(screen.getByRole('button'));

    const tipHeading = screen.getByText('Board use & traps');
    const tipBlock = tipHeading.parentElement;
    expect(tipBlock.querySelectorAll('.katex').length).toBeGreaterThan(0);
    expect(tipBlock.textContent).not.toContain('$');
  });

  it('renders a variable\'s meaning LaTeX as KaTeX, with no literal $ left in the DOM', () => {
    render(<Flashcard card={CARD} />);
    fireEvent.click(screen.getByRole('button'));

    const variablesHeading = screen.getByText('Variables');
    const variablesBlock = variablesHeading.parentElement;
    expect(variablesBlock.querySelectorAll('.katex').length).toBeGreaterThan(0);
    expect(variablesBlock.textContent).not.toContain('$');
  });
});
