// Every real Progress tab renders with sample data, and its headings follow
// the page's h1 without skipping a level (the deep-analytics cards used h3
// and emoji straight under the h1). Network and charts are mocked.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
vi.mock('../../store/useStore', async () => {
  const { create } = await import('zustand');
  const store = create(() => ({ dynamicTOS: { EE: ['Protection'] }, stats: {} }));
  return { useStore: store };
});
vi.mock('../../hooks/useForecast', () => ({ useForecast: () => ({ snapshot: null, loading: false, error: true }) }));
vi.mock('../../components/ThetaVelocityChart', () => ({ default: () => <p>theta-chart</p> }));
vi.mock('../analytics/CalibrationCurve', () => ({
  CalibrationCurve: () => <section><h2>How well does your confidence match your accuracy?</h2></section>,
}));
const DEEP = {
  'weak-signals': { blindSpots: [{ topic: 'Protection', subject: 'EE', topicId: 't', confidentMisses: 4, total: 6 }], timeSinks: [], recentConfidentMisses: [] },
  'time-analysis': { items: [{ subtopic: 'Protection', avgTimeMs: 95000 }] },
  'confidence-calibration': { items: [{ confidence: 'HIGH', accuracy: 62, correct: 31, total: 50 }] },
  'subject-radar': { items: [{ subject: 'EE', accuracy: 58 }] },
  'study-time': { daily: [{ date: '2026-10-07', totalSecs: 1800, sessions: 2 }] },
};
vi.mock('../../services/dbQueries', () => ({
  fetchAnalyticsDeep: (type) => Promise.resolve(DEEP[type]),
  fetchReadinessScore: () => Promise.resolve(null),
}));

const { default: OverviewTab } = await import('./OverviewTab');
const { default: TopicsTab } = await import('./TopicsTab');
const { default: WeakSpotsTab } = await import('./WeakSpotsTab');
const { default: ConfidenceTab } = await import('./ConfidenceTab');
const { default: HabitsTab } = await import('./HabitsTab');

const stats = {
  irt: { theta: 0.42 },
  thetaHistory: [],
  matrix: { hc: 10, hw: 4, lc: 6, lw: 5 },
  microTopics: { Protection: { subject: 'EE', subtopic: 'Protection', attempts: 12, correct: 7, totalTime: 600000, timedAttempts: 12 } },
  activityCalendar: { '2026-10-07': 30 },
  dailyTarget: 50,
};
const kpi = { answered: 120, accuracy: 58, avgSec: 50, streak: 4 };

// Under the page h1, a tab's headings may start at h2 and step down one level
// at a time.
function expectNoSkippedLevels(container) {
  let previous = 1;
  container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    const level = Number(h.tagName[1]);
    expect(level, `"${h.textContent}" follows an h${previous}`).toBeLessThanOrEqual(previous + 1);
    previous = level;
  });
}

const renderTab = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Progress tabs', () => {
  it('Overview: KPIs, ability trend, forecast and the AI report', async () => {
    const { container } = renderTab(<OverviewTab stats={stats} kpi={kpi} />);
    expect(screen.getByText('Questions answered')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Ability trend (θ)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI board report/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /past mock sittings/ })).toHaveAttribute('href', '/exams?tab=history');
    expect(await screen.findByText('theta-chart')).toBeInTheDocument();
    expectNoSkippedLevels(container);
  });

  it('Topics: the mastery map and accuracy by subject', async () => {
    const { container } = renderTab(<TopicsTab stats={stats} />);
    expect(await screen.findByRole('heading', { level: 2, name: 'Accuracy by subject' })).toBeInTheDocument();
    expect(await screen.findByText('58%')).toBeInTheDocument();
    expectNoSkippedLevels(container);
  });

  it('Weak spots: the drills, blind spots and recommended fixes', async () => {
    const { container } = renderTab(<WeakSpotsTab />);
    expect(screen.getByRole('button', { name: /Weak-spot drill/ })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Blind spots' })).toBeInTheDocument();
    expect(screen.getByText('Recommended fixes')).toBeInTheDocument();
    expectNoSkippedLevels(container);
  });

  it('Confidence: the matrix and accuracy per confidence level', async () => {
    const { container } = renderTab(<ConfidenceTab stats={stats} />);
    expect(await screen.findByText('High confidence')).toBeInTheDocument();
    expect(screen.getByText('31 of 50 correct')).toBeInTheDocument();
    expectNoSkippedLevels(container);
  });

  it('Habits: the study calendar, study time and time per topic', async () => {
    const { container } = renderTab(<HabitsTab stats={stats} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Study calendar' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Active days (last 14)')).toBeInTheDocument());
    expect(await screen.findByText('95s')).toBeInTheDocument();
    expectNoSkippedLevels(container);
  });
});
