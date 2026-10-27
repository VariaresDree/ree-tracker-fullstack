// Small primitives with rules worth pinning: the page frame's widths, the
// Badge's amber tone (asked for before it existed), Card's `as`, Button's
// per-tone ink, and DataTable's clickable rows from the keyboard.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge, Button, Card, CardTitle, CardWatermark, DataTable, Disclosure, Grid, IconChip, KpiTile, Page, PageHeader, QuestionSurface, SectionHeader, StickyToolbar } from './index';
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

  it('is frosted glass over the page, and solid where it must be', () => {
    const { container, rerender } = render(<Card>x</Card>);
    expect(container.firstChild).toHaveClass('surface-glass');
    expect(container.firstChild).not.toHaveClass('bg-surface');
    rerender(<Card glass={false}>x</Card>);
    expect(container.firstChild).toHaveClass('bg-surface');
    expect(container.firstChild).not.toHaveClass('surface-glass');
    // The question card reads as paper.
    rerender(<QuestionSurface>q</QuestionSurface>);
    expect(container.firstChild).toHaveClass('bg-surface');
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

describe('Card variants', () => {
  it('every page card carries the top-edge rim; a well inside a card does not', () => {
    const { container, rerender } = render(<Card>x</Card>);
    expect(container.firstChild).toHaveClass('card-edge');
    rerender(<Card variant="inset">x</Card>);
    expect(container.firstChild).not.toHaveClass('card-edge');
  });

  it('a hero is solid, washed in the accent, elevated, and takes the large inset', () => {
    const { container, rerender } = render(<Card variant="hero">x</Card>);
    const hero = container.firstChild;
    expect(hero).toHaveClass('card-hero', 'elevate-2', 'relative', 'isolate', 'card-edge');
    // .card-hero paints it; a card colour class would fight it.
    expect(hero).not.toHaveClass('surface-glass');
    expect(hero).not.toHaveClass('bg-surface');
    expect(hero.className).toMatch(/\bp-6 sm:p-8\b/);
    rerender(<Card variant="hero" padding="md">x</Card>);
    expect(container.firstChild.className).toMatch(/\bp-5\b/);
    expect(container.firstChild.className).not.toMatch(/p-6/);
  });

  it('an interactive card lifts on hover and stays glass', () => {
    const { container } = render(<Card variant="interactive">x</Card>);
    expect(container.firstChild).toHaveClass('card-interactive', 'surface-glass', 'isolate');
  });

  it('an inset well is solid, half-strength panel colour, on the smaller radius', () => {
    const { container } = render(<Card variant="inset">x</Card>);
    expect(container.firstChild).toHaveClass('bg-surface2/50', 'rounded-[var(--radius-default)]');
    expect(container.firstChild).not.toHaveClass('surface-glass');
  });

  it('the watermark is decoration only, behind the content', () => {
    const { container } = render(<Card variant="hero"><CardWatermark icon={Target} /><p>Up next</p></Card>);
    const mark = container.querySelector('[data-watermark]');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark).toHaveClass('-z-10', 'pointer-events-none', 'overflow-hidden');
  });
});

describe('Disclosure', () => {
  it('opens and closes its body from a real button that says whether it is open', () => {
    render(<Disclosure title="Custom session" description="Choose it yourself.">body</Disclosure>);
    const toggle = screen.getByRole('button', { name: /Custom session/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('body')).toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('body').id).toBe(toggle.getAttribute('aria-controls'));
  });

  it('follows `open` when the parent holds the state', () => {
    const onToggle = vi.fn();
    render(<Disclosure title="More" open onToggle={onToggle}>body</Disclosure>);
    expect(screen.getByText('body')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(onToggle).toHaveBeenCalledWith(false);
    expect(screen.getByText('body')).toBeInTheDocument();
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
    rerender(<Grid kind="bento"><i /></Grid>);
    expect(container.firstChild.firstChild.className).toMatch(/grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-4/);
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

describe('type scale', () => {
  it('one size per heading level: the page title, a section title, a card title', () => {
    render(<>
      <PageHeader title="Exams" />
      <SectionHeader title="Notebook" description="Every question you got wrong." actions={<Button>Practise</Button>} />
      <Card><CardTitle>Blind spots</CardTitle><CardTitle size="lg">Join a battle</CardTitle></Card>
    </>);
    expect(screen.getByRole('heading', { level: 1, name: 'Exams' }).className).toMatch(/\btext-h1\b/);
    expect(screen.getByRole('heading', { level: 2, name: 'Notebook' }).className).toMatch(/\btext-h2\b/);
    expect(screen.getByRole('heading', { level: 2, name: 'Blind spots' }).className).toMatch(/\btext-base\b/);
    expect(screen.getByRole('heading', { level: 2, name: 'Join a battle' }).className).toMatch(/\btext-lg\b/);
    expect(screen.getByRole('button', { name: 'Practise' })).toBeInTheDocument();
  });
});
