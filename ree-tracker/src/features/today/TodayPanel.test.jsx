// The Today panel: the lead action ("Up next", the hero), the readiness index
// (with the breakdown the API always returned but nothing rendered), the PRC
// pass probability, today's target split by subject, and the rest of the
// ordered actions ("Also today", today's plan task included), each of which
// launches the right session.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
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

// The shortlist as the learner reads it: the "Up next" hero, then the
// "Also today" rows. The hero waits until every source that can lead has
// answered, so this waits for it.
async function actionRows() {
  const lead = (await screen.findByText('Up next')).closest('section');
  const also = screen.queryByRole('region', { name: 'Also today' });
  return [lead.textContent, ...(also ? within(also).getAllByRole('listitem').map((li) => li.textContent) : [])];
}

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
    for (const name of ['Board readiness index', 'Pass probability', 'Today’s target']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
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

  it('leads with one action, lists the rest, and launches the right session', async () => {
    renderPanel({ readiness: null, stats: { dailyTarget: 50 } });
    const items = await actionRows();
    expect(items[0]).toMatch(/Up next/);
    expect(items[0]).toMatch(/Review 6 due questions/);
    expect(items[1]).toMatch(/Fix a blind spot: Protection/);
    // The lead has the one primary button; the rest are secondary.
    expect(screen.getByRole('button', { name: 'Review' }).className).toMatch(/--btn-ink/);
    // The target tile already says how many are left, so it isn't listed too.
    expect(items.some((t) => /more to hit today’s target/.test(t))).toBe(false);
    expect(screen.getByText('50 more to hit today’s target')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Drill' })[0]);
    expect(screen.getByText('review-page')).toBeInTheDocument();
    expect(lastState.preset).toMatchObject({ source: 'smart-drill', drillMode: 'blind-spot', drillTopicId: 't' });
  });

  it('lists formula cards due for review after the due questions, opening the formula cards', async () => {
    cardSummary = { due: 3, total: 10, nextDueAt: null };
    try {
      renderPanel({ readiness: null, stats: { dailyTarget: 50 } });
      const items = await actionRows();
      expect(items[0]).toMatch(/Review 6 due questions/);
      expect(items[1]).toMatch(/Review 3 formula cards/);
      expect(screen.getByRole('link', { name: 'Review cards' })).toHaveAttribute('href', '/library?tab=formulas');
    } finally {
      cardSummary = null;
    }
  });

  it("leads with today's loop in place of the due-review action, starting it with the loaded set", async () => {
    const items = [{ id: 'e1', subject: 'EE', text: 'e1', answer: 'A', loop: { reason: 'due' } }, { id: 'm1', subject: 'Mathematics', text: 'm1', answer: 'A', loop: { reason: 'mistake' } }];
    loopData = { items, counts: { due: 1, mistakes: 1 }, more: 0, cardsDue: 2 };
    try {
      renderPanel({ readiness: null, stats: { dailyTarget: 50 } });
      const rows = await actionRows();
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
    const items = await actionRows();
    expect(items[0]).toMatch(/Review 6 due questions/);
    expect(items[1]).toMatch(/4 of 15 done today/);
    expect(items.some((t) => /Fix a blind spot/.test(t))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(lastState.preset).toMatchObject({ source: 'smart-drill', drillTopic: 'Protection', count: 15 });
  });

  it('an established learner with a settled forecast: a subject projected under the floor leads after the loop', async () => {
    forecast = {
      loading: false,
      snapshot: {
        ...forecast.snapshot,
        weakTopics: [{ topic: 'Chemistry', subject: 'ESAS' }],
        subjectForecasts: { projectedGWA: { mean: 66 }, subjects: { Mathematics: { expected: 70 }, ESAS: { expected: 47 }, EE: { expected: 74 } } },
      },
    };
    renderPanel({ readiness: { score: 61, breakdown: {} }, stats: { dailyTarget: 50 } });
    const rows = await actionRows();
    expect(rows[0]).toMatch(/Lift ESAS above the 50% floor/);
    expect(rows[0]).toMatch(/puts ESAS at 47%/);
    // An early forecast (no weak topic found yet) isn't trusted for it.
    cleanup();
    forecast = { loading: false, snapshot: { ...forecast.snapshot, weakTopics: [] } };
    renderPanel({ readiness: { score: 61, breakdown: {} }, stats: { dailyTarget: 50 } });
    await actionRows();
    expect(screen.queryByText(/above the 50% floor/)).not.toBeInTheDocument();
  });

  it('between 30 and 99 answers (the forecast still early), the placement test\u2019s floor stands', async () => {
    placement = { ...placement, plan: { mode: 'practice', subject: 'ESAS', reason: 'floor', expected: 44 } };
    forecast = {
      loading: false,
      snapshot: { ...forecast.snapshot, subjectForecasts: { projectedGWA: { mean: 66 }, subjects: { ESAS: { expected: 70 } } } },
    };
    renderPanel({ readiness: { score: 52, breakdown: {} }, stats: { dailyTarget: 50 }, answered: 60 });
    const rows = await actionRows();
    expect(rows[0]).toMatch(/Lift ESAS above the 50% floor/);
    expect(rows[0]).toMatch(/Your placement test put ESAS at 44%/);
  });

  it('a new learner: the placement plan leads the actions, the numbers say they are early, and the exam plan is asked for', async () => {
    placement = { ...placement, plan: { mode: 'practice', subject: 'ESAS', reason: 'floor' }, isNew: true };
    renderPanel({ readiness: { score: 41, breakdown: {} }, stats: { dailyTarget: 50 }, answered: 6 });
    const rows = await actionRows();
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

  it('holds the lead until every source that can claim it has answered, then shows it', async () => {
    loopData = undefined; // today's loop still loading
    try {
      const { rerender } = renderPanel({ readiness: null, stats: { dailyTarget: 50 } });
      await Promise.resolve();
      expect(screen.getByLabelText('Finding your next step')).toBeInTheDocument();
      expect(screen.queryByText('Up next')).not.toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Also today' })).not.toBeInTheDocument();
      loopData = null; // answered: no loop today
      rerender(
        <MemoryRouter>
          <Routes><Route path="/" element={<TodayPanel uid="u1" answered={500} readiness={null} stats={{ dailyTarget: 50 }} />} /></Routes>
        </MemoryRouter>,
      );
      expect((await actionRows())[0]).toMatch(/Review 6 due questions/);
    } finally {
      loopData = null;
    }
  });

  it('does not wait on a slow source for good', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    loopData = undefined;
    try {
      renderPanel({ readiness: null, stats: { dailyTarget: 50 } });
      expect(screen.getByLabelText('Finding your next step')).toBeInTheDocument();
      await vi.advanceTimersByTimeAsync(4000);
      expect((await actionRows())[0]).toMatch(/Review 6 due questions/);
    } finally {
      vi.useRealTimers();
      loopData = null;
    }
  });

  it('holds the first-run card until the placement status is known, so it never flashes before the prompt', () => {
    placement = { ...placement, status: null, isNew: true, settled: false };
    renderPanel({ readiness: null, stats: { dailyTarget: 50 }, answered: 0 });
    expect(screen.queryByText('first-run-card')).not.toBeInTheDocument();
  });
});
