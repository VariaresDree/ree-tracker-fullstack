// Outside scores (Exams › Past sittings): self-reported results from review
// centers and books, beside the in-app mocks. Pins the add/edit/delete flow,
// the shared validation, the retest comparison, and the offline path (an entry
// saved with no connection shows at once and waits in the queue with its id).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { todayManila } from '@ree/shared';

const authState = { currentUser: { uid: 'user-A' } };
vi.mock('../../config/firebaseDb', () => ({ auth: authState }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'user-A' } }) }));

const apiRequest = vi.fn();
vi.mock('../../services/dbQueries', () => ({
  apiRequest: (...args) => apiRequest(...args),
  updateCommandParameters: vi.fn(),
}));

const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
}));

const toastFn = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toastFn }));

const { useStore } = await import('../../store/useStore');
const { default: OutsideScoresPanel } = await import('./OutsideScoresPanel');
const { __resetOutsideScoresMemory, applyChange, pendingChanges } = await import('./useOutsideScores');

const KEY = '/api/user/outside-scores';
const FIRST = { id: '11111111-1111-4111-8111-111111111111', title: 'RC Preboard 1', source: 'Review center', takenOn: '2026-09-01', subject: 'EE', score: 60, total: 100, note: null, retestOfId: null, createdAt: '2026-09-01T10:00:00Z' };
const RETEST = { ...FIRST, id: '22222222-2222-4222-8222-222222222222', title: 'RC Preboard 1 retake', takenOn: '2026-09-20', score: 72, retestOfId: FIRST.id, createdAt: '2026-09-20T10:00:00Z' };

let serverItems;
const offline = () => new Error('[OFFLINE]');

function routeApi({ failWrites } = {}) {
  apiRequest.mockImplementation(async (endpoint, method = 'GET', body) => {
    if (method === 'GET') return { items: serverItems };
    if (failWrites) throw failWrites();
    if (method === 'POST') return { item: { ...body, createdAt: '2026-10-08T00:00:00Z' } };
    if (method === 'PUT') return { item: { ...body, id: endpoint.split('/').pop() } };
    return { success: true };
  });
}

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });

beforeEach(() => {
  apiRequest.mockReset();
  toastFn.mockClear();
  toastFn.error.mockClear();
  idbMem.clear();
  __resetOutsideScoresMemory();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'user-A', pendingWrites: [], deadLetters: [] });
  serverItems = [];
  routeApi();
});

describe('OutsideScoresPanel', () => {
  it('starts empty, under its own h2, and says the scores are not counted', async () => {
    render(<OutsideScoresPanel />);
    expect(await screen.findByText('No outside scores yet')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Outside scores' })).toBeInTheDocument();
    expect(screen.getByText(/don’t count toward your readiness, forecast or rankings/)).toBeInTheDocument();
  });

  it('adds a score with an id made on the device, and lists it with its percentage', async () => {
    render(<OutsideScoresPanel />);
    await screen.findByText('No outside scores yet');
    fireEvent.click(screen.getByRole('button', { name: /Add score/ }));
    const dialog = await screen.findByRole('dialog');
    fill('Name', 'RC Preboard 2');
    fill('Your score', '45');
    fill('Number of items', '50');
    fireEvent.click(within(dialog).getByRole('radio', { name: /Math/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save score' }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(KEY, 'POST', expect.anything()));
    const body = apiRequest.mock.calls.find((c) => c[1] === 'POST')[2];
    expect(body).toMatchObject({ title: 'RC Preboard 2', takenOn: todayManila(), subject: 'Mathematics', score: 45, total: 50, source: null, note: null, retestOfId: null });
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);

    expect(await screen.findByRole('heading', { level: 3, name: 'RC Preboard 2' })).toBeInTheDocument();
    expect(screen.getByText('45/50')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('checks the entry with the shared rule before anything is sent', async () => {
    render(<OutsideScoresPanel />);
    await screen.findByText('No outside scores yet');
    fireEvent.click(screen.getByRole('button', { name: /Add score/ }));
    const dialog = await screen.findByRole('dialog');
    fill('Your score', '51');
    fill('Number of items', '50');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save score' }));
    expect(await within(dialog).findByText(/Give it a name/)).toBeInTheDocument();
    expect(within(dialog).getByText(/can’t be more than the number of items/)).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith(KEY, 'POST', expect.anything());
  });

  it('compares a retest with its first try, and both averages side by side', async () => {
    serverItems = [RETEST, FIRST];
    render(<OutsideScoresPanel inAppAverage={70} inAppCount={3} />);
    expect(await screen.findByText(/Retest · \+12 pts vs first try/)).toBeInTheDocument();
    const line = screen.getByText(/Outside average/);
    expect(line).toHaveTextContent('Outside average 66% (2) · In-app mock average 70% (3)');
    expect(screen.getByText('+12 pts since first')).toBeInTheDocument();
  });

  it('offline, a new score shows at once and waits in the queue with its id', async () => {
    routeApi({ failWrites: offline });
    apiRequest.mockImplementationOnce(async () => { throw offline(); }); // the list fetch
    render(<OutsideScoresPanel />);
    expect(await screen.findByText(/Offline. Showing the scores saved on this device/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add your first score/ }));
    const dialog = await screen.findByRole('dialog');
    fill('Name', 'Book drill: circuits');
    fill('Your score', '18');
    fill('Number of items', '20');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save score' }));

    expect(await screen.findByRole('heading', { level: 3, name: 'Book drill: circuits' })).toBeInTheDocument();
    const queued = useStore.getState().pendingWrites;
    expect(queued).toEqual([expect.objectContaining({ endpoint: KEY, method: 'POST', ownerUid: 'user-A' })]);
    expect(queued[0].body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByText('1 change saved on this device, waiting to sync.')).toBeInTheDocument();
    expect(toastFn).toHaveBeenCalledWith(expect.stringMatching(/Saved/));
  });

  it('deletes after a confirmation', async () => {
    serverItems = [FIRST];
    render(<OutsideScoresPanel />);
    fireEvent.click(await screen.findByRole('button', { name: `Delete ${FIRST.title}, Sep 1, 2026` }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${KEY}/${FIRST.id}`, 'DELETE', null));
    await waitFor(() => expect(screen.queryByRole('heading', { level: 3, name: FIRST.title })).not.toBeInTheDocument());
  });

  it('a rejected save keeps the form open and the list as it was', async () => {
    serverItems = [FIRST];
    routeApi({ failWrites: () => Object.assign(new Error('Validation failed.'), { status: 400 }) });
    render(<OutsideScoresPanel />);
    fireEvent.click(await screen.findByRole('button', { name: `Edit ${FIRST.title}, Sep 1, 2026` }));
    const dialog = await screen.findByRole('dialog');
    expect(screen.getByLabelText('Name', { exact: false })).toHaveValue(FIRST.title);
    fill('Your score', '65');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save score' }));
    await waitFor(() => expect(toastFn.error).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('60/100')).toBeInTheDocument();
  });

  // The list paints from the device cache while the fetch is still on its
  // way; a delete made in that window must not be undone by the older list.
  it('a list fetched before a delete doesn’t bring the deleted entry back', async () => {
    idbMem.set('ree-user-cache-v1:outsideScores', { uid: 'user-A', value: [FIRST] });
    let releaseFirstGet;
    let gets = 0;
    apiRequest.mockImplementation(async (endpoint, method = 'GET') => {
      if (method === 'GET') {
        gets += 1;
        if (gets === 1) return new Promise((resolve) => { releaseFirstGet = () => resolve({ items: [FIRST] }); });
        return { items: [] };
      }
      return { success: true, deleted: 1 };
    });
    render(<OutsideScoresPanel />);
    fireEvent.click(await screen.findByRole('button', { name: `Delete ${FIRST.title}, Sep 1, 2026` }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${KEY}/${FIRST.id}`, 'DELETE', null));
    releaseFirstGet();
    await waitFor(() => expect(gets).toBe(2)); // fetched again instead
    expect(screen.queryByRole('heading', { level: 3, name: FIRST.title })).not.toBeInTheDocument();
  });

  it('a list the server refuses shows an error with a retry, not an empty list', async () => {
    apiRequest.mockImplementation(async () => { throw Object.assign(new Error('Forbidden'), { status: 403 }); });
    render(<OutsideScoresPanel />);
    expect(await screen.findByText('Couldn’t load your outside scores')).toBeInTheDocument();
    expect(screen.queryByText('No outside scores yet')).not.toBeInTheDocument();
    routeApi();
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(await screen.findByText('No outside scores yet')).toBeInTheDocument();
  });

  it('a server error while online says so, not “offline”', async () => {
    serverItems = [FIRST];
    idbMem.set('ree-user-cache-v1:outsideScores', { uid: 'user-A', value: [FIRST] });
    apiRequest.mockImplementation(async () => { throw Object.assign(new Error('Unavailable'), { status: 503 }); });
    render(<OutsideScoresPanel />);
    expect(await screen.findByText(/Couldn’t reach the server/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: FIRST.title })).toBeInTheDocument();
  });
});

describe('the queued-change overlay', () => {
  const write = (method, endpoint, body, ownerUid = 'user-A') => ({ id: Math.random().toString(36), method, endpoint, body, ownerUid, createdAt: '2026-10-08T00:00:00Z' });

  it('applies this account’s queued writes in order: create, edit, then delete', () => {
    const changes = pendingChanges([
      write('POST', KEY, { ...FIRST, id: 'n1', title: 'New' }),
      write('PUT', `${KEY}/n1`, { ...FIRST, title: 'Renamed' }),
      write('DELETE', `${KEY}/${FIRST.id}`, null),
      write('POST', KEY, { ...FIRST, id: 'b1', title: 'Someone else’s' }, 'user-B'),
      write('POST', '/api/materials/folders', { name: 'x' }),
    ], 'user-A');
    const list = changes.reduce(applyChange, [FIRST, RETEST]);
    expect(list.map((e) => e.title)).toEqual(['RC Preboard 1 retake', 'Renamed']);
    // Deleting the first try leaves its retest as an ordinary entry.
    expect(list.find((e) => e.id === RETEST.id).retestOfId).toBeNull();
  });

  it('an unstamped write belongs to the device’s owner', () => {
    const legacy = { ...write('POST', KEY, { ...FIRST, id: 'old' }), ownerUid: undefined };
    expect(pendingChanges([legacy], 'user-A', 'user-A')).toHaveLength(1);
    expect(pendingChanges([legacy], 'user-B', 'user-A')).toHaveLength(0);
  });

  it('applying a change twice is the same as once', () => {
    const c = { type: 'upsert', item: { ...FIRST, score: 99 } };
    expect(applyChange(applyChange([FIRST], c), c)).toEqual(applyChange([FIRST], c));
  });
});
