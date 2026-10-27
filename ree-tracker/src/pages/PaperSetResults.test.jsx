// Exams > Paper sets > Results: the takers' scores (self-checks left out
// unless asked for), each sheet to correct (scored again) or delete, the item
// analysis with the most-missed questions typeset, and the CSVs: downloaded
// on the web, copied in the Android app.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { expectNoSkippedLevels } from '../test/headings';

expect.extend(axeMatchers);

const native = { value: false };
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));
const authState = { currentUser: { uid: 'u1' } };
vi.mock('../config/firebaseDb', () => ({ auth: authState }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
const apiRequest = vi.fn();
vi.mock('../services/dbQueries', () => ({
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
vi.mock('../components/LatexRenderer', () => ({
  default: ({ content }) => <div className="latex">{content}</div>,
}));
const delivered = { blobs: [], copied: [] };
vi.mock('../features/exam-export/deliver', () => ({
  canDownloadFiles: () => !native.value,
  downloadBlob: (blob, name) => { delivered.blobs.push({ blob, name }); },
  copyText: async (text) => { delivered.copied.push(text); return true; },
}));

const { useStore } = await import('../store/useStore');
const { default: PaperSetResults } = await import('./PaperSetResults');
const { __resetPrintedSetMemory } = await import('../features/paper-sets/printedSetsApi');

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

const ID = 'K7P29QXAM3TD';
const SET_URL = `/api/user/printed-sets/${ID}`;
const SHEETS_URL = `${SET_URL}/sheets`;
const item = (n, answerIndex) => ({
  n, subject: 'EE', text: `Question ${n}: $x^${n}$`, options: ['a', 'b', 'c', 'd'], answer: 'a', answerIndex, explanation: null,
});
// A PRC EE paper; keys B, C, A.
const SET = {
  id: ID, contentId: 'c1', label: 'SET B', title: 'Electrical Engineering Professional Subjects', code: 'EE', profile: 'prc_subject',
  sittingKey: 'sk', generatedAt: '2026-10-27T01:00:00.000Z', config: {},
  plan: { kind: 'subject', profile: 'prc_subject', code: 'EE', title: 'Electrical Engineering Professional Subjects', sections: [{ subject: 'EE' }] },
  sections: [{ subject: 'EE', title: 'EE', from: 1, to: 3 }],
  items: [item(1, 1), item(2, 2), item(3, 0)],
  edits: {}, prefs: { paper: 'a4' }, printedAt: null, createdAt: '2026-10-27T01:00:00.000Z',
};
const sheet = (id, takerName, answers, extra = {}) => ({
  id, takerName, answers, isSelf: false, scannedAt: '2026-10-27T06:00:00.000Z', correct: 0, scored: 3, ...extra,
});

const HISTORY_URL = '/api/user/outside-scores';
const MINE = '11111111-1111-4111-8111-111111111111';
let sheets;
let history;
beforeEach(() => {
  native.value = false;
  delivered.blobs = [];
  delivered.copied = [];
  apiRequest.mockReset();
  idbMem.clear();
  __resetPrintedSetMemory();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'u1', pendingWrites: [], deadLetters: [] });
  useStore.getState().resetSyncBackoff();
  sheets = [
    sheet('s1', 'Juan Dela Cruz', 'BCA', { scannedAt: '2026-10-27T06:03:00.000Z' }),
    sheet('s2', '=HYPERLINK("x")', 'BA*', { scannedAt: '2026-10-27T06:02:00.000Z' }),
    sheet('s3', 'Ana Reyes', 'DD-', { scannedAt: '2026-10-27T06:01:00.000Z' }),
    sheet('me', null, 'BCA', { isSelf: true, outsideScoreId: MINE }),
  ];
  history = [{
    id: MINE, title: 'Electrical Engineering Professional Subjects, SET B', source: 'REE.ai paper set', subject: 'EE',
    score: 3, total: 3, takenOn: '2026-10-27', note: 'Printed set K7P2-9QXA-M3TD. EE 3/3. 100% weighted, PASSED.',
    retestOfId: null, createdAt: '2026-10-27T06:00:00.000Z',
  }];
  apiRequest.mockImplementation(async (endpoint, method = 'GET', body) => {
    if (method === 'GET' && endpoint === SET_URL) return { item: SET };
    if (method === 'GET' && endpoint === SHEETS_URL) return { items: sheets };
    if (method === 'GET' && endpoint === HISTORY_URL) return { items: history };
    if (method === 'PUT' && endpoint.startsWith(`${HISTORY_URL}/`)) return { item: { ...history[0], ...body } };
    if (method === 'PATCH') return { item: { ...sheets.find((s) => endpoint.endsWith(s.id)), ...body } };
    if (method === 'DELETE') return { success: true, deleted: 1 };
    throw Object.assign(new Error(`unexpected ${method} ${endpoint}`), { status: 400 });
  });
});

const renderPage = () => render(
  <MemoryRouter initialEntries={[`/exams/paper-sets/${ID}`]}>
    <Routes><Route path="/exams/paper-sets/:setId" element={<PaperSetResults />} /></Routes>
  </MemoryRouter>,
);
const tile = (label) => screen.getByText(label, { selector: '.text-eyebrow' }).parentElement;
const takersTable = () => screen.getAllByRole('table')[0];
const names = () => within(takersTable()).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent);

describe('Paper set results', () => {
  it('the takers, their KPIs (pass rate on a PRC paper), and the item analysis', async () => {
    const { container } = renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'SET B results' })).toBeInTheDocument();
    await waitFor(() => expect(names()).toEqual(['Juan Dela Cruz', '=HYPERLINK("x")', 'Ana Reyes']));
    expect(tile('Takers')).toHaveTextContent('3');
    // 100, 33.3, 0.
    expect(tile('Mean')).toHaveTextContent('44.4%');
    expect(tile('Highest')).toHaveTextContent('100%');
    expect(tile('Lowest')).toHaveTextContent('0%');
    expect(tile('Pass rate')).toHaveTextContent('33.3%');
    const juan = within(takersTable()).getAllByRole('row')[1];
    expect(juan).toHaveTextContent('3 of 3');
    expect(juan).toHaveTextContent('Passed');
    expect(juan).toHaveTextContent('2026-10-27 14:03');

    // The most-missed items, lowest share right first, with their stems.
    const missed = screen.getByRole('heading', { name: 'Most-missed items' }).closest('.flex.flex-col');
    const rows = within(missed).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Item 2 \u00B7 33.3% correct \u00B7 key C \u00B7 most chose A (1)');
    expect(within(rows[0]).getByText('Question 2: $x^2$')).toBeInTheDocument();
    // Every item: counts per option, blanks and double marks.
    const items = screen.getByRole('region', { name: /Every item/ });
    const third = within(items).getAllByRole('row')[3];
    expect(within(third).getByRole('rowheader')).toHaveTextContent('3');
    expect(within(third).getAllByRole('cell').map((c) => c.textContent))
      .toEqual(['A', '33.3%', '1', '0', '0', '0', '1', '1', '\u2014']);
    expect(screen.getByText(/Discrimination shows from 10 takers/)).toBeInTheDocument();

    expectNoSkippedLevels(container);
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  });

  it('self-checks join only when asked', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(names()).toHaveLength(3));
    await user.click(screen.getByRole('checkbox', { name: 'Include self-checks (1)' }));
    expect(names()).toContain('Self-check');
    expect(tile('Takers')).toHaveTextContent('4');
  });

  it('corrects a sheet (scored again) and deletes one after a confirm', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(names()).toHaveLength(3));
    await user.click(screen.getAllByRole('button', { name: 'View or correct Ana Reyes' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Ana Reyes' });
    expect(within(dialog).getByLabelText('Item 1')).toHaveValue('D');
    expect(await axe(document.body, AXE_OPTS)).toHaveNoViolations();
    await user.selectOptions(within(dialog).getByLabelText('Item 1'), 'B');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${SHEETS_URL}/s3`, 'PATCH', { answers: 'BD-' }));
    expect(within(takersTable()).getAllByRole('row')[3]).toHaveTextContent('1 of 3');

    await user.click(screen.getAllByRole('button', { name: 'Delete Juan Dela Cruz' })[0]);
    await user.click(within(screen.getByRole('dialog', { name: 'Delete Juan Dela Cruz\u2019s sheet?' })).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(names()).toEqual(['=HYPERLINK("x")', 'Ana Reyes']));
    expect(apiRequest).toHaveBeenCalledWith(`${SHEETS_URL}/s1`, 'DELETE', null);
  });

  it('a corrected self-check moves its history entry to the new score', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(names()).toHaveLength(3));
    await user.click(screen.getByRole('checkbox', { name: 'Include self-checks (1)' }));
    await user.click(screen.getAllByRole('button', { name: 'View or correct Self-check' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Self-check' });
    await user.selectOptions(within(dialog).getByLabelText('Item 1'), 'D');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${SHEETS_URL}/me`, 'PATCH', { answers: 'DCA' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${HISTORY_URL}/${MINE}`, 'PUT', expect.objectContaining({
      title: history[0].title, takenOn: '2026-10-27', subject: 'EE', score: 2, total: 3, retestOfId: null,
      note: expect.stringMatching(/^Printed set K7P2-9QXA-M3TD\. EE 2\/3\./),
    })));
  });

  it('downloads the CSVs on the web, with names defused, and copies them in the app', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();
    await waitFor(() => expect(names()).toHaveLength(3));
    await user.click(screen.getByRole('button', { name: 'Download results CSV' }));
    const { blob, name } = delivered.blobs[0];
    expect(name).toBe('SETB-K7P2-9QXA-M3TD-results.csv');
    const text = await blob.text();
    expect(text.split('\r\n')[0]).toBe('Name,Score,Scored,Percent,EE correct,EE total,General average,Verdict,Scanned at (Manila),1,2,3');
    expect(text).toContain('\r\n"\'=HYPERLINK(""x"")",1,3,33.3,');
    expect(screen.getByText('Downloaded SETB-K7P2-9QXA-M3TD-results.csv.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Download item analysis CSV' }));
    expect(delivered.blobs[1].name).toBe('SETB-K7P2-9QXA-M3TD-item-analysis.csv');
    unmount();

    native.value = true;
    renderPage();
    await waitFor(() => expect(names()).toHaveLength(3));
    expect(screen.queryByRole('button', { name: 'Download results CSV' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy results CSV' }));
    expect(delivered.copied[0].startsWith('Name,Score,')).toBe(true);
  });

  it('no sheets yet: an empty state to scan them', async () => {
    sheets = [];
    renderPage();
    expect(await screen.findByText('No sheets scanned yet')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Scan sheets/ })[0]).toHaveAttribute('href', `/scan/${ID}?for=taker`);
  });
});
