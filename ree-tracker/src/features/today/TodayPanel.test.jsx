// The Today panel: readiness index (with the breakdown the API always returned
// but nothing rendered), the PRC pass probability, today's target split by
// subject, and the ordered next actions (today's plan task included), each of
// which launches the right session.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { todayManila, dayBefore } from '@ree/shared';

let forecast;
let srs;
vi.mock('../../hooks/useForecast', () => ({ useForecast: () => forecast }));
vi.mock('../../hooks/useSrsSummary', () => ({ useSrsSummary: () => ({ summary: srs }) }));
let cardSummary = null;
vi.mock('../../hooks/useCardReviewSummary', () => ({ useCardReviewSummary: () => cardSummary }));
let loopData = null;
vi.mock('../../hooks/useTodayLoop', () => ({ useTodayLoop: () => loopData }));
vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
vi.mock('../diagnostic/PlacementPrompt', () => ({ default: () => <div>placement-prompt</div> }));
let placement;
vi.mock('../diagnostic/usePlacement', () => ({ usePlacement: () => placement, NEW_LEARNER_MAX: 30 }));
vi.mock('../onboarding/FirstRunCard', () => ({ default: ({ show }) => (show ? <div>first-run-card</div> : null) }));
let historyItems = [];
let plannerItems = [];
vi.mock('../../services/dbQueries', () => ({
  fetchReadinessHistory: () => Promise.resolve({ items: historyItems }),
  fetchPlannerTasks: () => Promise.resolve({ items: plannerItems }),
}));
vi.mock('../../utils/manilaDate', () => ({ todayManila: () => '2026-10-08' }));

const { default: TodayPanel } = await import('./TodayPanel');

let lastState;
function ReviewProbe() {
  lastState = useLocation().state;
  return <div>review-page</div>;
}

const renderPanel = (props) => render(
  <MemoryRouter>
    <Routes>
      <Route path="/" element={<TodayPanel uid="u1" answered={500} {...props} />} />
      <Route path="/practice" element={<ReviewProbe />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  lastState = null;
  placement = { status: { status: 'completed' }, result: null, plan: null, dismissed: false, dismiss: vi.fn(), isNew: false, settled: true };
  plannerItems = [];
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
      stats: { lastActiveDate: todayManila(), dailyMath: 4, dailyESAS: 2, dailyEE: 6, dailyTarget: 40 },
    });
    expect(screen.getByRole('heading', { level: 2, name: /what to do next/ })).toBeInTheDocument();
    expect(screen.getByText('54')).toBeInTheDocument();
    expect(screen.getByText('Topics practised').nextSibling).toHaveTextContent('61%');
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText(/Projected average 68.2%/)).toBeInTheDocument();
    expect(screen.getByText(/12% risk of a subject under the floor/)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    // 40 a day by the PRC weights: Mathematics 10, ESAS 12, EE 18.
    expect(screen.getByRole('progressbar', { name: 'ESAS: 2 of 12' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'EE: 6 of 18' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change your daily target' })).toHaveAttribute('href', '/account#exam-plan');
    expect(screen.getByRole('link', { name: /in Progress/ })).toHaveAttribute('href', '/progress');
    expect(screen.getByRole('link', { name: /in Progress/ }).className).toMatch(/pointer-coarse:min-h-11/);
  });

  it('a new day’s target starts at 0, not at the last study day’s counts', () => {
    // Saved yesterday and not yet cleared: the first answer today does that.
    const yesterday = dayBefore(todayManila());
    renderPanel({
      readiness: null,
      stats: { lastActiveDate: yesterday, activityCalendar: { [yesterday]: 12 }, dailyMath: 4, dailyESAS: 2, dailyEE: 6, dailyTarget: 40 },
    });
    expect(screen.getByRole('progressbar', { name: 'Mathematics: 0 of 10' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'ESAS: 0 of 12' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'EE: 0 of 18' })).toBeInTheDocument();
    expect(screen.getByText('40 more to hit today’s target')).toBeInTheDocument();
  });

  // Today passes the day it judged on (useManilaDay), so a screen left open
  // overnight shows the new day's target, not the render clock's guess.
  it('judges today’s target on the day it is given', () => {
    const stats = { lastActiveDate: '2026-10-08', activityCalendar: { '2026-10-08': 12 }, dailyMath: 4, dailyESAS: 2, dailyEE: 6, dailyTarget: 40 };
    const { unmount } = renderPanel({ readiness: null, stats, today: '2026-10-08' });
    expect(screen.getByRole('progressbar', { name: 'Mathematics: 4 of 10' })).toBeInTheDocument();
    unmount();
    renderPanel({ readiness: null, stats, today: '2026-10-09' });
    expect(screen.getByRole('progressbar', { name: 'Mathematics: 0 of 10' })).toBeInTheDocument();
    expect(screen.getByText('40 more to hit today’s target')).toBeInTheDocument();
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

  it('lists formula cards due for review after the due questions, opening the formula cards', () => {
    cardSummary = { due: 3, total: 10, nextDueAt: null };
    try {
      renderPanel({ readiness: null, stats: { dailyTarget: 50 } });
      const items = screen.getAllByRole('listitem').map((li) => li.textContent);
      expect(items[0]).toMatch(/Review 6 due questions/);
      expect(items[1]).toMatch(/Review 3 formula cards/);
      expect(screen.getByRole('link', { name: 'Review cards' })).toHaveAttribute('href', '/library?tab=formulas');
    } finally {
      cardSummary = null;
    }
  });

  it("leads with today's loop in place of the due-review action, starting it with the loaded set", () => {
    const items = [{ id: 'e1', subject: 'EE', text: 'e1', answer: 'A', loop: { reason: 'due' } }, { id: 'm1', subject: 'Mathematics', text: 'm1', answer: 'A', loop: { reason: 'mistake' } }];
    loopData = { items, counts: { due: 1, mistakes: 1 }, more: 0, cardsDue: 2 };
    try {
      renderPanel({ readiness: null, stats: { dailyTarget: 50 } });
      const rows = screen.getAllByRole('listitem').map((li) => li.textContent);
      expect(rows[0]).toMatch(/Start today's loop/);
      expect(rows[0]).toMatch(/1 due review and 1 open mistake, mixed by board weight/);
      expect(rows.some((t) => /Review 6 due questions/.test(t))).toBe(false);
      fireEvent.click(screen.getAllByRole('button', { name: 'Start' })[0]);
      expect(lastState.preset).toMatchObject({ source: 'today-loop', count: 2, cardsDue: 2 });
      expect(lastState.preset.items.map((q) => q.id)).toEqual(['e1', 'm1']);
    } finally {
      loopData = null;
    }
  });

  it('puts today’s study-plan task after due reviews, in place of the same-topic fix', async () => {
    plannerItems = [
      { id: 'old', kind: 'drill', topic: 'Calculus', dueDate: '2026-10-07', text: 'Drill Calculus — 15 questions' },
      { id: 'p1', kind: 'drill', topic: 'Protection', subject: 'EE', topicId: 't', targetCount: 15, dueDate: '2026-10-08', text: 'Drill Protection — 15 questions', progress: { count: 4, target: 15, done: false } },
    ];
    renderPanel({ readiness: null, stats: { dailyTarget: 50 } });
    expect(await screen.findByText('Drill Protection — 15 questions')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toMatch(/Review 6 due questions/);
    expect(items[1]).toMatch(/4 of 15 done today/);
    expect(items.some((t) => /Fix a blind spot/.test(t))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(lastState.preset).toMatchObject({ source: 'smart-drill', drillTopic: 'Protection', count: 15 });
  });

  it('a new learner: the placement plan leads the actions, the numbers say they are early, and the exam plan is asked for', () => {
    placement = { ...placement, plan: { mode: 'practice', subject: 'ESAS', reason: 'floor' }, isNew: true };
    renderPanel({ readiness: { score: 41, breakdown: {} }, stats: { dailyTarget: 50 }, answered: 6 });
    const rows = screen.getAllByRole('listitem').map((li) => li.textContent);
    // the plan's start leads (only today's loop would go before it)
    expect(rows[0]).toMatch(/Practise ESAS first/);
    expect(rows[1]).toMatch(/Review 6 due questions/);
    expect(rows.some((t) => /mock board/i.test(t))).toBe(false);
    expect(screen.getAllByText('Early estimate')).toHaveLength(2);
    expect(screen.getByText('first-run-card')).toBeInTheDocument();
  });

  it('shows the first-run card only once the placement prompt is out of the way, and never with an exam date', () => {
    placement = { ...placement, status: { status: 'none' }, isNew: true };
    const first = renderPanel({ readiness: null, stats: { dailyTarget: 50 }, answered: 0 });
    expect(screen.queryByText('first-run-card')).not.toBeInTheDocument();
    first.unmount();
    placement = { ...placement, dismissed: true };
    const second = renderPanel({ readiness: null, stats: { dailyTarget: 50 }, answered: 0 });
    expect(screen.getByText('first-run-card')).toBeInTheDocument();
    second.unmount();
    renderPanel({ readiness: null, stats: { dailyTarget: 50, examDate: '2027-04-10' }, answered: 0 });
    expect(screen.queryByText('first-run-card')).not.toBeInTheDocument();
  });

  it('holds the first-run card until the placement status is known, so it never flashes before the prompt', () => {
    placement = { ...placement, status: null, isNew: true, settled: false };
    renderPanel({ readiness: null, stats: { dailyTarget: 50 }, answered: 0 });
    expect(screen.queryByText('first-run-card')).not.toBeInTheDocument();
  });
});
