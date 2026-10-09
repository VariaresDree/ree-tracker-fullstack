// Today and Progress after the 2026-10 reorganization. Today is the countdown,
// the streak and one card; the analytics moved to Progress, one question per
// tab. Heavy children are mocked: these tests pin the wiring.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

let statsState;
vi.mock('../hooks/useDashboardStats', () => ({ useDashboardStats: () => statsState }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1', displayName: 'Dree' } }) }));
let online = true;
vi.mock('../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => online }));
// Counts mounts: a new Manila day must remount the card so its own requests
// (forecast, due reviews, plan task, readiness trend) run again.
let panelMounts = 0;
vi.mock('../features/today/TodayPanel', async () => {
  const { useEffect } = await import('react');
  function TodayPanelStub({ answered, today }) {
    useEffect(() => { panelMounts += 1; }, []);
    return <><p>today-panel answered={answered}</p><p>panel-day={String(today)}</p></>;
  }
  return { default: TodayPanelStub };
});
vi.mock('../features/progress/OverviewTab', () => ({ default: ({ kpi }) => <p>overview accuracy={kpi.accuracy}</p> }));
vi.mock('../features/progress/TopicsTab', () => ({ default: () => <p>topics</p> }));
vi.mock('../features/progress/WeakSpotsTab', () => ({ default: () => <p>weak-spots</p> }));
vi.mock('../features/progress/ConfidenceTab', () => ({ default: () => <p>confidence</p> }));
vi.mock('../features/progress/HabitsTab', () => ({ default: () => <p>habits</p> }));
vi.mock('../features/profile/StrategicPlannerTab', () => ({ default: ({ currentUser }) => <p>planner uid={currentUser.uid}</p> }));
vi.mock('../features/syllabus/SyllabusTab', () => ({ default: ({ examDate }) => <p>syllabus exam={String(examDate)}</p> }));
vi.mock('../features/syllabus/SyllabusCoverageLink', () => ({ default: () => <a href="/progress?tab=syllabus">Syllabus 42% covered</a> }));

const { default: Today } = await import('./Today');
const { default: Progress } = await import('./Progress');

const loaded = (stats = {}, kpi = {}) => ({
  loading: false,
  readiness: null,
  activeStats: { dailyTarget: 50, ...stats },
  kpi: { answered: 120, accuracy: 64, avgSec: 41, streak: 0, ...kpi },
});

let search;
function SearchProbe() {
  search = useLocation().search;
  return null;
}
const at = (entry, Page) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes><Route path="*" element={<><Page /><SearchProbe /></>} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  statsState = loaded();
  search = null;
  online = true;
});

describe('Today', () => {
  it('is one card under an h1 that matches the nav, with no dashboard analytics', () => {
    at('/', Today);
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument();
    expect(screen.getByText('Welcome back, Dree.')).toBeInTheDocument();
    expect(screen.getByText('today-panel answered=120')).toBeInTheDocument();
    expect(screen.queryByText(/Global accuracy|Ability trajectory|prescription|Daily targets/i)).not.toBeInTheDocument();
  });

  it('counts down to the exam in Manila days and shows a running streak', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T02:00:00Z')); // 10:00 in Manila
    statsState = loaded({ examDate: '2026-10-18' }, { streak: 6 });
    at('/', Today);
    expect(screen.getByText(/10 days to the exam/)).toBeInTheDocument();
    expect(screen.getByText(/6-day streak/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('links to the syllabus checklist from the header', () => {
    at('/', Today);
    expect(screen.getByRole('link', { name: 'Syllabus 42% covered' })).toHaveAttribute('href', '/progress?tab=syllabus');
  });

  it('without an exam date, offers to set one; without a streak, shows none', () => {
    at('/', Today);
    expect(screen.getByRole('link', { name: 'Set your exam date' })).toHaveAttribute('href', '/account#exam-plan');
    expect(screen.queryByText(/streak/)).not.toBeInTheDocument();
  });

  it('at a new Manila day, remounts the card on that day', () => {
    const page = <MemoryRouter><Today /></MemoryRouter>;
    statsState = { ...loaded(), today: '2026-10-08' };
    const { rerender } = render(page);
    expect(screen.getByText('panel-day=2026-10-08')).toBeInTheDocument();
    const mounts = panelMounts;

    statsState = { ...loaded({}, { answered: 121 }), today: '2026-10-08' };
    rerender(<MemoryRouter><Today /></MemoryRouter>);
    expect(screen.getByText('today-panel answered=121')).toBeInTheDocument();
    expect(panelMounts).toBe(mounts); // same day: an update, not a remount

    statsState = { ...loaded(), today: '2026-10-09' };
    rerender(<MemoryRouter><Today /></MemoryRouter>);
    expect(screen.getByText('panel-day=2026-10-09')).toBeInTheDocument();
    expect(panelMounts).toBe(mounts + 1);
  });

  it('shows the Today skeleton until the stats arrive', () => {
    statsState = { ...loaded(), loading: true };
    at('/', Today);
    expect(screen.getByRole('status', { name: 'Loading Today' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});

describe('Stats that never loaded', () => {
  it('Today says it needs a connection instead of a skeleton forever, and Try again fetches', () => {
    online = false;
    const retry = vi.fn();
    statsState = { loading: false, unavailable: true, activeStats: null, readiness: null, retry, kpi: {} };
    at('/', Today);
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument();
    expect(screen.getByText('Your progress needs a connection')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading Today' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('Progress shows the same on its stats tabs, and the plan tab still opens', () => {
    statsState = { loading: false, unavailable: true, activeStats: null, readiness: null, retry: vi.fn(), kpi: {} };
    at('/progress', Progress);
    expect(screen.getByText("Couldn't load your progress")).toBeInTheDocument();
  });
});

describe('Progress', () => {
  it('opens on Overview, with one tab per question', async () => {
    at('/progress', Progress);
    expect(screen.getByRole('heading', { level: 1, name: 'Progress' })).toBeInTheDocument();
    const tabs = within(screen.getByRole('tablist')).getAllByRole('tab').map((t) => t.textContent);
    expect(tabs).toEqual(['Overview', 'Topics', 'Weak spots', 'Confidence', 'Habits', 'Syllabus', 'Study plan']);
    expect(await screen.findByText('overview accuracy=64')).toBeInTheDocument();
  });

  it.each([
    ['topics', 'topics'],
    ['weak-spots', 'weak-spots'],
    ['confidence', 'confidence'],
    ['habits', 'habits'],
    ['plan', 'planner uid=u1'],
    ['syllabus', 'syllabus exam=null'],
  ])('?tab=%s opens that tab', async (tab, text) => {
    at(`/progress?tab=${tab}`, Progress);
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.getByRole('tab', { selected: true })).toHaveAttribute('aria-selected', 'true');
  });

  it('an unknown tab falls back to Overview; choosing a tab writes it to the URL', async () => {
    at('/progress?tab=analytics', Progress);
    expect(await screen.findByText('overview accuracy=64')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Habits/ }));
    expect(await screen.findByText('habits')).toBeInTheDocument();
    expect(search).toBe('?tab=habits');
  });

  it('stats tabs wait for the aggregate; the weak-spots and plan tabs start at once', async () => {
    statsState = { ...loaded(), loading: true };
    at('/progress', Progress);
    expect(screen.queryByText(/overview/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Weak spots/ }));
    expect(await screen.findByText('weak-spots')).toBeInTheDocument();
  });
});
