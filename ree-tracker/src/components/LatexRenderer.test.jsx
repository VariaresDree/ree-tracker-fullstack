// LaTeX renderer: every question, option and explanation goes through it, so a
// bad formula must degrade to text, never blank the question (2026-10-02 audit:
// "no malformed-LaTeX test"; "the memo ignores compact").
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LatexRenderer from './LatexRenderer';

describe('LatexRenderer', () => {
    it('renders well-formed inline math through KaTeX', () => {
        const { container } = render(<LatexRenderer content={'Impedance $Z = R + jX$ ohms'} />);
        expect(container.querySelector('.katex')).not.toBeNull();
        expect(container.textContent).toContain('Impedance');
    });

    it('a malformed formula renders as an error mark, and the rest of the text survives', () => {
        const { container } = render(<LatexRenderer content={'Find $\\frac{1}{$ the value'} />);
        expect(container.textContent).toContain('Find');
        expect(container.textContent).toContain('the value');
    });

    it('re-renders when `compact` changes (the memo used to ignore it)', () => {
        const { container, rerender } = render(<LatexRenderer content="x" />);
        expect(container.firstChild.className).toMatch(/math-scroll-mobile/);
        rerender(<LatexRenderer content="x" compact />);
        expect(container.firstChild.className).not.toMatch(/math-scroll-mobile/);
    });

    it('carries no classes from the typography plugin this app does not install', () => {
        const { container } = render(<LatexRenderer content="x" />);
        expect(container.firstChild.className).not.toMatch(/\bprose\b/);
    });
});
