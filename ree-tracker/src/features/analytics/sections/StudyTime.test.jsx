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
    const list = screen.getByRole('heading', { name: /Minutes per day/ }).parentElement.querySelector('ul');
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(14);
    expect(rows[13]).toHaveTextContent('30');
  });
});
