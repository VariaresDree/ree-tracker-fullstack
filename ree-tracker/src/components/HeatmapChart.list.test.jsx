// Progress › Topics: the topic list. Compact rows in a list that grows with
// the page, all of them. It was a box that scrolled on its own, and on a phone it
// had room for four or five topics. Topics with no answers are chips under them.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const MATH = Array.from({ length: 15 }, (_, i) => `Topic ${i + 1}`);
vi.mock('../store/useStore', () => ({
  useStore: (selector) => selector({ dynamicTOS: { Mathematics: MATH, ESAS: ['Chemistry', 'Physics'], EE: [] } }),
}));

const { default: HeatmapChart } = await import('./HeatmapChart');

const answered = (names) => ({ microTopics: Object.fromEntries(names.map((n) => [n, { attempts: 5, correct: 3, totalTime: 0, masteryN: 5, mastery: 0.5 }])) });

describe('HeatmapChart — the topic list', () => {
  it('shows every answered topic as a compact row in the page, with nothing to open', () => {
    render(<HeatmapChart stats={answered(MATH)} onDrillTopic={() => {}} />);
    const list = screen.getByRole('list', { name: 'Math topics' });
    // No scroll box of its own: the page scrolls.
    expect(list.className).not.toMatch(/overflow-y-auto/);
    expect(within(list).getAllByRole('listitem')).toHaveLength(15);
    // Each row is one tap target, at least 44px.
    expect(within(list).getAllByRole('button')[0].className).toMatch(/\bmin-h-11\b/);
    expect(screen.queryByRole('list', { name: 'Math topics with no answers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show all|Show fewer|no answers yet$/ })).not.toBeInTheDocument();
  });

  it('shows topics with no answers as chips, all of them, and a tap drills', () => {
    const onDrillTopic = vi.fn();
    render(<HeatmapChart stats={answered(['Topic 3', 'Topic 7'])} onDrillTopic={onDrillTopic} />);
    const list = screen.getByRole('list', { name: 'Math topics' });
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual([expect.stringContaining('Topic 3'), expect.stringContaining('Topic 7')]);
    expect(screen.queryByText('No data yet')).not.toBeInTheDocument();

    const chips = screen.getByRole('list', { name: 'Math topics with no answers' });
    expect(within(chips).getAllByRole('listitem')).toHaveLength(13);
    expect(within(chips).getAllByRole('button')[0].className).toMatch(/pointer-coarse:min-h-11/);
    fireEvent.click(within(chips).getByRole('button', { name: 'Drill Topic 1: no answers yet' }));
    expect(onDrillTopic).toHaveBeenCalledWith('Topic 1', 'Mathematics');
  });

  it('a subject with no answers at all shows the chips alone', () => {
    render(<HeatmapChart stats={{ microTopics: {} }} onDrillTopic={() => {}} />);
    expect(screen.queryByRole('list', { name: 'Math topics' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Math topics with no answers' })).getAllByRole('listitem')).toHaveLength(15);
  });

  it('without a drill to start, the chips are plain text', () => {
    render(<HeatmapChart stats={{ microTopics: {} }} />);
    const chips = screen.getByRole('list', { name: 'Math topics with no answers' });
    expect(within(chips).queryByRole('button')).not.toBeInTheDocument();
    expect(within(chips).getByText('Topic 1')).toBeInTheDocument();
  });

  it('follows the subject picked', () => {
    render(<HeatmapChart stats={answered(['Chemistry'])} onDrillTopic={() => {}} />);
    fireEvent.click(screen.getByRole('radio', { name: 'ESAS' }));
    expect(within(screen.getByRole('list', { name: 'ESAS topics' })).getAllByRole('listitem')).toHaveLength(1);
    expect(within(screen.getByRole('list', { name: 'ESAS topics with no answers' })).getAllByRole('listitem')).toHaveLength(1);
  });
});
