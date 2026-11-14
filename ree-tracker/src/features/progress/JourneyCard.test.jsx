// Your journey, rendered: each tile says its figure and its change in words,
// a tile with no history says what it needs, and with nothing at all (a new
// account, or a server without these routes) the card isn't drawn.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../services/dbQueries', () => ({ fetchReadinessHistory: vi.fn(), fetchForecastHistory: vi.fn() }));
const weekly = { data: null, status: 'loading', retry: vi.fn() };
vi.mock('../analytics/useDeepAnalytics', () => ({ useDeepAnalytics: () => weekly }));

const { fetchReadinessHistory, fetchForecastHistory } = await import('../../services/dbQueries');
const { default: JourneyCard } = await import('./JourneyCard');

const wk = (week, subject, answered, correct) => ({ week, subject, answered, correct });

beforeEach(() => {
  vi.clearAllMocks();
  weekly.data = null;
});

describe('JourneyCard', () => {
  it('shows each measure with its change, the week line, and the weeks as a table', async () => {
    fetchReadinessHistory.mockResolvedValue({ items: [{ createdAt: '2026-11-13T02:00:00Z', score: 62 }, { createdAt: '2026-11-01T02:00:00Z', score: 55 }] });
    fetchForecastHistory.mockResolvedValue({ items: [{ day: '2026-11-13', passProbability: 0.35 }] });
    weekly.data = { items: [wk('2026-11-02', 'Mathematics', 20, 10), wk('2026-11-09', 'Mathematics', 60, 45), wk('2026-11-09', 'EE', 20, 14)] };

    render(<JourneyCard today="2026-11-14" />);

    expect(await screen.findByText('Up 7 points since Nov 1.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your journey' })).toBeInTheDocument();
    expect(screen.getByText('The trend starts with your next day.')).toBeInTheDocument();
    expect(screen.getByText('Up 25 points since the week of Nov 2.')).toBeInTheDocument();
    expect(screen.getByText('The trend starts with your next week.')).toBeInTheDocument();
    expect(screen.getByText('Shows after 10 answers in a week.')).toBeInTheDocument();
    expect(screen.getByText('This week: 80 answers, 74% right. ESAS is 30% of the board and 0% of your answers.')).toBeInTheDocument();
    expect(screen.getByText('Accuracy week by week')).toBeInTheDocument();
  });

  it('with no history at all, or when the requests fail, it draws nothing', async () => {
    fetchReadinessHistory.mockResolvedValue({ items: [] });
    fetchForecastHistory.mockRejectedValue(new Error('404'));
    const { container } = render(<JourneyCard today="2026-11-14" />);
    await waitFor(() => expect(fetchForecastHistory).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
