// Small primitives with rules worth pinning: the page frame's widths, the
// Badge's amber tone (asked for before it existed), Card's `as`, Button's
// per-tone ink, and DataTable's clickable rows from the keyboard.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge, Button, Card, DataTable, Grid, IconChip, KpiTile, Page, QuestionSurface, StickyToolbar } from './index';
import { Target } from './icons';

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

  it('takes one of the standard insets, none by default', () => {
    const { container, rerender } = render(<Card>x</Card>);
    expect(container.firstChild.className).not.toMatch(/\bp-\d/);
    rerender(<Card padding="sm">x</Card>);
    expect(container.firstChild.className).toMatch(/\bp-4\b/);
    rerender(<Card padding="lg">x</Card>);
    expect(container.firstChild.className).toMatch(/\bp-6 sm:p-8\b/);
  });
});

describe('Grid', () => {
  it('sets its columns by the room it has (container queries), not the window', () => {
    const { container, rerender } = render(<Grid kind="kpi"><i /><i /></Grid>);
    expect(container.firstChild.className).toMatch(/@container/);
    const grid = container.firstChild.firstChild;
    expect(grid.className).toMatch(/grid-cols-2 @3xl:grid-cols-4/);
    expect(grid.className).not.toMatch(/(^|\s)(sm|md|lg|xl):grid-cols/);
    rerender(<Grid kind="cards" gap="lg" className="stagger-fade-in"><i /></Grid>);
    expect(container.firstChild.firstChild.className).toMatch(/grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3 gap-6 stagger-fade-in/);
  });
});

describe('StickyToolbar and QuestionSurface', () => {
  it('the toolbar sticks under the header on the toolbar layer; the question card has one inset', () => {
    render(<><StickyToolbar data-testid="bar">x</StickyToolbar><QuestionSurface data-testid="q">y</QuestionSurface></>);
    expect(screen.getByTestId('bar').className).toMatch(/sticky top-\[var\(--sticky-top,0\.75rem\)\] z-30/);
    expect(screen.getByTestId('q').className).toMatch(/p-6 sm:p-8/);
    expect(screen.getByTestId('q').className).toMatch(/rounded-\[var\(--radius-lg\)\]/);
  });
});

describe('KpiTile and IconChip', () => {
  it('a compact tile shows text values as given, without the count-up', () => {
    render(<KpiTile compact label="Time" value="4m 12s" />);
    expect(screen.getByText('4m 12s')).toBeInTheDocument();
    expect(screen.getByText('Time').className).toMatch(/text-eyebrow/);
  });

  it('an icon chip takes a tone, a size and a round shape', () => {
    const { container } = render(<IconChip icon={Target} tone="amber" size="sm" round />);
    const chip = container.firstChild;
    expect(chip.className).toMatch(/h-9 w-9/);
    expect(chip.className).toMatch(/rounded-full/);
    expect(chip.getAttribute('style')).toMatch(/reeAmber-text/);
  });
});

describe('Button', () => {
  it('labels a filled button in its tone’s ink, not a fixed white', () => {
    render(<><Button>Next question</Button><Button tone="success">Finish session</Button></>);
    const next = screen.getByRole('button', { name: 'Next question' });
    const finish = screen.getByRole('button', { name: 'Finish session' });
    expect(next.className).toMatch(/text-\[var\(--btn-ink\)\]/);
    expect(next.className).not.toMatch(/text-white/);
    expect(next.style.getPropertyValue('--btn-ink')).toBe('var(--on-accent)');
    expect(finish.style.getPropertyValue('--btn-ink')).toBe('var(--on-success)');
  });
});

describe('DataTable', () => {
  it('opens a clickable row from the keyboard, on the table and on the phone cards', () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={[{ key: 'name', label: 'Name' }]} rows={[{ id: 1, name: 'Sitting 1' }]} onRowClick={onRowClick} />);
    const [row, card] = screen.getAllByText('Sitting 1').map((cell) => cell.closest('tr, [role="button"]'));
    expect(row).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(card).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(card, { key: ' ' });
    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick).toHaveBeenCalledWith({ id: 1, name: 'Sitting 1' });
  });
});
