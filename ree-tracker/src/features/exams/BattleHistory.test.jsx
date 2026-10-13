// Exams › Battles › Past battles: each finished battle with its format, date,
// place, score, rating change and opponents; Review (only when you answered
// something), Rematch or Join rematch; Show more through the server's cursor;
// an empty state with a next step; and the list from this device offline.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../../config/firebaseDb', () => ({ auth: { currentUser: { uid: 'me' } } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
let online = true;
vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => online }));

const apiRequest = vi.fn();
const fetchBattleHistory = vi.fn();
const requestRematch = vi.fn();
vi.mock('../../services/dbQueries', () => ({
  apiRequest: (...a) => apiRequest(...a),
  fetchBattleHistory: (...a) => fetchBattleHistory(...a),
  requestRematch: (...a) => requestRematch(...a),
}));

const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
}));

const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { useStore } = await import('../../store/useStore');
const { resetSyncedMemory } = await import('../../hooks/useSyncedUserData');
const { default: BattleHistory } = await import('./BattleHistory');

const ENDPOINT = '/api/battles/me/history?limit=20';
const CONFIG = { mode: 'subject', subject: 'EE', count: 20 };
const item = (battleId, over = {}) => ({
  battleId, createdAt: '2026-10-05T03:00:00Z', config: CONFIG, timeLimitSecs: 1800,
  score: 12, total: 20, placement: 2, players: 3, eloDelta: -8, tierAfter: 'BRONZE', answered: 18,
  opponents: [
    { userId: 'ana', displayName: 'Ana', placement: 1, score: 15 },
    { userId: 'ben', displayName: 'Ben', placement: 3, score: 9 },
  ],
  rematch: null,
  ...over,
});

function PathProbe() {
  return <p>at: {useLocation().pathname}</p>;
}
const renderIt = (props = {}) => render(
  <MemoryRouter initialEntries={['/exams?tab=battles']}>
    <Routes>
      <Route path="/exams" element={<BattleHistory {...props} />} />
      <Route path="*" element={<PathProbe />} />
    </Routes>
  </MemoryRouter>,
);
const rowFor = (battleId) => screen.getByText(battleId).closest('li');

beforeEach(() => {
  online = true;
  apiRequest.mockReset();
  fetchBattleHistory.mockReset();
  requestRematch.mockReset();
  toast.error.mockClear();
  idbMem.clear();
  resetSyncedMemory('battleHistory');
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'me', pendingWrites: [], deadLetters: [] });
});

describe('BattleHistory', () => {
  it('lists each battle with its format, date, place, score, rating change and opponents', async () => {
    apiRequest.mockResolvedValue({ items: [item('HIS001'), item('HIS002', { placement: 1, eloDelta: 12, answered: 0, config: { mode: 'blended' } })], nextBefore: null });
    renderIt();
    const row = (await screen.findByText('HIS001')).closest('li');
    expect(apiRequest).toHaveBeenCalledWith(ENDPOINT);
    expect(screen.getByRole('heading', { level: 2, name: 'Past battles' })).toBeInTheDocument();
    const date = new Date('2026-10-05T03:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    expect(row).toHaveTextContent(`EE · ${date} · HIS001`);
    expect(row).toHaveTextContent('2nd of 3·12/20·rating −8');
    expect(row).toHaveTextContent('Against Ana (1st), Ben (3rd)');
    expect(within(row).getByRole('link', { name: 'Review battle HIS001' })).toHaveAttribute('href', `/exams/sittings/${encodeURIComponent('HIS001:me')}`);

    const other = rowFor('HIS002');
    expect(other).toHaveTextContent('Full mock');
    expect(other).toHaveTextContent('1st of 3·12/20·rating +12');
    // Nothing answered, nothing to review.
    expect(within(other).queryByRole('link', { name: /Review/ })).not.toBeInTheDocument();
    expect(within(other).getByRole('button', { name: 'Rematch battle HIS002' })).toBeInTheDocument();
  });

  it('starts a rematch and opens its lobby', async () => {
    apiRequest.mockResolvedValue({ items: [item('HIS001')], nextBefore: null });
    requestRematch.mockResolvedValue({ battleId: 'NEW123', created: true });
    renderIt();
    fireEvent.click(await screen.findByRole('button', { name: 'Rematch battle HIS001' }));
    expect(await screen.findByText('at: /battle/NEW123')).toBeInTheDocument();
    expect(requestRematch).toHaveBeenCalledWith('HIS001');
  });

  it('offers to join a rematch someone already started, and nothing for one under way', async () => {
    apiRequest.mockResolvedValue({
      items: [
        item('HIS001', { rematch: { battleId: 'REM001', status: 'WAITING' } }),
        item('HIS002', { rematch: { battleId: 'REM002', status: 'IN_PROGRESS' } }),
      ],
      nextBefore: null,
    });
    renderIt();
    await screen.findByText('HIS001');
    expect(within(rowFor('HIS002')).queryByRole('button')).not.toBeInTheDocument();
    expect(within(rowFor('HIS001')).queryByRole('button', { name: /^Rematch/ })).not.toBeInTheDocument();
    // The server hands back that lobby (one battle, one rematch).
    requestRematch.mockResolvedValue({ battleId: 'REM001', created: false });
    fireEvent.click(within(rowFor('HIS001')).getByRole('button', { name: 'Join rematch of battle HIS001' }));
    expect(await screen.findByText('at: /battle/REM001')).toBeInTheDocument();
    expect(requestRematch).toHaveBeenCalledWith('HIS001');
  });

  it('says so, and refreshes the list, when the rematch started without you since it was listed', async () => {
    apiRequest.mockResolvedValue({ items: [item('HIS001', { rematch: { battleId: 'REM001', status: 'WAITING' } })], nextBefore: null });
    requestRematch.mockRejectedValue(Object.assign(new Error('That rematch has already started.'), { status: 409 }));
    renderIt();
    await screen.findByText('HIS001');
    const reads = apiRequest.mock.calls.length;
    fireEvent.click(within(rowFor('HIS001')).getByRole('button', { name: 'Join rematch of battle HIS001' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('That rematch has already started.'));
    await waitFor(() => expect(apiRequest.mock.calls.length).toBeGreaterThan(reads));
    expect(screen.queryByText(/^at: \/battle/)).not.toBeInTheDocument();
  });

  it('shows more with the cursor the server returned, until there is nothing older', async () => {
    apiRequest.mockResolvedValue({ items: [item('HIS003')], nextBefore: '2026-10-05T03:00:00.000Z' });
    fetchBattleHistory.mockResolvedValue({ items: [item('HIS002'), item('HIS001')], nextBefore: null });
    renderIt();
    fireEvent.click(await screen.findByRole('button', { name: 'Show more' }));
    expect(await screen.findByText('HIS001')).toBeInTheDocument();
    expect(fetchBattleHistory).toHaveBeenCalledWith({ before: '2026-10-05T03:00:00.000Z', limit: 20 });
    expect(screen.getAllByRole('listitem').map((li) => within(li).getByText(/^HIS/).textContent)).toEqual(['HIS003', 'HIS002', 'HIS001']);
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('with no battles yet, says so and offers to host one', async () => {
    apiRequest.mockResolvedValue({ items: [], nextBefore: null });
    const onHost = vi.fn();
    renderIt({ onHost });
    expect(await screen.findByText('No battles yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Host a battle' }));
    expect(onHost).toHaveBeenCalled();
  });

  it('offline, shows the battles saved on this device, and Rematch says it needs a connection', async () => {
    online = false;
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    idbMem.set('ree-user-cache-v1:battleHistory', { uid: 'me', value: { items: [item('HIS001')], nextBefore: null }, savedAt: Date.now() - 60_000 });
    apiRequest.mockRejectedValue(new Error('[OFFLINE]'));
    renderIt();
    expect(await screen.findByText('HIS001')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Offline. Showing the battles saved on this device/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Rematch battle HIS001' }));
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Rematch needs a connection/));
    expect(requestRematch).not.toHaveBeenCalled();
  });

  it('says when the list could not load, with Try again', async () => {
    apiRequest.mockRejectedValueOnce(Object.assign(new Error('Server error'), { status: 500 }))
      .mockResolvedValueOnce({ items: [item('HIS001')], nextBefore: null });
    renderIt();
    expect(await screen.findByText("Couldn't load your past battles")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('HIS001')).toBeInTheDocument();
  });
});
