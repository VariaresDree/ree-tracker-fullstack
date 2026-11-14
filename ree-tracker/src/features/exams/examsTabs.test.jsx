// The Exams tabs split out of the 700-line Arena page: Battles, Gauntlet and
// Rankings render, keep their behavior, and head their sections with h2 under
// the hub's h1 (Arena's cards used h3).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), loading: vi.fn() });
  return { default: toast };
});
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
let online = true;
vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => online }));
let manilaDay = '2026-11-14';
vi.mock('../../hooks/useManilaDay', () => ({ useManilaDay: () => manilaDay }));
let storeStats;
const TOS = { EE: ['Electromagnetism', 'Electric Circuits 2'], Mathematics: ['Calculus 1'] };
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel({ stats: storeStats, dynamicTOS: TOS }) }));
const createMultiplayerBattle = vi.hoisted(() => vi.fn(async () => 'ABC123'));
vi.mock('../../services/dbQueries', () => ({
  createMultiplayerBattle,
  fetchMultiplayerBattle: vi.fn(),
  fetchActiveBattles: vi.fn(async () => ({ items: [], serverNow: Date.now() })),
  fetchPaginatedLeaderboard: vi.fn(),
  fetchLeaderboardMe: vi.fn(),
}));
// Past battles has its own tests (BattleHistory.test.jsx).
vi.mock('./BattleHistory', () => ({ default: () => <section aria-label="Past battles" /> }));
vi.mock('./RematchInvites', () => ({ default: () => null }));
const drawPrefs = vi.hoisted(() => ({ value: { drawMode: 'even', ownCounts: {} } }));
vi.mock('../board-simulator/useDrawPrefs', () => ({ useDrawPrefs: () => ({ prefs: drawPrefs.value, save: vi.fn() }) }));
vi.mock('../board-simulator/DrawPicker', () => ({ default: () => <p>How questions are picked</p> }));

const { fetchPaginatedLeaderboard, fetchLeaderboardMe } = await import('../../services/dbQueries');
const { default: BattlesTab } = await import('./BattlesTab');
const { default: GauntletTab } = await import('./GauntletTab');
const { default: RankingsTab } = await import('./RankingsTab');
const { battleLabel } = await import('./battleModes');

// IntersectionObserver drives the rankings' infinite scroll; jsdom lacks it.
globalThis.IntersectionObserver = class { observe() {} disconnect() {} };

let path;
function PathProbe() {
  path = useLocation().pathname;
  return null;
}
const tabTree = (ui) => (
  <MemoryRouter initialEntries={['/exams']}>
    <Routes><Route path="*" element={<>{ui}<PathProbe /></>} /></Routes>
  </MemoryRouter>
);
const renderTab = (ui) => render(tabTree(ui));

beforeEach(() => {
  vi.clearAllMocks();
  online = true;
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
    expect(screen.getByRole('region', { name: 'Past battles' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Host a battle/ }));
    const formats = within(screen.getByRole('radiogroup', { name: 'Battle format' })).getAllByRole('radio');
    expect(formats.map((r) => r.textContent.trim())).toEqual(
      expect.arrayContaining([expect.stringMatching(/Custom mock/), expect.stringMatching(/One subject/), expect.stringMatching(/Mixed paper/)]),
    );
  });
});

describe('hosting a battle', () => {
  const host = async () => {
    renderTab(<BattlesTab />);
    fireEvent.click(screen.getByRole('button', { name: /Host a battle/ }));
    expect(screen.getByText('How questions are picked')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }));
    await vi.waitFor(() => expect(createMultiplayerBattle).toHaveBeenCalled());
    return createMultiplayerBattle.mock.calls.at(-1)[0];
  };

  it('sends the host’s draw choice with the spec', async () => {
    drawPrefs.value = { drawMode: 'board', ownCounts: {} };
    const config = await host();
    expect(config.drawMode).toBe('board');
    expect(config.ownCounts).toBeUndefined();
  });

  it('their own counts go along only when they’re the choice', async () => {
    drawPrefs.value = { drawMode: 'own', ownCounts: { EE: { Machines: 5 } } };
    expect((await host()).ownCounts).toEqual({ EE: { Machines: 5 } });
  });

  it('with all topics, no topic is sent', async () => {
    drawPrefs.value = { drawMode: 'even', ownCounts: {} };
    expect((await host()).subtopic).toBeUndefined();
  });

  it('a custom battle on one topic sends it, without a draw choice', async () => {
    drawPrefs.value = { drawMode: 'own', ownCounts: { EE: { Machines: 5 } } };
    renderTab(<BattlesTab />);
    fireEvent.click(screen.getByRole('button', { name: /Host a battle/ }));
    const topic = screen.getByLabelText('Topic');
    expect(within(topic).getAllByRole('option').map((o) => o.textContent)).toEqual(['All topics', 'Electromagnetism', 'Electric Circuits 2']);
    fireEvent.change(topic, { target: { value: 'Electric Circuits 2' } });
    // One topic leaves nothing to pick by.
    expect(screen.queryByText('How questions are picked')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }));
    await vi.waitFor(() => expect(createMultiplayerBattle).toHaveBeenCalled());
    const config = createMultiplayerBattle.mock.calls.at(-1)[0];
    expect(config).toMatchObject({ mode: 'subject', subject: 'EE', subtopic: 'Electric Circuits 2', count: 20 });
    expect(config.drawMode).toBeUndefined();
    expect(config.ownCounts).toBeUndefined();
  });

  it('a new subject starts on all of its topics, and a PRC paper has no topic', () => {
    renderTab(<BattlesTab />);
    fireEvent.click(screen.getByRole('button', { name: /Host a battle/ }));
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'Electromagnetism' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Mathematics' } });
    const topic = screen.getByLabelText('Topic');
    expect(topic).toHaveValue('All');
    expect(within(topic).getAllByRole('option').map((o) => o.textContent)).toEqual(['All topics', 'Calculus 1']);
    fireEvent.click(screen.getByRole('radio', { name: /One subject/ }));
    expect(screen.queryByLabelText('Topic')).not.toBeInTheDocument();
    expect(screen.getByText('How questions are picked')).toBeInTheDocument();
  });
});

describe('battleLabel', () => {
  it('names the topic of a one-topic battle', () => {
    expect(battleLabel({ mode: 'subject', subject: 'EE', subtopic: 'Electric Circuits 2' })).toBe('EE · Electric Circuits 2');
    expect(battleLabel({ mode: 'subject', subject: 'EE', subtopic: 'All' })).toBe('EE');
    expect(battleLabel({ mode: 'subject', subject: 'EE' })).toBe('EE');
    expect(battleLabel({ mode: 'blended', subject: 'Blended' })).toBe('Full mock');
    expect(battleLabel(null)).toBe('Battle');
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

  it('shows every tier and board at once, with nothing to open', () => {
    renderTab(<GauntletTab />);
    for (const name of [/Tier 1: Warm-up/, /Tier 2: Stretch/, /Tier 3: Full length/, /Tier 4: Pressure round/, 'Mathematics', 'ESAS', 'EE']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(document.querySelector('details')).toBeNull();
    expect(screen.getByText(/They open once all four tiers are cleared/)).toBeInTheDocument();
    // Locked boards offer nothing to press.
    expect(screen.getAllByLabelText('Locked')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /board/ })).not.toBeInTheDocument();
  });

  it('highlights the tier to reach, and shows how close each locked tier is', () => {
    renderTab(<GauntletTab />);
    expect(screen.getByText('You’re here').closest('li')).toHaveTextContent('Tier 2: Stretch');
    expect(screen.getByRole('progressbar', { name: 'Tier 3 opens at 1000 answered: 600 so far' })).toHaveAttribute('aria-valuenow', '600');
    expect(screen.getByText('600 / 1,000 answered')).toBeInTheDocument();
    expect(screen.getByText('600 / 2,000 answered')).toBeInTheDocument();
  });

  it('the current tier still short of answers shows its bar and no Start', () => {
    storeStats = { gauntletLevel: 1, totalAnswered: 50 };
    renderTab(<GauntletTab />);
    expect(screen.getByText('You’re here').closest('li')).toHaveTextContent('50 / 200 answered');
    expect(screen.queryByRole('button', { name: /Start tier/ })).not.toBeInTheDocument();
  });

  it('a later tier with enough answers asks for the tier before it', () => {
    storeStats = { gauntletLevel: 1, totalAnswered: 600 };
    renderTab(<GauntletTab />);
    expect(screen.getByRole('button', { name: 'Start tier 1 exam' })).toBeInTheDocument();
    expect(screen.getByText('Clear tier 1 first')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start tier 2 exam' })).not.toBeInTheDocument();
  });

  it('a failed run locks open tiers with a countdown', () => {
    storeStats = { ...storeStats, gauntletLockUntil: Date.now() + 3600 * 1000 };
    renderTab(<GauntletTab />);
    expect(screen.queryByRole('button', { name: 'Start tier 2 exam' })).not.toBeInTheDocument();
    expect(screen.getByText(/Locked — 0h 59m|Locked — 1h 0m/)).toBeInTheDocument();
  });
});

describe('GauntletTab — offline', () => {
  afterEach(() => { online = true; });

  it('a blended tier needs a connection: its Start is off, and it says why', () => {
    online = false;
    storeStats = { gauntletLevel: 1, totalAnswered: 500 };
    renderTab(<GauntletTab />);
    expect(screen.getByRole('button', { name: 'Start tier 1 exam' })).toBeDisabled();
    expect(screen.getByText('Needs a connection: this tier’s questions come from the server.')).toBeInTheDocument();
  });

  it('a subject board can still start offline', () => {
    online = false;
    storeStats = { gauntletLevel: 5, totalAnswered: 5000 };
    renderTab(<GauntletTab />);
    expect(screen.getByRole('button', { name: 'Start the EE board' })).toBeEnabled();
  });

  it('online, nothing changes', () => {
    storeStats = { gauntletLevel: 1, totalAnswered: 500 };
    renderTab(<GauntletTab />);
    expect(screen.getByRole('button', { name: 'Start tier 1 exam' })).toBeEnabled();
    expect(screen.queryByText(/Needs a connection/)).toBeNull();
  });
});

describe('GauntletTab — loading and cleared boards', () => {
  it('waits for the stats instead of showing level 1 with every tier locked', () => {
    storeStats = null;
    renderTab(<GauntletTab />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading the Gauntlet');
    expect(screen.queryByText('Level 1')).not.toBeInTheDocument();
  });

  it('a cleared subject board says so and can be taken again', () => {
    storeStats = { gauntletLevel: 5, totalAnswered: 9000, gauntletBoardClears: ['Mathematics'] };
    renderTab(<GauntletTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Take again: Mathematics board' }));
    expect(path).toBe('/gauntlet/5');
    // One primary button: the first board still to clear.
    expect(screen.getByRole('button', { name: 'Start the ESAS board' }).className).toMatch(/--btn-ink/);
    expect(screen.getByRole('button', { name: 'Start the EE board' }).className).not.toMatch(/--btn-ink/);
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

  it('a new Manila day loads the list and your rank again (a screen left open kept yesterday’s streaks)', async () => {
    fetchPaginatedLeaderboard
      .mockResolvedValueOnce({ agents: [agent('a', 0.9, { streak: 3 })], lastDoc: null })
      .mockResolvedValueOnce({ agents: [agent('a', 0.9, { streak: 0 })], lastDoc: null });
    fetchLeaderboardMe.mockResolvedValue({ rank: 1, total: 1 });
    const view = renderTab(<RankingsTab />);
    expect(await screen.findByText('A')).toBeInTheDocument();
    expect(fetchPaginatedLeaderboard).toHaveBeenCalledTimes(1);

    manilaDay = '2026-11-15';
    view.rerender(tabTree(<RankingsTab />));
    await vi.waitFor(() => expect(fetchPaginatedLeaderboard).toHaveBeenCalledTimes(2));
    expect(fetchLeaderboardMe).toHaveBeenCalledTimes(2);
  });

  it('greys the flame of a streak not yet extended today, and says what that means', async () => {
    fetchPaginatedLeaderboard.mockResolvedValue({
      agents: [
        agent('a', 0.9, { streak: 5, studiedToday: true }),
        agent('b', 0.5, { streak: 3, studiedToday: false }),
        agent('c', 0.1, { streak: 0, studiedToday: false }), // no streak to lose
      ],
      lastDoc: null,
    });
    fetchLeaderboardMe.mockResolvedValue({ rank: null, total: 3 });
    renderTab(<RankingsTab />);
    await screen.findByText('B');
    // In words for a screen reader, on the one row it applies to.
    const notes = screen.getAllByText(', no answers yet today');
    expect(notes).toHaveLength(1);
    expect(notes[0].closest('button').textContent).toMatch(/^2B/);
    expect(screen.getByText('A grey flame means no answers yet today. That streak ends at midnight unless they answer.')).toBeInTheDocument();
  });

  it('when every streak is extended, or the server doesn’t say, nothing is greyed or explained', async () => {
    fetchPaginatedLeaderboard.mockResolvedValue({ agents: [agent('a', 0.9, { streak: 5, studiedToday: true }), agent('b', 0.5, { streak: 3 })], lastDoc: null });
    fetchLeaderboardMe.mockResolvedValue({ rank: null, total: 2 });
    renderTab(<RankingsTab />);
    await screen.findByText('B');
    expect(screen.queryByText(', no answers yet today')).toBeNull();
    expect(screen.queryByText(/A grey flame/)).toBeNull();
  });

  it('a failed load says so with Try again, not "No rankings yet"', async () => {
    fetchPaginatedLeaderboard.mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce({ agents: [agent('a', 0.9)], lastDoc: null });
    fetchLeaderboardMe.mockResolvedValue({ rank: 1, total: 1 });
    renderTab(<RankingsTab />);
    expect(await screen.findByText("Couldn't load the rankings")).toBeInTheDocument();
    expect(screen.queryByText('No rankings yet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('A')).toBeInTheDocument();
  });

  it('back online after a failed load, it asks again and shows that, not the old error', async () => {
    let answer;
    fetchPaginatedLeaderboard.mockRejectedValueOnce(new Error('[OFFLINE]'))
      .mockImplementationOnce(() => new Promise((resolve) => { answer = resolve; }));
    fetchLeaderboardMe.mockResolvedValue({ rank: 1, total: 1 });
    const view = renderTab(<RankingsTab />);
    expect(await screen.findByText("Couldn't load the rankings")).toBeInTheDocument();
    online = false;
    view.rerender(tabTree(<RankingsTab />));
    online = true;
    view.rerender(tabTree(<RankingsTab />));
    expect(screen.getByText('Loading rankings…')).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load the rankings")).not.toBeInTheDocument();
    answer({ agents: [agent('a', 0.9)], lastDoc: null });
    expect(await screen.findByText('A')).toBeInTheDocument();
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
