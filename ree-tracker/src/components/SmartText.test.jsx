// src/components/SmartText.test.jsx
// Locks the math-safety contract: a glossary term landing inside (or beside) a
// LaTeX span must never tear the `$…$` pair apart. The old implementation
// split the WHOLE string on the glossary regex before math was ever
// extracted, so `$KAIC = 50$` split into `["$", "KAIC", " = 50$"]` — two
// unbalanced fragments, each unparseable by remark-math.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SmartText from './SmartText';

// Render LaTeX as plain text so assertions can check the raw string content
// without pulling in react-markdown/KaTeX for this component-level suite.
import { vi } from 'vitest';
vi.mock('./LatexRenderer', () => ({
  default: ({ content }) => <span data-testid="latex">{content}</span>,
}));

describe('SmartText — math/glossary interaction', () => {
  it('keeps a glossary term INSIDE math delimiters intact as one math token', () => {
    render(<SmartText text="$KAIC = 50$ per the standard" />);
    const mathNodes = screen.getAllByTestId('latex');
    // The whole "$KAIC = 50$" must reach LatexRenderer as ONE unbroken string —
    // not split into "$" + "KAIC" + " = 50$".
    expect(mathNodes.some((n) => n.textContent === '$KAIC = 50$')).toBe(true);
    expect(mathNodes.some((n) => n.textContent === '$')).toBe(false);
  });

  it('keeps a glossary term adjacent to math intact on both sides', () => {
    render(<SmartText text="Per the $I_{max}$ rating and NEC guidelines, $V = IR$" />);
    const mathNodes = screen.getAllByTestId('latex').map((n) => n.textContent);
    expect(mathNodes).toContain('$I_{max}$');
    expect(mathNodes).toContain('$V = IR$');
    // NEC still gets its glossary tooltip in the plain-text region between them.
    expect(screen.getByRole('button', { name: 'NEC' })).toBeInTheDocument();
  });

  it('still renders a glossary tooltip for a term with no math nearby', () => {
    render(<SmartText text="Per the PEC, conductors must be sized correctly." />);
    // "PEC" also appears inside the tooltip's own uppercase label, so scope to
    // the trigger button specifically rather than a bare text query.
    expect(screen.getByRole('button', { name: 'PEC' })).toBeInTheDocument();
  });

  it('renders block math ($$…$$) as one token, not glossary-split', () => {
    const src = '$$X_c = \\frac{1}{2\\pi f C}$$';
    render(<SmartText text={src} />);
    const mathNodes = screen.getAllByTestId('latex').map((n) => n.textContent);
    expect(mathNodes).toContain(src);
  });

  it('the glossary term is a real button, not just decorated text', () => {
    // Regression: the old version was a non-interactive <span> — unreachable
    // by keyboard, and its tooltip was permanently hover-only.
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
