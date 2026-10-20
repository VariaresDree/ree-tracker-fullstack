// The REE.ai mark: named once, decorative beside text that names it, the same
// geometry the app icons are built from, fixed brand colours with a themed ink.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo, Wordmark } from './Logo';
import { LOGO_COLORS, LOGO_PATHS, logoSvg } from './logoGeometry';

describe('Logo', () => {
  it('is an image named REE.ai, with no <title> or <text> to leak into the page text', () => {
    const { container } = render(<Logo size={64} />);
    const mark = screen.getByRole('img', { name: 'REE.ai' });
    expect(mark.tagName.toLowerCase()).toBe('svg');
    expect(container.querySelector('title, text')).toBeNull();
    expect(mark).toHaveAttribute('focusable', 'false');
  });

  it('is hidden from assistive tech when decorative', () => {
    const { container } = render(<Logo decorative />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('a lockup names itself with its text, and the mark beside it is decorative', () => {
    const { container } = render(<Logo variant="lockup" />);
    expect(container.textContent).toMatch(/REE\.?ai Core/);
    expect(screen.queryByRole('img')).toBeNull();
    render(<Wordmark full={false} />);
    expect(screen.getAllByText(/\.ai/).length).toBeGreaterThan(0);
  });

  it('drops the fine detail below 40px, keeps it from 40px up', () => {
    const { container, rerender } = render(<Logo size={32} />);
    const svg = () => container.querySelector('svg');
    expect(svg()).toHaveAttribute('data-detail', 'small');
    expect(svg().querySelector('linearGradient')).toBeNull();
    rerender(<Logo size={48} />);
    expect(svg()).toHaveAttribute('data-detail', 'full');
    expect(svg().querySelector('linearGradient')).not.toBeNull();
  });

  it('paints the letterforms in the themed ink and keeps the brand colours fixed', () => {
    const { container } = render(<Logo size={64} />);
    const html = container.innerHTML;
    expect(html).toContain('var(--logo-ink');
    expect(html).toContain(LOGO_COLORS.red);
    expect(html).toContain(LOGO_COLORS.veil);
    expect(html).toContain('var(--logo-keyline');
  });

  it('two marks on one page keep their own clip and gradient ids', () => {
    const { container } = render(<><Logo size={64} /><Logo size={64} /></>);
    const ids = [...container.querySelectorAll('clipPath, linearGradient')].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('logoSvg', () => {
  it('builds a standalone SVG from the same paths', () => {
    const svg = logoSvg({ background: '#000000', radius: 0.22, padding: 0.1 });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain(LOGO_PATHS.top);
    expect(svg).toContain('rx=');
    expect(svg).not.toMatch(/NaN|undefined/);
  });

  it('every path is finite, closed geometry', () => {
    for (const [name, d] of Object.entries(LOGO_PATHS)) {
      expect(d, name).toMatch(/^M/);
      expect(d, name).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
