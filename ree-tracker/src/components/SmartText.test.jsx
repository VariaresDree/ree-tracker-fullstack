// src/components/SmartText.test.jsx
// Locks two contracts:
// 1. Math safety: a glossary term inside (or beside) a LaTeX span must never
//    tear the `$…$` pair apart. The oldest implementation split the WHOLE
//    string on the glossary regex, so `$KAIC = 50$` became `["$", "KAIC",
//    " = 50$"]` and printed raw dollars.
// 2. One flowing paragraph: inline math renders inside the same paragraph as
//    the words around it. The previous fix rendered every math and text
//    segment as its own inline-block box with its own scroll container, which
//    lifted formulas above the line and left gaps and scrollbars mid-sentence.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SmartText from './SmartText';

describe('SmartText', () => {
  it('keeps a glossary term INSIDE math delimiters as math, not a tooltip', () => {
    const { container } = render(<SmartText text="$KAIC = 50$ per the standard" />);
    expect(container.querySelectorAll('.katex')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'KAIC' })).toBeNull();
    expect(container.textContent).not.toContain('$');
  });

  it('keeps a glossary term adjacent to math intact on both sides', () => {
    const { container } = render(<SmartText text="Per the $I_{max}$ rating and NEC guidelines, $V = IR$" />);
    expect(container.querySelectorAll('.katex')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'NEC' })).toBeInTheDocument();
    expect(container.textContent).not.toContain('$');
  });

  it('renders inline math in the same paragraph as its sentence', () => {
    const { container } = render(
      <SmartText text="A vector field $\mathbf{F} = (2xy)\mathbf{a}_x$ is conservative. Move from $(1,-2,1)$ to $(3,1,4)$." />,
    );
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].querySelectorAll('.katex')).toHaveLength(3);
    expect(paragraphs[0].textContent).toContain('is conservative');
    // No per-segment inline-block boxes or scroll wrappers inside the text.
    expect(container.querySelector('.math-scroll-mobile')).toBeNull();
    expect(container.querySelectorAll('.math-text')).toHaveLength(1);
  });

  it('still renders a glossary tooltip for a term with no math nearby', () => {
    render(<SmartText text="Per the PEC, conductors must be sized correctly." />);
    expect(screen.getByRole('button', { name: 'PEC' })).toBeInTheDocument();
  });

  it('renders block math ($$…$$) as display math', () => {
    const { container } = render(<SmartText text={'Use\n\n$$X_c = \\frac{1}{2\\pi f C}$$\n\nto find it.'} />);
    expect(container.querySelector('.katex-display')).not.toBeNull();
    expect(container.textContent).not.toContain('$$');
  });

  it('the glossary term is a real button, not just decorated text', () => {
    render(<SmartText text="See the EPIRA for details." />);
    const btn = screen.getByRole('button', { name: 'EPIRA' });
    expect(btn.tagName).toBe('BUTTON');
    expect(btn).toHaveAttribute('aria-describedby');
  });

  it('returns null for empty text', () => {
    const { container } = render(<SmartText text="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
