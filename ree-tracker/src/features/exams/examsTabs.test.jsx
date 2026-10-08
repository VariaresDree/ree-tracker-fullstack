// The Exams tabs split out of the 700-line Arena page: Battles, Gauntlet and
// Rankings render, keep their behavior, and head their sections with h2 under
// the hub's h1 (Arena's cards used h3).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), loading: vi.fn() });
  return { default: toast };
});
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
let storeStats;
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel({ stats: storeStats }) }));
vi.mock('../../services/dbQueries', () => ({
  fetchMultiplayerBattle: vi.fn(),
  fetchPaginatedLeaderboard: vi.fn(),
  fetchLeaderboardMe: vi.fn(),
}));

const { fetchPaginatedLeaderboard, fetchLeaderboardMe } = await import('../../services/dbQueries');
const { default: BattlesTab } = await import('./BattlesTab');
const { default: GauntletTab } = await import('./GauntletTab');
const { default: RankingsTab } = await import('./RankingsTab');

// IntersectionObserver drives the rankings' infinite scroll; jsdom lacks it.
globalThis.IntersectionObserver = class { observe() {} disconnect() {} };

let path;
function PathProbe() {
  path = useLocation().pathname;
  return null;
}
const renderTab = (ui) => render(
  <MemoryRouter initialEntries={['/exams']}>
    <Routes><Route path="*" element={<>{ui}<PathProbe /></>} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  vi.clearAllMocks();
  storeStats = { gauntletLevel: 2, totalAnswered: 600 };
});

describe('BattlesTab', () => {
  it('joins by a 6-character code and hosts in the mock-board formats', () => {
    renderTab(<BattlesTab />);
    expect(screen.getByRole('heading', { level: 2, name: 'Join a battle' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Host a battle' })).toBeInTheDocument();
    const join = screen.getByRole('button', { name: 'Join battle' });
    expect(join).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Battle code'), { target: { value: 'abc123' } });
    expect(join).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /Host a battle/ }));
    const formats = within(screen.getByRole('radiogroup', { name: 'Battle format' })).getAllByRole('radio');
    expect(formats.map((r) => r.textContent.trim())).toEqual(
      expect.arrayContaining([expect.stringMatching(/Custom/), expect.stringMatching(/PRC Standard/), expect.stringMatching(/Blended/)]),
    );
  });
});

describe('GauntletTab', () => {
  it('shows the ladder: cleared below your level, open at it once you have answered enough', () => {
    renderTab(<GauntletTab />);
    expect(screen.getByRole('heading', { level: 2, name: /The Gauntlet/ })).toBeInTheDocument();
    expect(screen.getByText('Cleared')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start tier 2 exam' }));
    expect(path).toBe('/gauntlet/2');
  });

  it('a failed run locks open tiers with a countdown', () => {
    storeStats = { ...storeStats, gauntletLockUntil: Date.now() + 3600 * 1000 };
    renderTab(<GauntletTab />);
    expect(screen.queryByRole('button', { name: 'Start tier 2 exam' })).not.toBeInTheDocument();
    expect(screen.getByText(/Locked — 0h 59m|Locked — 1h 0m/)).toBeInTheDocument();
  });
});

describe('RankingsTab', () => {
  const agent = (uid, theta, extra = {}) => ({ uid, displayName: uid.toUpperCase(), thetaRating: theta, streak: 1, ...extra });

  it('numbers rows by place, and your rank agrees with the list', async () => {
    fetchPaginatedLeaderboard.mockResolvedValue({ agents: [agent('a', 0.9), agent('me', 0.5), agent('c', 0.1)], lastDoc: null });
    fetchLeaderboardMe.mockResolvedValue({ rank: 3, total: 3 }); // a stale snapshot
    renderTab(<RankingsTab />);
    expect(await screen.findByText('ME')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Your rank' })).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    const rows = screen.getAllByRole('button', { expanded: false }).map((b) => b.textContent);
    expect(rows[0]).toMatch(/^1A/);
    expect(rows[1]).toMatch(/^2ME/);
  });

  it('the server’s leading "you are here" row is not numbered #1', async () => {
    fetchPaginatedLeaderboard.mockResolvedValue({
      agents: [agent('me', -0.5, { offBoard: true }), agent('a', 0.9), agent('b', 0.4)],
      lastDoc: null,
    });
    fetchLeaderboardMe.mockResolvedValue({ rank: 41, total: 60 });
    renderTab(<RankingsTab />);
    await screen.findByText('ME');
    const rows = screen.getAllByRole('button', { expanded: false }).map((b) => b.textContent);
    expect(rows[0]).toMatch(/^—ME/);
    expect(rows[1]).toMatch(/^1A/);
    expect(await screen.findByText('#41')).toBeInTheDocument();
  });
});
