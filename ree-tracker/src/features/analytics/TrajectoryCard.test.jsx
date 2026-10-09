// The forecast card shows the PRC-rule projection: strict pass probability,
// the projected weighted average, each subject against the 50% floor, and the
// subject with the most leverage.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let forecast;
vi.mock('../../hooks/useForecast', () => ({ useForecast: () => forecast }));

const { TrajectoryCard } = await import('./TrajectoryCard');

const snapshot = (over = {}) => ({
  passProbability: 0.18,
  topnotcherProbability: 0.02,
  modelVersion: 'v2-prc',
  weakTopics: [{ topic: 'Calculus' }],
  subjectForecasts: {
    conditionalProbability: 0.41,
    projectedGWA: { mean: 71.4, low: 66, high: 77 },
    bindingSubject: 'Mathematics',
    subjects: {
      Mathematics: { expected: 47.2, low: 40, high: 55, p50: 0.35, p70: 0.01 },
      ESAS: { expected: 78, low: 72, high: 84, p50: 1, p70: 0.9 },
      EE: { expected: 80.5, low: 75, high: 86, p50: 1, p70: 0.95 },
    },
  },
  ...over,
});

describe('TrajectoryCard', () => {
  it('leads with the strict pass probability and the projected weighted average', () => {
    forecast = { snapshot: snapshot(), loading: false, error: null, recompute: vi.fn() };
    render(<TrajectoryCard />);
    expect(screen.getByText('Pass probability')).toBeInTheDocument();
    expect(screen.getByText('71.4%')).toBeInTheDocument();
    expect(screen.getByText('likely 66–77%')).toBeInTheDocument();
  });

  it('explains a conditional result — the average met, a subject under the floor', () => {
    forecast = { snapshot: snapshot(), loading: false, error: null, recompute: vi.fn() };
    render(<TrajectoryCard />);
    expect(screen.getByText(/41% chance of a conditional result/)).toBeInTheDocument();
    expect(screen.getByText(/below the 50% floor/)).toBeInTheDocument();
  });

  it('marks the subject with the most leverage', () => {
    forecast = { snapshot: snapshot(), loading: false, error: null, recompute: vi.fn() };
    render(<TrajectoryCard />);
    expect(screen.getByText('Most leverage').parentElement.textContent).toContain('Math');
  });

  it('still renders an old v1 snapshot without a projection', () => {
    forecast = { snapshot: { passProbability: 0.5, topnotcherProbability: 0.1, weakTopics: [] }, loading: false, error: null, recompute: vi.fn() };
    render(<TrajectoryCard />);
    expect(screen.getByText('Early estimate')).toBeInTheDocument();
    expect(screen.getByText('Topnotcher chance')).toBeInTheDocument();
  });
});
