// Accuracy by time of day (Progress › Habits, CELE round): the bands with
// board hours marked, the headline either way, and the empty state.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

let deep = { data: null, status: 'ready', retry: vi.fn() };
vi.mock('../useDeepAnalytics', () => ({ useDeepAnalytics: () => deep }));
const { default: TimeOfDay } = await import('./TimeOfDay');

const band = (id, label, from, to, board, answers, accuracy, avgSeconds = null) => ({ id, label, from, to, board, answers, accuracy, avgSeconds });
const BANDS = [
  band('early', 'Early morning', 5, 8, false, 0, null),
  band('morning', 'Morning', 8, 12, true, 40, 60, 95),
  band('afternoon', 'Afternoon', 12, 17, true, 0, null),
  band('evening', 'Evening', 17, 22, false, 50, 80),
  band('late', 'Late night', 22, 5, false, 3, 100),
];

describe('TimeOfDay', () => {
  it('lists each band with its hours, board hours marked, and says where you do better', () => {
    deep = { data: { bands: BANDS, total: 93, boardHours: { answers: 40, accuracy: 60 }, headline: { band: 'evening', label: 'Evening', gap: 20, bandAccuracy: 80, boardAccuracy: 60 } }, status: 'ready', retry: vi.fn() };
    render(<TimeOfDay />);
    expect(screen.getByText(/You’re 20 points more accurate in the evening \(80%\) than in board hours \(60%\)/)).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Accuracy by time of day, last 90 days' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(rows[1]).toHaveTextContent('8 AM–12 PM · board hours');
    expect(rows[1]).toHaveTextContent('40 answers · 95s');
    expect(rows[4]).toHaveTextContent('10 PM–5 AM');
  });

  it('says so when board hours are the better time', () => {
    deep = { data: { bands: BANDS, total: 93, headline: { band: 'late', label: 'Late night', gap: -12, bandAccuracy: 50, boardAccuracy: 62 } }, status: 'ready', retry: vi.fn() };
    render(<TimeOfDay />);
    expect(screen.getByText(/12 points more accurate in board hours/)).toBeInTheDocument();
  });

  it('with no answers yet, says what it will show', () => {
    deep = { data: { bands: BANDS.map((b) => ({ ...b, answers: 0, accuracy: null })), total: 0, headline: null }, status: 'ready', retry: vi.fn() };
    render(<TimeOfDay />);
    expect(screen.getByText(/Answer some questions to see which hours suit you/)).toBeInTheDocument();
  });
});
