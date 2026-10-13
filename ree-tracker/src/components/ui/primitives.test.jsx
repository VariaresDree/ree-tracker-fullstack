// Small primitives with rules worth pinning: the page frame's widths, the
// Badge's amber tone (asked for before it existed), Card's `as`, Button's
// per-tone ink, and DataTable's clickable rows from the keyboard.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge, Button, Card, DataTable, Page } from './index';

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
