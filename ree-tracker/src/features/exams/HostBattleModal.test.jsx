import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Host a battle: the question order (each player's own, or one for everyone)
// and the pace the time limit allows.

const createMultiplayerBattle = vi.fn(async () => 'ABC123');
vi.mock('../../services/dbQueries', () => ({ createMultiplayerBattle: (...a) => createMultiplayerBattle(...a), apiRequest: vi.fn(async () => ({ items: [] })) }));
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel({ dynamicTOS: { EE: ['Machines'], ESAS: [], Mathematics: [] } }) }));
vi.mock('../board-simulator/useDrawPrefs', () => ({ useDrawPrefs: () => ({ prefs: { drawMode: 'even' }, save: vi.fn() }) }));
vi.mock('../board-simulator/DrawPicker', () => ({ default: () => null }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { loading: vi.fn(), success: vi.fn(), error: vi.fn() }) }));

const { default: HostBattleModal } = await import('./HostBattleModal');

const show = () => render(<MemoryRouter><HostBattleModal open onClose={vi.fn()} isOnline /></MemoryRouter>);
beforeEach(() => createMultiplayerBattle.mockClear());

describe('Host a battle', () => {
  it('shuffles for each player by default, and says why', async () => {
    show();
    expect(screen.getByRole('radio', { name: 'Shuffled for each player' })).toBeChecked();
    expect(screen.getByText(/nobody can call out answers/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }));
    await waitFor(() => expect(createMultiplayerBattle).toHaveBeenCalled());
    expect(createMultiplayerBattle.mock.calls[0][0]).not.toHaveProperty('sameOrder');
  });

  it('one order for everyone, when the host picks it', async () => {
    show();
    fireEvent.click(screen.getByRole('radio', { name: 'Same for everyone' }));
    expect(screen.getByText(/question 5 is the same question for all/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create lobby' }));
    await waitFor(() => expect(createMultiplayerBattle).toHaveBeenCalled());
    expect(createMultiplayerBattle.mock.calls[0][0]).toMatchObject({ sameOrder: true });
  });

  it('says the minutes a question, and warns when tighter than the board', () => {
    show();
    expect(screen.getByText('About 1.5 min a question.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Questions'), { target: { value: '100' } });
    expect(screen.getByText(/About 0\.3 min a question: tighter than the board’s pace/)).toBeInTheDocument();
  });
});
