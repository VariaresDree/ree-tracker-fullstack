// Progress › Syllabus › Sets and Library › Links (CELE round, 2026-10), with
// the real list hooks: a template adds its sets in one request, ticking a set
// off dates it, a done set logs its score as an outside score it then points
// at, links are filed by subject and open in a new tab, and both work offline.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { todayManila } from '@ree/shared';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

vi.mock('../../config/firebaseDb', () => ({ auth: { currentUser: { uid: 'user-A' } } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'user-A' } }) }));
const apiRequest = vi.fn();
vi.mock('../../services/dbQueries', () => ({ apiRequest: (...a) => apiRequest(...a), updateCommandParameters: vi.fn() }));
const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
}));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

const { useStore } = await import('../../store/useStore');
const { default: SetsPanel } = await import('./SetsPanel');
const { default: LinksTab } = await import('../links/LinksTab');
const { __resetPracticeSetsMemory, applySetChange, pendingSetChanges } = await import('./usePracticeSets');
const { __resetUserLinksMemory } = await import('../links/useUserLinks');
const { __resetOutsideScoresMemory } = await import('../exams/useOutsideScores');

const SETS = '/api/user/practice-sets';
const LINKS = '/api/user/links';
const OUTSIDE = '/api/user/outside-scores';
const AXE_OPTS = { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } };
let server;

function routeApi({ failWrites } = {}) {
  apiRequest.mockImplementation(async (endpoint, method = 'GET', body) => {
    if (method === 'GET') return { items: server[endpoint] || [] };
    if (failWrites) throw failWrites();
    if (endpoint === `${SETS}/bulk`) return { items: body.items.map((i) => ({ ...i, createdAt: '2026-10-28T00:00:00Z' })) };
    if (method === 'POST') return { item: { ...body, createdAt: '2026-10-28T00:00:00Z' } };
    if (method === 'PUT') return { item: { ...body, id: endpoint.split('/').pop() } };
    return { success: true };
  });
}

const fill = (scope, label, value) => fireEvent.change(within(scope).getByLabelText(label, { exact: false }), { target: { value } });
const renderIn = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  apiRequest.mockReset();
  idbMem.clear();
  __resetPracticeSetsMemory();
  __resetUserLinksMemory();
  __resetOutsideScoresMemory();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'user-A', pendingWrites: [], deadLetters: [] });
  server = {};
  routeApi();
});

describe('SetsPanel', () => {
  it('adds a numbered run in one request, grouped with its done count', async () => {
    renderIn(<SetsPanel />);
    expect(await screen.findByText('No sets yet')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Add sets/ })[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Add sets to finish' });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Numbered' }));
    fill(dialog, 'Group', 'RC refresher');
    fireEvent.change(within(dialog).getByLabelText('To'), { target: { value: '3' } });
    expect(within(dialog).getByText('Adds 3 sets: Set 1 to Set 3.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add 3 sets' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${SETS}/bulk`, 'POST', expect.anything()));
    const { items } = apiRequest.mock.calls.find((c) => c[0] === `${SETS}/bulk`)[2];
    expect(items.map((i) => [i.collection, i.title, i.status])).toEqual([['RC refresher', 'Set 1', 'todo'], ['RC refresher', 'Set 2', 'todo'], ['RC refresher', 'Set 3', 'todo']]);
    const group = await screen.findByRole('list', { name: 'RC refresher' });
    expect(within(group).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /RC refresher.*0 of 3 done/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('past boards need a month, and come newest first', async () => {
    renderIn(<SetsPanel />);
    await screen.findByText('No sets yet');
    fireEvent.click(screen.getAllByRole('button', { name: /Add sets/ })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Past boards' }));
    fill(dialog, 'From year', '2024');
    fill(dialog, 'To year', '2025');
    fireEvent.click(within(dialog).getByRole('button', { name: /Add set/ }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Pick at least one month');
    fireEvent.click(within(dialog).getByRole('button', { name: 'April' }));
    expect(within(dialog).getByText('Adds 2 sets: April 2025 to April 2024.')).toBeInTheDocument();
  });

  it('ticking a set dates it; a done set logs its score, which the set then points at', async () => {
    server[SETS] = [{ id: 's1', collection: 'Past boards', title: 'April 2025', subject: 'ALL', status: 'todo', sortOrder: 1, createdAt: '2026-10-01T00:00:00Z' }];
    renderIn(<SetsPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark April 2025 done' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${SETS}/s1`, 'PUT', expect.objectContaining({ status: 'done', doneOn: todayManila() })));

    fireEvent.click(await screen.findByRole('button', { name: 'Log the score for April 2025' }));
    const form = await screen.findByRole('dialog', { name: 'Add an outside score' });
    expect(within(form).getByLabelText(/^Name/)).toHaveValue('Past boards: April 2025');
    // An all-three set starts on per-subject scores; this one logs a total.
    expect(within(form).getByRole('group', { name: 'Mathematics' })).toBeInTheDocument();
    fireEvent.click(within(form).getByRole('button', { name: 'Only have the total?' }));
    fill(form, 'Your score', '210');
    fill(form, 'Number of items', '300');
    fireEvent.click(within(form).getByRole('button', { name: 'Save score' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(OUTSIDE, 'POST', expect.objectContaining({ subject: 'ALL', score: 210, total: 300 })));
    const scoreId = apiRequest.mock.calls.find((c) => c[0] === OUTSIDE && c[1] === 'POST')[2].id;
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${SETS}/s1`, 'PUT', expect.objectContaining({ outsideScoreId: scoreId })));
    expect(await screen.findByRole('link', { name: /April 2025: 70%/ })).toHaveAttribute('href', '/exams?tab=history');
  });

  it('offline, a new set shows at once and waits in the queue', async () => {
    routeApi({ failWrites: () => new Error('[OFFLINE]') });
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderIn(<SetsPanel />);
    await screen.findByText('No sets yet');
    fireEvent.click(screen.getAllByRole('button', { name: /Add sets/ })[0]);
    const dialog = await screen.findByRole('dialog');
    fill(dialog, 'Group', 'Book drills');
    fill(dialog, 'Set', 'Chapter 4');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add set' }));
    expect(await screen.findByText('Chapter 4')).toBeInTheDocument();
    await waitFor(() => expect(useStore.getState().pendingWrites.some((w) => w.endpoint === SETS)).toBe(true));
  });

  it('a queued template lays all its sets over the list', () => {
    const changes = pendingSetChanges([{ id: 'w', method: 'POST', endpoint: `${SETS}/bulk`, body: { items: [{ id: 'a', title: 'Set 1' }, { id: 'b', title: 'Set 2' }] }, ownerUid: 'user-A', createdAt: 'x' }], 'user-A');
    expect(changes.reduce(applySetChange, []).map((s) => s.title)).toEqual(['Set 1', 'Set 2']);
  });
});

describe('LinksTab', () => {
  it('adds a link with its https://, filed by subject, opening in a new tab', async () => {
    renderIn(<LinksTab />);
    expect(await screen.findByText('No links yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add link/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a link' });
    fill(dialog, 'Web address', 'drive.google.com/drive/folders/abc');
    fill(dialog, 'Name', 'Machines handouts');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save link' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(LINKS, 'POST', expect.objectContaining({ url: 'https://drive.google.com/drive/folders/abc', subject: 'EE', pinned: false })));
    const link = await screen.findByRole('link', { name: /Machines handouts/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('heading', { name: 'EE' })).toBeInTheDocument();
    expect(screen.getByText('Drive · drive.google.com')).toBeInTheDocument();
  });

  it('refuses an address that isn’t a web page', async () => {
    renderIn(<LinksTab />);
    await screen.findByText('No links yet');
    fireEvent.click(screen.getByRole('button', { name: /Add link/ }));
    const dialog = await screen.findByRole('dialog');
    fill(dialog, 'Web address', 'javascript:alert(1)');
    fill(dialog, 'Name', 'x');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save link' }));
    expect(await within(dialog).findByText('Paste a web address (http or https).')).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith(LINKS, 'POST', expect.anything());
  });

  it('pins a link, and has no axe violations', async () => {
    server[LINKS] = [{ id: 'l1', title: 'PEC terms quiz', url: 'https://forms.gle/x', subject: 'ALL', pinned: false, createdAt: '2026-10-01T00:00:00Z' }];
    const { container } = renderIn(<LinksTab />);
    fireEvent.click(await screen.findByRole('button', { name: 'Pin PEC terms quiz' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${LINKS}/l1`, 'PUT', expect.objectContaining({ pinned: true })));
    expect(screen.getByText('Quiz · forms.gle')).toBeInTheDocument();
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  });
});
