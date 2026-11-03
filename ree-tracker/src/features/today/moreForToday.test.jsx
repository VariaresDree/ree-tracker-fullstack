// Today's More for today: closed on a phone, open from 768px, the learner's own
// choice remembered. The lead stays on top either way.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../hooks/useForecast', () => ({ useForecast: () => ({ snapshot: { passProbability: 0.42 }, loading: false }) }));
vi.mock('../../hooks/useSrsSummary', () => ({ useSrsSummary: () => ({ summary: { due: 0, overdue: 0 } }) }));
vi.mock('../../hooks/useCardReviewSummary', () => ({ useCardReviewSummary: () => ({ due: 0 }) }));
vi.mock('../../hooks/useTodayLoop', () => ({ useTodayLoop: () => null }));
vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
vi.mock('../../hooks/useConnection', () => ({ useReconnectKey: () => 0 }));
vi.mock('../diagnostic/PlacementPrompt', () => ({ default: () => null }));
vi.mock('../diagnostic/usePlacement', () => ({ usePlacement: () => ({ status: { status: 'completed' }, plan: null, settled: true }), NEW_LEARNER_MAX: 30 }));
vi.mock('../study-plan/usePlanCalendar', () => ({ usePlanCalendar: () => ({ items: [], prefs: { restWeekdays: [] } }) }));
vi.mock('../onboarding/FirstRunCard', () => ({ default: () => null }));
vi.mock('./usePlanToday', () => ({ usePlanToday: () => ({ task: null, settled: true }) }));
vi.mock('../../services/dbQueries', () => ({ fetchReadinessHistory: async () => ({ items: [] }) }));

const { default: TodayPanel } = await import('./TodayPanel');

const STATS = { readiness: { score: 37, breakdown: {} }, dailyCounts: {}, dailyTarget: 50, activityCalendar: {} };
const originalMatchMedia = window.matchMedia;
const width = (wide) => {
  window.matchMedia = (q) => ({ ...originalMatchMedia(q), matches: wide && q.includes('min-width: 768px') });
};
const show = () => render(<MemoryRouter><TodayPanel stats={STATS} uid="u1" /></MemoryRouter>);
const more = () => screen.getByRole('button', { name: /More for today/ });

beforeEach(() => localStorage.clear());
afterEach(() => { window.matchMedia = originalMatchMedia; cleanup(); });

describe('More for today', () => {
  it('on a phone it starts closed, with the headline figures on the line', () => {
    width(false);
    show();
    expect(more()).toHaveAttribute('aria-expanded', 'false');
    expect(more()).toHaveTextContent(/Pass 42%/);
    expect(more()).toHaveTextContent(/Today \d+\/\d+/);
    expect(screen.queryByText('Pass probability')).not.toBeInTheDocument();
  });

  it('from 768px it starts open', () => {
    width(true);
    show();
    expect(more()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Pass probability')).toBeInTheDocument();
  });

  it('opens on a tap, and the choice outlasts a visit and the width', () => {
    width(false);
    show();
    fireEvent.click(more());
    expect(screen.getByText('Pass probability')).toBeInTheDocument();
    cleanup();
    show();
    expect(more()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(more());
    cleanup();
    width(true);
    show();
    expect(more()).toHaveAttribute('aria-expanded', 'false');
  });
});
