// Streak milestones are achievements: judged by the best run in the study
// calendar, so one reached stays reached after the run breaks, and a stale
// stored counter can't award one.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

let stats;
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel({ stats }) }));
vi.mock('../../services/dbQueries', () => ({ fetchMockHistory: () => Promise.resolve([]) }));

const { default: Milestones } = await import('./Milestones');

// Seven consecutive answered days ending `last` (YYYY-MM-DD in October 2026).
const week = (lastDay) => Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => [`2026-10-${String(lastDay - 6 + i).padStart(2, '0')}`, 3]),
);
const milestone = (name) => screen.getByText(name).closest('li');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T04:00:00Z')); // noon, Oct 20 in Manila
});
afterEach(() => vi.useRealTimers());

describe('Milestones', () => {
  it('a week streak reached earlier stays reached after the run breaks', () => {
    stats = { globalStreak: 7, activityCalendar: week(10) }; // Oct 4-10, nothing since
    render(<Milestones />);
    expect(within(milestone('Week streak')).getByText('Reached')).toBeInTheDocument();
  });

  it('a stale stored counter alone does not award one', () => {
    stats = { globalStreak: 9, activityCalendar: { '2026-10-01': 2 } };
    render(<Milestones />);
    expect(within(milestone('Week streak')).queryByText('Reached')).not.toBeInTheDocument();
  });

  it('a live run counts even when this device only has part of the calendar', () => {
    stats = { globalStreak: 8, lastActiveDate: '2026-10-20', activityCalendar: { '2026-10-20': 1 } };
    render(<Milestones />);
    expect(within(milestone('Week streak')).getByText('Reached')).toBeInTheDocument();
  });
});
