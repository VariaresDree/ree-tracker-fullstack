// "Minutes per day, last 14 days" shows all 14, today included. The list's
// 12-row default cut the two newest days off an oldest-first list.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';

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

  it('draws the days as vertical columns, today solid and tallest, with every figure and the average', () => {
    const { container } = render(<StudyTime />);
    const fills = [...container.querySelectorAll('[data-day-fill]')];
    expect(fills).toHaveLength(14);
    expect(fills[13].style.height).toBe('100%');
    expect(fills[13].style.background).toBe('var(--accent)');
    expect(fills[0].style.height).toBe('0%');
    // Every day prints its minutes, a quiet day included.
    const values = [...container.querySelectorAll('[data-day-value]')].map((v) => v.textContent);
    expect(values).toEqual([...Array(13).fill('0'), '30']);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Average active day: 30 min')).toBeInTheDocument();
    expect(screen.getByText(/^Best day: .*, 30 min$/)).toBeInTheDocument();
  });

  it('on a narrow card shows one week at a time, the latest first, and the week before on request', () => {
    const { container } = render(<StudyTime />);
    const values = () => [...container.querySelectorAll('[data-day-value]')];
    // Wide cards show all 14; the picker and the hiding are narrow-only.
    expect(screen.getByRole('radiogroup', { name: 'Week shown' })).toHaveClass('@lg:hidden');
    expect(values()[0]).toHaveClass('@max-lg:hidden');
    expect(values()[13]).not.toHaveClass('@max-lg:hidden');

    const [older, latest] = screen.getAllByRole('radio');
    expect(latest).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(older);
    expect(values()[0]).not.toHaveClass('@max-lg:hidden');
    expect(values()[13]).toHaveClass('@max-lg:hidden');
  });
});
