// Small primitives with rules worth pinning: the page frame's widths, the
// Badge's amber tone (asked for before it existed), and Card's `as`.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, Card, Page } from './index';

describe('Page', () => {
  it('has one width per kind of page, and no bottom padding of its own', () => {
    const { container, rerender } = render(<Page>x</Page>);
    expect(container.firstChild.className).toMatch(/max-w-6xl/);
    expect(container.firstChild.className).toMatch(/pt-4/);
    expect(container.firstChild.className).not.toMatch(/pb-/);
    rerender(<Page width="narrow">x</Page>);
    expect(container.firstChild.className).toMatch(/max-w-3xl/);
    rerender(<Page width="reading">x</Page>);
    expect(container.firstChild.className).toMatch(/max-w-4xl/);
  });
});

describe('Badge', () => {
  it('colours the amber tone', () => {
    render(<Badge tone="amber">CONDITIONAL PASS</Badge>);
    expect(screen.getByText('CONDITIONAL PASS').className).toMatch(/reeAmber/);
  });
});

describe('Card', () => {
  it('renders as another element when asked', () => {
    render(<ul><Card as="li">row</Card></ul>);
    expect(screen.getByRole('listitem')).toHaveTextContent('row');
  });
});
