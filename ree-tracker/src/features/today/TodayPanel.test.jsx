// The Today panel: readiness index (with the breakdown the API always returned
// but nothing rendered), the PRC pass probability, today's target, and the
// ordered next actions — each of which launches the right session.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

let forecast;
let srs;
vi.mock('../../hooks/useForecast', () => ({ useForecast: () => forecast }));
vi.mock('../../hooks/useSrsSummary', () => ({ useSrsSummary: () => ({ summary: srs }) }));
vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
vi.mock('../diagnostic/PlacementPrompt', () => ({ default: () => <div>placement-prompt</div> }));
let historyItems = [];
vi.mock('../../services/dbQueries', () => ({ fetchReadinessHistory: () => Promise.resolve({ items: historyItems }) }));

const { default: TodayPanel } = await import('./TodayPanel');

let lastState;
function ReviewProbe() {
  lastState = useLocation().state;
  return <div>review-page</div>;
}

const renderPanel = (props) => render(
  <MemoryRouter>
    <Routes>
      <Route path="/" element={<TodayPanel uid="u1" {...props} />} />
      <Route path="/review" element={<ReviewProbe />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  lastState = null;
  srs = { due: 6, overdue: 0 };
  forecast = {
    loading: false,
    snapshot: {
      passProbability: 0.31,
      subjectForecasts: { projectedGWA: { mean: 68.2 }, conditionalProbability: 0.12 },
      recommendedActions: [{ type: 'BLIND_SPOT', payload: { topic: 'Protection', subject: 'EE', topicId: 't' }, reason: '5 confident misses.' }],
    },
  };
});

describe('TodayPanel', () => {
  it('draws the readiness trend from the daily snapshots', async () => {
    const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
    historyItems = [
      { score: 54, createdAt: day(0) },
      { score: 50, createdAt: day(3) },
      { score: 47, createdAt: day(8) },
    ];
    renderPanel({ readiness: { score: 54, breakdown: {} }, stats: {} });
    expect(await screen.findByText('+7 this week')).toBeInTheDocument();
    historyItems = [];
  });

  it('shows the readiness index with its breakdown, the pass probability and today’s target', () => {
    renderPanel({
      readiness: { score: 54, breakdown: { topicCoverage: 61, accuracyRate: 58, thetaNormalized: 52, consistency: 40 } },
      stats: { dailyMath: 4, dailyESAS: 2, dailyEE: 6, dailyTarget: 40 },
    });
    expect(screen.getByRole('heading', { level: 2, name: /what to do next/ })).toBeInTheDocument();
    expect(screen.getByText('54')).toBeInTheDocument();
    expect(screen.getByText('Coverage').nextSibling).toHaveTextContent('61%');
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText(/Projected average 68.2%/)).toBeInTheDocument();
    expect(screen.getByText(/12% risk of a subject under the floor/)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('a readiness index still loading shows a skeleton, never a stand-in number', () => {
    renderPanel({ readiness: null, stats: {} });
    expect(screen.queryByText('/100')).not.toBeInTheDocument();
  });

  it('lists next actions in order and launches the right session', () => {
    renderPanel({ readiness: null, stats: { dailyTarget: 50 } });
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toMatch(/Review 6 due questions/);
    expect(items[1]).toMatch(/Fix a blind spot: Protection/);

    fireEvent.click(screen.getAllByRole('button', { name: 'Drill' })[0]);
    expect(screen.getByText('review-page')).toBeInTheDocument();
    expect(lastState.preset).toMatchObject({ source: 'smart-drill', drillMode: 'blind-spot', drillTopicId: 't' });
  });
});
