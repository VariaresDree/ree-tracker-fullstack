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
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

// The definition opened on hover or focus only (nothing on an iPhone, which
// doesn't focus a tapped button), had no Escape, and was a fixed 12rem box
// that ran off the screen's edge.
describe('SmartText glossary definition', () => {
  const tip = () => screen.getByRole('tooltip', { hidden: true });
  const shown = () => !tip().className.split(' ').includes('hidden');

  it('a click or tap toggles it, and the term says whether it is open', () => {
    render(<SmartText text="Per the PEC, size it." />);
    const term = screen.getByRole('button', { name: 'PEC' });
    expect(term).toHaveAttribute('aria-expanded', 'false');
    expect(shown()).toBe(false);
    fireEvent.pointerDown(term);
    fireEvent.click(term);
    expect(term).toHaveAttribute('aria-expanded', 'true');
    expect(shown()).toBe(true);
    expect(term).toHaveAccessibleDescription(/Philippine Electrical Code/);
    fireEvent.click(term);
    expect(shown()).toBe(false);
  });

  it('Escape closes it, and stops there', () => {
    const outer = vi.fn();
    document.addEventListener('keydown', outer);
    render(<SmartText text="Per the PEC, size it." />);
    const term = screen.getByRole('button', { name: 'PEC' });
    fireEvent.click(term);
    fireEvent.keyDown(term, { key: 'Escape' });
    expect(shown()).toBe(false);
    expect(outer).not.toHaveBeenCalled();
    document.removeEventListener('keydown', outer);
  });

  it('a press outside closes it', () => {
    render(<div><SmartText text="Per the PEC, size it." /><p>elsewhere</p></div>);
    fireEvent.click(screen.getByRole('button', { name: 'PEC' }));
    expect(shown()).toBe(true);
    fireEvent.pointerDown(screen.getByText('elsewhere'));
    expect(shown()).toBe(false);
  });

  it('opens on keyboard focus and on mouse hover, not on the focus a tap gives', () => {
    render(<SmartText text="Per the PEC, size it." />);
    const term = screen.getByRole('button', { name: 'PEC' });
    fireEvent.focus(term);
    expect(shown()).toBe(true);
    fireEvent.blur(term);
    expect(shown()).toBe(false);
    fireEvent.pointerDown(term);
    fireEvent.focus(term);
    expect(shown()).toBe(false);
    fireEvent.pointerEnter(term, { pointerType: 'mouse' });
    expect(shown()).toBe(true);
    fireEvent.pointerLeave(term, { pointerType: 'mouse' });
    expect(shown()).toBe(false);
  });

  it('fits a phone screen, sliding in from the edge', () => {
    render(<SmartText text="See the EPIRA for details." />);
    const term = screen.getByRole('button', { name: 'EPIRA' });
    expect(tip().className).toMatch(/max-w-\[min\(18rem,calc\(100vw-2rem\)\)\]/);
    // A term 4px from the left edge, under a 200px-wide definition.
    vi.spyOn(term.parentElement, 'getBoundingClientRect').mockReturnValue({ left: 4, top: 300, width: 40, height: 20, right: 44, bottom: 320 });
    vi.spyOn(tip(), 'offsetWidth', 'get').mockReturnValue(200);
    vi.spyOn(tip(), 'offsetHeight', 'get').mockReturnValue(60);
    fireEvent.click(term);
    // Centred it would start at 4 + 20 - 100 = -76; it moves 84px right to sit 8px in.
    expect(tip().style.translate).toBe('calc(-50% + 84px) 0');
    expect(tip().style.top).toBe('');
  });
});
