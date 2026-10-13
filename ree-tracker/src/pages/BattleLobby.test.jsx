// Battle room: scores out of the battle's length, a refused join explained, and
// Start counting only the players who are actually here.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
vi.mock('../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
let socketState;
vi.mock('../hooks/useBattleSocket', () => ({ useBattleSocket: () => socketState }));

const { default: BattleLobby } = await import('./BattleLobby');

const base = () => ({
  connected: true, connectionFailed: false, participants: [], battleStatus: 'WAITING',
  battleConfig: { config: { subject: 'EE' }, questionCount: 20, timeLimitSecs: 1800 },
  results: null, error: null, startBattle: vi.fn(),
});
const renderAt = () => render(
  <MemoryRouter initialEntries={['/battle/ABC123']}>
    <Routes><Route path="/battle/:battleId" element={<BattleLobby />} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => { socketState = base(); });

describe('BattleLobby', () => {
  it('shows each final score out of the battle’s length, not the items answered', () => {
    socketState.battleStatus = 'COMPLETED';
    socketState.results = [{ id: 'me', displayName: 'Rey', score: 5, itemsAnswered: 5, total: 20, timeTakenSecs: 600, elo: { delta: 12 } }];
    renderAt();
    expect(screen.getByText('5/20')).toBeInTheDocument();
    expect(screen.getByText(/rating \+12/)).toBeInTheDocument();
  });

  it('explains a refused join instead of waiting for players', () => {
    socketState.error = 'This battle is no longer accepting new players.';
    renderAt();
    expect(screen.getByRole('heading', { name: 'You can’t join this battle' })).toBeInTheDocument();
    expect(screen.getByText(/no longer accepting new players/)).toBeInTheDocument();
  });

  it('only lets the host start with two players who are connected', () => {
    socketState.participants = [
      { id: 'me', displayName: 'Rey', isHost: true, connected: true },
      { id: 'x', displayName: 'Ana', connected: false },
    ];
    renderAt();
    expect(screen.queryByRole('button', { name: /Start battle/ })).not.toBeInTheDocument();
    expect(screen.getByText('Waiting for another player to join')).toBeInTheDocument();
  });

  it('gives a player who left mid-battle the way back in, with the time left', () => {
    socketState.battleStatus = 'IN_PROGRESS';
    socketState.participants = [{ id: 'me', displayName: 'Rey', connected: true, finished: false, itemsAnswered: 4 }];
    socketState.timing = { endsAt: Date.now() + 22.5 * 60000, closesAt: Date.now() + 23 * 60000 };
    renderAt();
    expect(screen.getByRole('button', { name: /Enter exam room · 23 min left/ })).toBeInTheDocument();
  });

  it('says when the results are due once your answers are in, with no exam room to enter', () => {
    socketState.battleStatus = 'IN_PROGRESS';
    socketState.participants = [
      { id: 'me', displayName: 'Rey', connected: true, finished: true, score: 3, total: 20 },
      { id: 'x', displayName: 'Ana', connected: false, finished: false, itemsAnswered: 2 },
    ];
    const closesAt = new Date(2026, 9, 13, 15, 42).getTime();
    socketState.timing = { endsAt: closesAt - 30000, closesAt };
    renderAt();
    expect(screen.queryByRole('button', { name: /Enter exam room/ })).not.toBeInTheDocument();
    expect(screen.getByText('Your answers are in')).toBeInTheDocument();
    expect(screen.getByText(/Results by .*3:42.*even if someone has left/)).toBeInTheDocument();
  });

  it('opens your answers for review once the battle is over', () => {
    socketState.battleStatus = 'COMPLETED';
    socketState.results = [{ id: 'me', displayName: 'Rey', score: 5, total: 20, timeTakenSecs: 600 }];
    renderAt();
    expect(screen.getByRole('link', { name: /Review your answers/ })).toHaveAttribute('href', `/exams/sittings/${encodeURIComponent('ABC123:me')}`);
  });
});
