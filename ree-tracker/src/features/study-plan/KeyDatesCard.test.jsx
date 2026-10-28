// Progress › Study plan › Key dates (CELE round, 2026-10): add a preboard,
// pick rest days, delete after a confirmation, and the offline path (a change
// shows at once and waits in the queue), through the real usePlanCalendar.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

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
const { default: KeyDatesCard } = await import('./KeyDatesCard');
const { usePlanCalendar, __resetPlanCalendarMemory, applyCalendarChange, pendingCalendarChanges } = await import('./usePlanCalendar');

const KEY = '/api/user/key-dates';
const PREFS = '/api/user/plan-prefs';
const AXE_OPTS = { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } };

let server;
const TOPICS = [
  { topicId: 'topic-tx', subject: 'EE', name: 'Transformers' },
  { topicId: 'topic-calc', subject: 'Mathematics', name: 'Calculus' },
];
function routeApi({ failWrites } = {}) {
  apiRequest.mockImplementation(async (endpoint, method = 'GET', body) => {
    if (method === 'GET' && endpoint === '/api/user/syllabus') return { weights: {}, topics: TOPICS };
    if (method === 'GET') return server;
    if (failWrites) throw failWrites();
    if (endpoint === PREFS) return { prefs: body };
    if (method === 'POST') return { item: { ...body, createdAt: '2026-10-28T00:00:00Z' } };
    if (method === 'PUT') return { item: { ...body, id: endpoint.split('/').pop() } };
    return { success: true };
  });
}

function Harness({ onChanged }) {
  return <KeyDatesCard calendar={usePlanCalendar()} onChanged={onChanged} />;
}

const fill = (dialog, label, value) => fireEvent.change(within(dialog).getByLabelText(label, { exact: false }), { target: { value } });

beforeEach(() => {
  apiRequest.mockReset();
  toastFn.mockClear();
  toastFn.error.mockClear();
  idbMem.clear();
  __resetPlanCalendarMemory();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'user-A', pendingWrites: [], deadLetters: [] });
  server = { items: [], prefs: { restWeekdays: [], reviewMode: 'self' } };
  routeApi();
});

describe('KeyDatesCard', () => {
  it('starts empty, then adds a preboard with an id made on the device', async () => {
    const onChanged = vi.fn();
    render(<Harness onChanged={onChanged} />);
    expect(await screen.findByText('No key dates yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add date/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a key date' });
    fill(dialog, 'Name', 'RC Preboard 2');
    fill(dialog, 'Date', '2099-11-07');
    fireEvent.change(within(dialog).getByLabelText('Subject'), { target: { value: 'ALL' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save date' }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(KEY, 'POST', expect.anything()));
    const body = apiRequest.mock.calls.find((c) => c[1] === 'POST')[2];
    expect(body).toMatchObject({ kind: 'preboard', title: 'RC Preboard 2', startsOn: '2099-11-07', endsOn: null, subject: 'ALL', topicIds: [], note: null });
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    const upcoming = await screen.findByRole('list', { name: 'Upcoming key dates' });
    expect(within(upcoming).getByText('RC Preboard 2')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it('checks the date with the shared rule before anything is sent', async () => {
    render(<Harness />);
    await screen.findByText('No key dates yet');
    fireEvent.click(screen.getByRole('button', { name: /Add date/ }));
    const dialog = await screen.findByRole('dialog');
    fill(dialog, 'Name', 'Coaching week');
    fill(dialog, 'Date', '2099-11-07');
    fill(dialog, 'Last day', '2099-11-01');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save date' }));
    expect(await within(dialog).findByText('The last day can’t be before the first.')).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith(KEY, 'POST', expect.anything());
  });

  it('picks rest days, sending both preferences every time', async () => {
    render(<Harness />);
    await screen.findByText('No key dates yet');
    fireEvent.click(screen.getByRole('button', { name: 'Sunday' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(PREFS, 'PUT', { restWeekdays: [0], reviewMode: 'self' }));
    expect(screen.getByRole('button', { name: 'Sunday' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('No plan tasks on Sunday.')).toBeInTheDocument();
  });

  it('deletes after a confirmation; past dates fold away', async () => {
    server.items = [
      { id: 'k1', kind: 'preboard', title: 'Preboard 3', startsOn: '2099-01-10' },
      { id: 'k0', kind: 'coaching', title: 'Old coaching', startsOn: '2001-01-10' },
    ];
    render(<Harness />);
    expect(await screen.findByText('Preboard 3')).toBeInTheDocument();
    expect(screen.queryByText('Old coaching')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show 1 past date' }));
    expect(screen.getByText('Old coaching')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Preboard 3' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Delete this date?' })).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${KEY}/k1`, 'DELETE', null));
    expect(screen.queryByText('Preboard 3')).not.toBeInTheDocument();
  });

  it('offline, a new date shows at once and waits in the queue with its id', async () => {
    routeApi({ failWrites: () => new Error('[OFFLINE]') });
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<Harness />);
    await screen.findByText('No key dates yet');
    fireEvent.click(screen.getByRole('button', { name: /Add date/ }));
    const dialog = await screen.findByRole('dialog');
    fill(dialog, 'Name', 'Family day');
    fireEvent.change(within(dialog).getByLabelText('What is it'), { target: { value: 'rest' } });
    fill(dialog, 'Date', '2099-12-24');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save date' }));
    expect(await screen.findByText('Family day')).toBeInTheDocument();
    await waitFor(() => expect(useStore.getState().pendingWrites.some((w) => w.endpoint === KEY && w.method === 'POST')).toBe(true));
  });

  it('has no axe violations with dates on screen', async () => {
    server.items = [{ id: 'k1', kind: 'preboard', title: 'Preboard 3', startsOn: '2099-01-10' }];
    const { container } = render(<Harness />);
    await screen.findByText('Preboard 3');
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  });
});

describe('review-center mode (step 2b)', () => {
  it('is off by default: no lecture kind and no schedule button', async () => {
    render(<Harness />);
    await screen.findByText('No key dates yet');
    expect(screen.getByRole('radio', { name: 'On my own' })).toBeChecked();
    expect(screen.queryByRole('button', { name: /Add lecture schedule/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add date/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(within(dialog).getByLabelText('What is it')).queryByRole('option', { name: 'Lecture' })).not.toBeInTheDocument();
  });

  it('switching saves the mode with the rest days, and offers the schedule', async () => {
    const onChanged = vi.fn();
    render(<Harness onChanged={onChanged} />);
    await screen.findByText('No key dates yet');
    fireEvent.click(screen.getByRole('radio', { name: 'With a review center' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(PREFS, 'PUT', { restWeekdays: [], reviewMode: 'center' }));
    expect(await screen.findByRole('button', { name: /Add lecture schedule/ })).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it('a lecture needs a topic, and takes its name from the first one', async () => {
    server.prefs = { restWeekdays: [], reviewMode: 'center' };
    render(<Harness />);
    await screen.findByText('No key dates yet');
    fireEvent.click(screen.getByRole('button', { name: /Add date/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('What is it'), { target: { value: 'lecture' } });
    fill(dialog, 'Date', '2099-11-03');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save date' }));
    expect(await within(dialog).findByText('Pick the topic the lecture covers.')).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByLabelText(/^Topics covered/, { selector: 'select' })).not.toBeDisabled());
    fireEvent.change(within(dialog).getByLabelText(/^Topics covered/, { selector: 'select' }), { target: { value: 'topic-tx' } });
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Lecture: Transformers');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save date' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(KEY, 'POST', expect.objectContaining({ kind: 'lecture', topicIds: ['topic-tx'], endsOn: null })));
  });

  it('the lecture schedule saves one lecture a filled row', async () => {
    server.prefs = { restWeekdays: [], reviewMode: 'center' };
    render(<Harness />);
    fireEvent.click(await screen.findByRole('button', { name: /Add lecture schedule/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Add your lecture schedule' });
    const row = (n) => within(dialog).getByRole('group', { name: `Lecture ${n}` });
    await waitFor(() => expect(within(row(1)).getByLabelText('Topic')).not.toBeDisabled());
    fireEvent.change(within(row(1)).getByLabelText('Date'), { target: { value: '2099-11-03' } });
    fireEvent.change(within(row(1)).getByLabelText('Topic'), { target: { value: 'topic-tx' } });
    fireEvent.change(within(row(2)).getByLabelText('Date'), { target: { value: '2099-11-05' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Save 2 lectures/ }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Each lecture needs both a date and a topic.');
    fireEvent.change(within(row(2)).getByLabelText('Topic'), { target: { value: 'topic-calc' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Save 2 lectures/ }));
    await waitFor(() => expect(apiRequest.mock.calls.filter((c) => c[0] === KEY && c[1] === 'POST')).toHaveLength(2));
    const bodies = apiRequest.mock.calls.filter((c) => c[0] === KEY && c[1] === 'POST').map((c) => c[2]);
    expect(bodies.map((b) => [b.title, b.startsOn, b.topicIds])).toEqual([
      ['Lecture: Transformers', '2099-11-03', ['topic-tx']],
      ['Lecture: Calculus', '2099-11-05', ['topic-calc']],
    ]);
  });
});

describe('the calendar’s queued-change overlay', () => {
  const write = (method, endpoint, body, ownerUid = 'user-A') => ({ id: Math.random().toString(36), method, endpoint, body, ownerUid, createdAt: '2026-10-28T00:00:00Z' });

  it('applies this account’s queued dates and rest days in order', () => {
    const changes = pendingCalendarChanges([
      write('POST', KEY, { id: 'n1', kind: 'rest', title: 'Off', startsOn: '2026-11-02' }),
      write('PUT', `${KEY}/n1`, { kind: 'rest', title: 'Day off', startsOn: '2026-11-02' }),
      write('PUT', PREFS, { restWeekdays: [0], reviewMode: 'self' }),
      write('POST', KEY, { id: 'b1', title: 'Someone else’s' }, 'user-B'),
    ], 'user-A');
    const value = changes.reduce(applyCalendarChange, { items: [], prefs: { restWeekdays: [], reviewMode: 'self' } });
    expect(value.items.map((e) => e.title)).toEqual(['Day off']);
    expect(value.prefs.restWeekdays).toEqual([0]);
  });

  it('applying a change twice is the same as once', () => {
    const c = { type: 'upsert', item: { id: 'a', title: 'A', startsOn: '2026-11-01' } };
    const once = applyCalendarChange(null, c);
    expect(applyCalendarChange(once, c)).toEqual(once);
  });
});
