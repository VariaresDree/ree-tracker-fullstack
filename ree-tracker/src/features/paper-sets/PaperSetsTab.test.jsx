// Exams > Paper sets: a card per printed set with its sheets and state, the
// links to print, scan and see results, delete with a confirm, and an empty
// state that points to the mock board setup.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { expectNoSkippedLevels } from '../../test/headings';

expect.extend(axeMatchers);

const authState = { currentUser: { uid: 'u1' } };
vi.mock('../../config/firebaseDb', () => ({ auth: authState }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
const apiRequest = vi.fn();
vi.mock('../../services/dbQueries', () => ({
  apiRequest: (...a) => apiRequest(...a),
  updateCommandParameters: vi.fn(),
}));
const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
  keys: async () => [...idbMem.keys()],
  delMany: async (ks) => { ks.forEach((k) => idbMem.delete(k)); },
}));
const toastFn = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toastFn }));

const { useStore } = await import('../../store/useStore');
const { default: PaperSetsTab } = await import('./PaperSetsTab');
const { __resetPrintedSetsMemory } = await import('./usePrintedSets');

const AXE_OPTS = {
  rules: {
    'color-contrast': { enabled: false },
    'html-has-lang': { enabled: false },
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
    region: { enabled: false },
    'document-title': { enabled: false },
  },
};

const LIST = '/api/user/printed-sets';
const summary = (id, label, extra = {}) => ({
  id, label, title: 'Electrical Engineering Professional Subjects', code: 'EE', profile: 'prc_subject', itemCount: 100,
  printedAt: '2026-10-21T02:00:00.000Z', edited: false, createdAt: '2026-10-21T01:00:00.000Z', _count: { sheets: 0 }, ...extra,
});
let items;

beforeEach(() => {
  apiRequest.mockReset();
  toastFn.error.mockClear();
  idbMem.clear();
  __resetPrintedSetsMemory();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'u1', pendingWrites: [], deadLetters: [] });
  useStore.getState().resetSyncBackoff();
  items = [
    summary('K7P29QXAM3TD', 'SET B', { _count: { sheets: 12 }, edited: true }),
    summary('AAAAAAAAAAAA', 'SET A', { printedAt: null, createdAt: '2026-10-20T01:00:00.000Z', _count: { sheets: 1 } }),
  ];
  apiRequest.mockImplementation(async (endpoint, method = 'GET') => {
    if (method === 'GET' && endpoint === LIST) return { items };
    if (method === 'DELETE') return { success: true, deleted: 1 };
    throw Object.assign(new Error(`unexpected ${method} ${endpoint}`), { status: 400 });
  });
});

const renderTab = () => render(<MemoryRouter><h1>Exams</h1><PaperSetsTab /></MemoryRouter>);

describe('PaperSetsTab', () => {
  it('a card per set: sheets scanned, Not printed yet and Edited, and its links', async () => {
    const { container } = renderTab();
    expect(screen.getByRole('heading', { level: 2, name: 'Paper sets' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Print a new paper/ })).toHaveAttribute('href', '/simulator');
    expect(screen.getByRole('link', { name: /Scan a sheet/ })).toHaveAttribute('href', '/scan?for=taker');

    const cards = await screen.findAllByRole('listitem');
    expect(cards).toHaveLength(2);
    const b = within(cards[0]);
    expect(b.getByRole('heading', { level: 3 })).toHaveTextContent('Electrical Engineering Professional Subjects');
    expect(b.getByText('SET B')).toBeInTheDocument();
    expect(b.getByText('12 sheets scanned')).toBeInTheDocument();
    expect(b.getByText('Edited')).toBeInTheDocument();
    expect(b.queryByText('Not printed yet')).not.toBeInTheDocument();
    expect(b.getByText('K7P2-9QXA-M3TD')).toBeInTheDocument();
    expect(b.getByRole('link', { name: /^Print SET B/ })).toHaveAttribute('href', '/print/K7P29QXAM3TD');
    expect(b.getByRole('link', { name: /^Scan sheets for SET B/ })).toHaveAttribute('href', '/scan/K7P29QXAM3TD?for=taker');
    expect(b.getByRole('link', { name: /^Results for SET B/ })).toHaveAttribute('href', '/exams/paper-sets/K7P29QXAM3TD');
    const a = within(cards[1]);
    expect(a.getByText('1 sheet scanned')).toBeInTheDocument();
    expect(a.getByText('Not printed yet')).toBeInTheDocument();
    expect(a.queryByText('Edited')).not.toBeInTheDocument();

    expectNoSkippedLevels(container);
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  });

  it('deletes a set after a confirm that counts its sheets', async () => {
    const user = userEvent.setup();
    renderTab();
    const cards = await screen.findAllByRole('listitem');
    await user.click(within(cards[0]).getByRole('button', { name: /^Delete SET B/ }));
    const dialog = screen.getByRole('dialog', { name: 'Delete SET B and its 12 scanned sheets?' });
    expect(await axe(document.body, AXE_OPTS)).toHaveNoViolations();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(apiRequest.mock.calls.filter(([, m]) => m === 'DELETE')).toHaveLength(0);

    await user.click(within(cards[0]).getByRole('button', { name: /^Delete SET B/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    expect(apiRequest).toHaveBeenCalledWith('/api/user/printed-sets/K7P29QXAM3TD', 'DELETE', null);
  });

  it('no sets yet: an empty state that points to the mock board setup', async () => {
    items = [];
    const { container } = renderTab();
    expect(await screen.findByText('No paper sets yet')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Print a new paper' });
    expect(links.every((l) => l.getAttribute('href') === '/simulator')).toBe(true);
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  });
});
