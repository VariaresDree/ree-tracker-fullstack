// Battle room: scores out of the battle's length, a refused join explained,
// Start counting only the players who are actually here, and Rematch (or
// joining the one someone else started) once it's over.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
let online = true;
vi.mock('../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => online }));
const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));
let socketState;
// Like the real hook, the state is held by the component: the state taken
// when the room mounts, so a room left mounted for the next battle would keep
// the last battle's results.
const socketCalls = [];
vi.mock('../hooks/useBattleSocket', async () => {
  const { useState } = await import('react');
  return { useBattleSocket: (id) => { socketCalls.push(id); return useState(() => socketState)[0]; } };
});
const requestRematch = vi.fn();
vi.mock('../services/dbQueries', () => ({ requestRematch: (...a) => requestRematch(...a) }));

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

beforeEach(() => {
  socketState = base();
  online = true;
  socketCalls.length = 0;
  requestRematch.mockReset();
  toast.error.mockClear();
});
const finished = () => {
  socketState.battleStatus = 'COMPLETED';
  socketState.results = [
    { id: 'ana', displayName: 'Ana', score: 6, total: 20, timeTakenSecs: 500 },
    { id: 'me', displayName: 'Rey', score: 5, total: 20, timeTakenSecs: 600 },
  ];
};

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

  it('starts a rematch and opens its lobby', async () => {
    finished();
    requestRematch.mockImplementation(async () => {
      // The new battle's room starts empty, not with this one's results.
      socketState = base();
      return { battleId: 'NEW123', created: true };
    });
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Rematch' }));
    expect(await screen.findByText('NEW123')).toBeInTheDocument();
    expect(requestRematch).toHaveBeenCalledWith('ABC123');
    expect(socketCalls.at(-1)).toBe('NEW123');
    expect(screen.queryByText('Final scores')).not.toBeInTheDocument();
  });

  it('says when someone else started a rematch, and joins theirs', async () => {
    finished();
    socketState.rematch = { battleId: 'REM456', status: 'WAITING', by: { userId: 'ana', displayName: 'Ana' } };
    renderAt();
    expect(screen.getByText(/started a rematch/)).toHaveTextContent('Ana started a rematch');
    expect(screen.queryByRole('button', { name: 'Rematch' })).not.toBeInTheDocument();
    socketState = base();
    fireEvent.click(screen.getByRole('button', { name: 'Join the rematch' }));
    expect(await screen.findByText('REM456')).toBeInTheDocument();
    expect(requestRematch).not.toHaveBeenCalled();
  });

  it('says Rematch needs a connection when offline', () => {
    finished();
    online = false;
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Rematch' }));
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/needs a connection/));
    expect(requestRematch).not.toHaveBeenCalled();
  });

  it('hides Rematch and Join when the rematch has already started', () => {
    finished();
    socketState.rematch = { battleId: 'REM456', status: 'IN_PROGRESS', by: { userId: 'ana', displayName: 'Ana' } };
    renderAt();
    expect(screen.queryByRole('button', { name: 'Rematch' })).not.toBeInTheDocument();
    expect(screen.queryByText(/started a rematch/)).not.toBeInTheDocument();
  });
});
