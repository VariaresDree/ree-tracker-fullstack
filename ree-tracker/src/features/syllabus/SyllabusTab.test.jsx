// Progress › Syllabus: the Read / Watched / Drilled checklist per TOS topic,
// and Today's one-line link to it. Pins the full-state PUT (with the first
// tick filling in today's start date), the automatic Drilled tick, offline
// queueing with supersede, board-weighted coverage, and the 30-minute cache
// behind the Today link.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
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
const { default: SyllabusTab } = await import('./SyllabusTab');
const { default: SyllabusCoverageLink } = await import('./SyllabusCoverageLink');
const { __resetSyllabusMemory, nextTopicState, queuedTopicStates } = await import('./useSyllabus');
const { paceLine } = await import('./syllabusPace');

const KEY = '/api/user/syllabus';
const row = (topicId, subject, name, over = {}) => ({
  topicId, subject, name, sortOrder: 0, read: false, watched: false, drilled: false,
  autoDrilled: false, attempts: 0, startedOn: null, finishedOn: null, note: null, ...over,
});
const TOPICS = [
  row('m1', 'Mathematics', 'Calculus', { read: true, drilled: true }),
  row('m2', 'Mathematics', 'Differential Equations', { attempts: 24, autoDrilled: true }),
  row('e1', 'EE', 'Power Systems'),
];
const WEIGHTS = { Mathematics: 0.25, ESAS: 0.3, EE: 0.45 };

let lastState;
function PracticeProbe() {
  lastState = useLocation().state;
  return <p>practice-page</p>;
}
const renderTab = (props = {}) => render(
  <MemoryRouter>
    <Routes>
      <Route path="/" element={<SyllabusTab {...props} />} />
      <Route path="/practice" element={<PracticeProbe />} />
    </Routes>
  </MemoryRouter>,
);

function routeApi({ failWrites } = {}) {
  apiRequest.mockImplementation(async (endpoint, method = 'GET', body) => {
    if (method === 'GET') return { weights: WEIGHTS, topics: TOPICS };
    if (failWrites) throw failWrites();
    return { item: body };
  });
}

beforeEach(() => {
  apiRequest.mockReset();
  toastFn.error.mockClear();
  idbMem.clear();
  __resetSyllabusMemory();
  lastState = null;
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'user-A', pendingWrites: [], deadLetters: [] });
  routeApi();
});

describe('SyllabusTab', () => {
  it('shows board-weighted coverage under h2s, and the subject’s topics as h3s', async () => {
    renderTab();
    expect(await screen.findByRole('heading', { level: 2, name: 'Syllabus coverage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Topics' })).toBeInTheDocument();
    // Math 1 of 2 (25%) and EE 0 of 1 (45%): (0.25 × 0.5) / 0.70 = 17.9%
    expect(screen.getByText('17.9%')).toBeInTheDocument();
    expect(screen.getByText(/covered · 1 of 3 topics/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Mathematics: 1 of 2 topics covered' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Calculus', 'Differential Equations']);
  });

  it('ticks itself as Drilled from answers, and won’t be unticked', async () => {
    renderTab();
    const auto = await screen.findByRole('button', { name: /Drilled · 24 answers/ });
    expect(auto).toHaveAttribute('aria-pressed', 'true');
    expect(auto).toBeDisabled();
  });

  it('a tick sends the topic’s full state, filling in today as the start date', async () => {
    renderTab();
    const group = await screen.findByRole('group', { name: 'Differential Equations: checklist' });
    fireEvent.click(within(group).getByRole('button', { name: /Read/ }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${KEY}/m2`, 'PUT', expect.anything()));
    expect(apiRequest.mock.calls.find((c) => c[1] === 'PUT')[2]).toEqual({
      read: true, watched: false, drilled: false, startedOn: todayManila(), finishedOn: null, note: null,
    });
    // Read + drilled from answers = covered.
    expect(within(group.closest('li')).getByText('Covered')).toBeInTheDocument();
    expect(screen.getByText(/covered · 2 of 3 topics/)).toBeInTheDocument();
  });

  it('offline, ticks show at once and queue one full state per topic', async () => {
    routeApi({ failWrites: () => new Error('[OFFLINE]') });
    renderTab();
    const group = await screen.findByRole('group', { name: 'Differential Equations: checklist' });
    fireEvent.click(within(group).getByRole('button', { name: /Read/ }));
    await waitFor(() => expect(useStore.getState().pendingWrites).toHaveLength(1));
    fireEvent.click(within(group).getByRole('button', { name: /Watched/ }));
    await waitFor(() => expect(useStore.getState().pendingWrites[0].body.watched).toBe(true));
    const queued = useStore.getState().pendingWrites;
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ endpoint: `${KEY}/m2`, method: 'PUT', ownerUid: 'user-A', body: { read: true, watched: true } });
    expect(within(group).getByRole('button', { name: /Watched/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1 topic saved on this device, waiting to sync.')).toBeInTheDocument();
  });

  it('checks dates before sending, and drills the topic from its details', async () => {
    renderTab();
    const item = (await screen.findByRole('heading', { level: 3, name: 'Calculus' })).closest('li');
    fireEvent.click(within(item).getByRole('button', { name: /Dates and note/ }));
    fireEvent.change(within(item).getByLabelText('Started'), { target: { value: '2026-10-05' } });
    fireEvent.change(within(item).getByLabelText('Finished'), { target: { value: '2026-10-01' } });
    fireEvent.click(within(item).getByRole('button', { name: 'Save dates and note' }));
    expect(await within(item).findByText('Finished can’t be before started.')).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith(`${KEY}/m1`, 'PUT', expect.anything());

    fireEvent.click(within(item).getByRole('button', { name: /Drill this topic/ }));
    expect(await screen.findByText('practice-page')).toBeInTheDocument();
    expect(lastState.preset).toMatchObject({ source: 'smart-drill', drillTopicId: 'm1', drillTopic: 'Calculus', drillSubject: 'Mathematics' });
  });

  it('switches subject, and says when a subject has no topics', async () => {
    renderTab();
    fireEvent.click(await screen.findByRole('radio', { name: /EE/ }));
    expect(screen.getByRole('heading', { level: 3, name: 'Power Systems' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /ESAS/ }));
    expect(screen.getByText('No topics in this subject yet.')).toBeInTheDocument();
  });

  it('a refused list shows an error with a retry', async () => {
    apiRequest.mockImplementation(async () => { throw Object.assign(new Error('Forbidden'), { status: 403 }); });
    renderTab();
    expect(await screen.findByText('Couldn’t load your syllabus checklist')).toBeInTheDocument();
    routeApi();
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Syllabus coverage' })).toBeInTheDocument();
  });
});

describe('SyllabusCoverageLink (Today)', () => {
  const renderLink = () => render(<MemoryRouter><SyllabusCoverageLink /></MemoryRouter>);

  it('uses this device’s copy while it is under 30 minutes old', async () => {
    idbMem.set('ree-user-cache-v1:syllabus', { uid: 'user-A', value: { weights: WEIGHTS, topics: TOPICS }, savedAt: Date.now() - 60_000 });
    renderLink();
    expect(await screen.findByRole('link', { name: /Syllabus 17.9% covered/ })).toHaveAttribute('href', '/progress?tab=syllabus');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('asks the server when the copy is older, or there is none', async () => {
    idbMem.set('ree-user-cache-v1:syllabus', { uid: 'user-A', value: { weights: WEIGHTS, topics: TOPICS }, savedAt: Date.now() - 31 * 60_000 });
    renderLink();
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(KEY));
  });

  it('invites a learner who hasn’t started', async () => {
    apiRequest.mockResolvedValue({ weights: WEIGHTS, topics: [row('e1', 'EE', 'Power Systems')] });
    renderLink();
    expect(await screen.findByRole('link', { name: /Start your syllabus checklist/ })).toBeInTheDocument();
  });
});

describe('syllabus helpers', () => {
  it('the first tick fills in today as the start date; later ticks and set dates are kept', () => {
    expect(nextTopicState(row('a', 'EE', 'x'), { read: true }, '2026-10-09')).toMatchObject({ read: true, startedOn: '2026-10-09' });
    expect(nextTopicState(row('a', 'EE', 'x', { read: true, startedOn: '2026-10-01' }), { watched: true }, '2026-10-09').startedOn).toBe('2026-10-01');
    expect(nextTopicState(row('a', 'EE', 'x'), { read: true, startedOn: null }, '2026-10-09').startedOn).toBeNull();
  });

  it('only this account’s newest queued state per topic is laid over the list', () => {
    const w = (endpoint, body, ownerUid = 'user-A') => ({ id: Math.random().toString(36), endpoint, method: 'PUT', body, ownerUid });
    const states = queuedTopicStates([
      w(`${KEY}/m1`, { read: true }),
      w(`${KEY}/m1`, { read: false }),
      w(`${KEY}/e1`, { read: true }, 'user-B'),
      w('/api/user/outside-scores/x', { score: 1 }),
    ], 'user-A');
    expect([...states.entries()]).toEqual([['m1', { read: false }]]);
  });

  it('the pace line splits what’s left over the weeks to the exam', () => {
    expect(paceLine(30, 70)).toBe('30 topics to go and 70 days to the exam: about 3 a week.');
    expect(paceLine(1, 3)).toBe('1 topic to go and 3 days to the exam: about 1 a week.');
    expect(paceLine(0, 30)).toMatch(/Every topic covered/);
    expect(paceLine(5, null)).toBeNull();
    expect(paceLine(5, -2)).toBeNull();
  });
});
