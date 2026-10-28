// Progress › Topics: the topic list. Compact rows in a list that grows with
// the page, the first 12 and then "Show all". It was a box that scrolled on its
// own, and on a phone it had room for four or five topics.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const MATH = Array.from({ length: 15 }, (_, i) => `Topic ${i + 1}`);
vi.mock('../store/useStore', () => ({
  useStore: (selector) => selector({ dynamicTOS: { Mathematics: MATH, ESAS: ['Chemistry', 'Physics'], EE: [] } }),
}));

const { default: HeatmapChart } = await import('./HeatmapChart');

describe('HeatmapChart — the topic list', () => {
  it('shows 12 compact rows in the page, then all 15 on Show all, and back', () => {
    render(<HeatmapChart stats={{ microTopics: {} }} onDrillTopic={() => {}} />);
    const list = screen.getByRole('list', { name: 'Math topics' });
    // No scroll box of its own: the page scrolls.
    expect(list.className).not.toMatch(/overflow-y-auto/);
    expect(within(list).getAllByRole('listitem')).toHaveLength(12);
    // Each row is one tap target, at least 44px.
    expect(within(list).getAllByRole('button')[0].className).toMatch(/\bmin-h-11\b/);

    const more = screen.getByRole('button', { name: 'Show all 15 topics' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    expect(within(list).getAllByRole('listitem')).toHaveLength(15);
    fireEvent.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(12);
  });

  it('offers no Show all for a short subject, and keeps a subject open when you come back to it', () => {
    render(<HeatmapChart stats={{ microTopics: {} }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 15 topics' }));
    fireEvent.click(screen.getByRole('radio', { name: 'ESAS' }));
    expect(within(screen.getByRole('list', { name: 'ESAS topics' })).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Show all|Show fewer/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Math' }));
    expect(within(screen.getByRole('list', { name: 'Math topics' })).getAllByRole('listitem')).toHaveLength(15);
    expect(screen.getByRole('button', { name: 'Show fewer' })).toBeInTheDocument();
  });
});
