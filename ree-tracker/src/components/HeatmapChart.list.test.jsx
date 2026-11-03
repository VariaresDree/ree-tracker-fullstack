// Progress › Topics: the topic list. Compact rows in a list that grows with
// the page, the first 12 and then "Show all". It was a box that scrolled on its
// own, and on a phone it had room for four or five topics. Topics with no
// answers fold behind one button.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const MATH = Array.from({ length: 15 }, (_, i) => `Topic ${i + 1}`);
vi.mock('../store/useStore', () => ({
  useStore: (selector) => selector({ dynamicTOS: { Mathematics: MATH, ESAS: ['Chemistry', 'Physics'], EE: [] } }),
}));

const { default: HeatmapChart } = await import('./HeatmapChart');

const answered = (names) => ({ microTopics: Object.fromEntries(names.map((n) => [n, { attempts: 5, correct: 3, totalTime: 0, masteryN: 5, mastery: 0.5 }])) });

describe('HeatmapChart — the topic list', () => {
  it('shows 12 compact rows in the page, then all 15 on Show all, and back', () => {
    render(<HeatmapChart stats={answered(MATH)} onDrillTopic={() => {}} />);
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

  it('folds topics with no answers behind one button, and opens them on a tap', () => {
    render(<HeatmapChart stats={answered(['Topic 3', 'Topic 7'])} />);
    const list = screen.getByRole('list', { name: 'Math topics' });
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual([expect.stringContaining('Topic 3'), expect.stringContaining('Topic 7')]);
    expect(screen.queryByText('No data yet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '13 topics with no answers yet' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(15);
    fireEvent.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('a subject with no answers at all shows the button alone', () => {
    render(<HeatmapChart stats={{ microTopics: {} }} />);
    expect(screen.queryByRole('list', { name: 'Math topics' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '15 topics with no answers yet' })).toBeInTheDocument();
  });

  it('offers no button when every topic shows, and keeps a subject open when you come back to it', () => {
    render(<HeatmapChart stats={answered([...MATH, 'Chemistry', 'Physics'])} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 15 topics' }));
    fireEvent.click(screen.getByRole('radio', { name: 'ESAS' }));
    expect(within(screen.getByRole('list', { name: 'ESAS topics' })).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Show all|Show fewer|no answers/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Math' }));
    expect(within(screen.getByRole('list', { name: 'Math topics' })).getAllByRole('listitem')).toHaveLength(15);
    expect(screen.getByRole('button', { name: 'Show fewer' })).toBeInTheDocument();
  });
});
