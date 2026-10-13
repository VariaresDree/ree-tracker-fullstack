// LaTeX renderer: every question, option and explanation goes through it, so a
// bad formula must degrade to text, never blank the question (2026-10-02 audit:
// "no malformed-LaTeX test"; "the memo ignores compact").
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LatexRenderer from './LatexRenderer';
import { normalizeMathDelimiters } from '../utils/mathDelimiters';

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
        expect(container.firstChild.className).not.toMatch(/math-text-compact/);
        rerender(<LatexRenderer content="x" compact />);
        expect(container.firstChild.className).toMatch(/math-text-compact/);
    });

    it('never wraps the text itself in a scroll container (that lifted inline math off the baseline)', () => {
        const { container } = render(<LatexRenderer content={'Given $i(0) = 0$, find $t_m$.'} />);
        expect(container.firstChild.className).not.toMatch(/math-scroll-mobile|overflow/);
        expect(container.querySelectorAll('p')).toHaveLength(1);
    });

    it('inline mode renders a span with no paragraph, so it can sit inside a sentence', () => {
        const { container } = render(<p>The answer is <strong><LatexRenderer inline content={'$5\\,\\Omega$'} /></strong>.</p>);
        const el = container.querySelector('.math-text');
        expect(el.tagName).toBe('SPAN');
        expect(el.querySelector('p')).toBeNull();
        expect(el.querySelector('.katex')).not.toBeNull();
    });

    it('accepts \\( \\) and \\[ \\] delimiters, which AI-written text often uses', () => {
        expect(normalizeMathDelimiters('Find \\(V = IR\\) now')).toBe('Find $V = IR$ now');
        const { container } = render(<LatexRenderer content={'Find \\(V = IR\\) and \\[P = VI\\]'} />);
        expect(container.querySelectorAll('.katex')).toHaveLength(2);
        expect(container.querySelector('.katex-display')).not.toBeNull();
        expect(container.textContent).not.toContain('\\(');
    });

    it('carries no classes from the typography plugin this app does not install', () => {
        const { container } = render(<LatexRenderer content="x" />);
        expect(container.firstChild.className).not.toMatch(/\bprose\b/);
    });
});
