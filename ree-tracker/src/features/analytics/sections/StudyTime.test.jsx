// "Minutes per day, last 14 days" shows all 14, today included. The list's
// 12-row default cut the two newest days off an oldest-first list.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const MANILA = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });
const today = MANILA.format(new Date());
vi.mock('../useDeepAnalytics', () => ({
  useDeepAnalytics: () => ({ status: 'ready', retry: vi.fn(), data: { daily: [{ date: today, totalSecs: 1800 }] } }),
}));

const { default: StudyTime } = await import('./StudyTime');

describe('StudyTime', () => {
  it('lists all 14 days with today last', () => {
    render(<StudyTime />);
    const list = screen.getByRole('heading', { name: /Minutes per day/ }).parentElement.querySelector('ol');
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(14);
    expect(rows[13]).toHaveTextContent('30');
    expect(rows[13]).toHaveTextContent('(today)');
  });

  it('draws the days as vertical columns, today solid and tallest, with the average line', () => {
    const { container } = render(<StudyTime />);
    const fills = [...container.querySelectorAll('.grid-cols-14 .rounded-full > span')];
    expect(fills).toHaveLength(14);
    expect(fills[13].style.height).toBe('100%');
    expect(fills[13].style.background).toBe('var(--accent)');
    expect(fills[0].style.height).toBe('0%');
    expect(screen.getByText('Average active day: 30 min')).toBeInTheDocument();
  });
});
