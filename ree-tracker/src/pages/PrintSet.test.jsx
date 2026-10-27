// /print/:setId: a printed set's pages, typeset (no "$" on paper), the
// toolbar's choices, printing after the fonts load, the Android app's
// "Print in your browser", editing an item in place, the .tex and Overleaf,
// and "Draw a new set".
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

const native = { value: false };
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));
const authState = { currentUser: { uid: 'u1' } };
vi.mock('../config/firebaseDb', () => ({ auth: authState }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
const apiRequest = vi.fn();
const bank = (subject, n) => Array.from({ length: n }, (_, i) => ({
  id: `${subject}-${i + 1}`, subject, subtopic: 'General', text: `New question ${i + 1}: $y^3$`,
  options: ['1', '2', '3', '4'], answer: '2', fixedExplanation: null,
}));
vi.mock('../services/dbQueries', () => ({
  apiRequest: (...a) => apiRequest(...a),
  updateCommandParameters: vi.fn(),
  fetchVaultQuestions: vi.fn(async (subject, _t, limit) => bank(subject, Math.min(limit, 12))),
  fetchSyllabusWeights: vi.fn(async () => null),
}));
const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
  keys: async () => [...idbMem.keys()],
  delMany: async (ks) => { ks.forEach((k) => idbMem.delete(k)); },
}));
const buildExamTexDocumentSync = vi.fn((draw) => ({ name: 'REE-EE-SETA-2026-10-21.tex', content: `\\documentclass{article}\n\\reepart{paper}% ${draw.items.length}`, bytes: 40, warnings: {} }));
vi.mock('../features/exam-export/buildExamTex', () => ({ buildExamTexDocumentSync }));

const { useStore } = await import('../store/useStore');
const { default: PrintSet } = await import('./PrintSet');
const { __resetPrintedSetMemory } = await import('../features/paper-sets/printedSetsApi');
const { __resetTexExport } = await import('../features/paper-sets/print/texExport');

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
const SET = {
  id: ID, contentId: 'c1', label: 'SET A', title: 'Electrical Engineering Professional Subjects', code: 'EE', profile: 'prc_subject',
  sittingKey: 'sk', generatedAt: '2026-10-21T01:00:00.000Z',
  config: { mode: 'subject', subject: 'EE', isPrcStandard: false, count: 10, source: 'library', cognitiveFocus: 'mixed' },
  plan: { kind: 'subject', profile: 'prc_subject', code: 'EE', title: 'Electrical Engineering Professional Subjects', timeAllotmentMins: 360, sections: [{ subject: 'EE' }] },
  sections: [{ subject: 'EE', title: 'Electrical Engineering Professional Subjects', from: 1, to: 3 }],
  items: [
    { n: 1, subject: 'EE', subtopic: 'Circuits', text: 'Find $x^2$ when $x = 3$.', options: ['6', '9', '12', '3'], answer: '9', answerIndex: 1, explanation: 'Square it: $3^2 = 9$.' },
    { n: 2, subject: 'EE', subtopic: 'Circuits', text: 'In the circuit shown, find $I$ if $V = 10$ and $R = 5$.', options: ['$1$ A', '$2$ A', '$5$ A', '$50$ A'], answer: '$2$ A', answerIndex: 1, explanation: 'Since $V = IR$.', figure: true },
    { n: 3, subject: 'EE', subtopic: 'Math', text: 'What is $\\sqrt{16}$?', options: ['2', '4', '8', '16'], answer: '5', answerIndex: -1, explanation: null },
  ],
  edits: {}, prefs: { paper: 'a4', docs: { paper: true, sheet: true, key: true }, solutions: true },
  warnings: { unmatched: [3], shortfall: [], focusFallback: false },
  printedAt: null, createdAt: '2026-10-21T01:00:00.000Z',
};

let routes;
const handle = () => apiRequest.mockImplementation(async (endpoint, method = 'GET', body) => {
  const h = routes[`${method} ${endpoint}`] || routes[`${method} *`];
  if (!h) throw Object.assign(new Error(`unexpected ${method} ${endpoint}`), { status: 400 });
  return h(body, endpoint);
});
const calls = (method, endpoint) => apiRequest.mock.calls.filter(([e, m = 'GET']) => m === method && (!endpoint || e === endpoint));

function Where() {
  const loc = useLocation();
  return <span data-testid="where">{loc.pathname}</span>;
}
const renderPage = (path = `/print/${ID}`) => render(
  <MemoryRouter initialEntries={['/simulator', path]} initialIndex={1}>
    <Routes>
      <Route path="/print/:setId" element={<><PrintSet /><Where /></>} />
      <Route path="*" element={<Where />} />
    </Routes>
  </MemoryRouter>,
);
const root = () => document.querySelector('.ree-print-root');
const sheets = () => document.querySelector('.ree-sheets');
const ready = async () => {
  await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /SET A/ })).toBeInTheDocument());
  await waitFor(() => expect(sheets().querySelectorAll('.ree-sheet-frame').length).toBeGreaterThanOrEqual(3));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Print' })).toBeEnabled());
};

beforeEach(() => {
  native.value = false;
  apiRequest.mockReset();
  buildExamTexDocumentSync.mockClear();
  idbMem.clear();
  localStorage.clear();
  __resetPrintedSetMemory();
  __resetTexExport();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'u1', pendingWrites: [], deadLetters: [] });
  useStore.getState().resetSyncBackoff();
  routes = {
    [`GET ${SET_URL}`]: () => ({ item: SET }),
    [`GET ${SET_URL}/sheets`]: () => ({ items: [] }),
    [`PATCH ${SET_URL}`]: () => ({ success: true }),
    'DELETE *': () => ({ success: true }),
    'POST /api/user/printed-sets': (body) => ({ item: body }),
  };
  handle();
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  delete document.fonts;
});

describe('Print preview', () => {
  it('typesets the paper, the sheet and the key, with no "$" anywhere on the pages', async () => {
    renderPage();
    await ready();
    expect(document.documentElement).toHaveClass('ree-printing-page');
    expect(document.getElementById('ree-page-size').textContent).toBe('@page { size: 210mm 297mm; margin: 0 }');
    expect(sheets().querySelectorAll('.katex').length).toBeGreaterThan(5);
    expect(root().textContent).not.toContain('$');
    const s = within(sheets());
    expect(s.getByText('PROFESSIONAL REGULATION COMMISSION')).toBeInTheDocument();
    // On every document: the paper, the sheet (in its SVG) and the key.
    expect(s.getAllByText('Practice paper generated by REE.ai \u2013 not an official PRC document')).toHaveLength(3);
    expect(s.getByText('Figure not in the question bank.')).toBeInTheDocument();
    expect(s.getAllByText('REE Pre-board \u00B7 EE \u00B7 SET A \u00B7 Set code K7P2-9QXA-M3TD')).toHaveLength(2);
    expect(s.getAllByText('Page 1 of 1')).toHaveLength(2);
    // The answer sheet: an SVG page with a bubble per option.
    const svg = sheets().querySelector('svg[data-sheet-page="1"]');
    expect(svg.getAttribute('viewBox')).toBe('0 0 210 297');
    expect(svg.querySelectorAll('circle[data-n][data-k]')).toHaveLength(12);
    // The key, column-major, with "--*" for the unmatched item.
    expect([...sheets().querySelectorAll('.ree-key-row')].map((r) => `${r.dataset.n}${r.dataset.letter}`)).toEqual(['1B', '2B', '3-']);
    expect(s.getByText('Worked solutions')).toBeInTheDocument();
    expect(screen.getByText(/matches none of the options, so the key shows/)).toBeInTheDocument();
    expect(await axe(document.body, AXE_OPTS)).toHaveNoViolations();
  });

  it('the toolbar picks the paper and the documents, and saves them', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();
    await user.click(screen.getByRole('radio', { name: 'Letter' }));
    expect(document.getElementById('ree-page-size').textContent).toBe('@page { size: 215.9mm 279.4mm; margin: 0 }');
    expect(sheets().querySelector('svg[data-sheet-page="1"]').getAttribute('viewBox')).toBe('0 0 215.9 279.4');
    await user.click(screen.getByRole('radio', { name: 'Long 8.5 \u00D7 13 in' }));
    expect(screen.getByText(/some printers call it Folio/)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Answer key' }));
    expect(screen.getByRole('checkbox', { name: 'Worked solutions' })).toBeDisabled();
    expect(sheets().querySelector('.ree-key-row')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Saving\u2026');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^Saved$/), { timeout: 2000 });
    expect(calls('PATCH', SET_URL).at(-1)[2]).toEqual({ prefs: { paper: 'long', docs: { paper: true, sheet: true, key: false }, solutions: true } });
    expect(localStorage.getItem('ree-print-paper')).toBe('long');
  });

  it('prints once the fonts have loaded, then marks the set printed', async () => {
    let fontsLoaded;
    document.fonts = { ready: new Promise((r) => { fontsLoaded = r; }), addEventListener() {}, removeEventListener() {} };
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /SET A/ })).toBeInTheDocument());
    await act(async () => { fontsLoaded(); });
    // Fonts were already loaded once; a new wait is set up for the click.
    let again;
    document.fonts.ready = new Promise((r) => { again = r; });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Print' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Print' }));
    expect(print).not.toHaveBeenCalled();
    await act(async () => { again(); });
    expect(print).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(calls('PATCH', SET_URL)).toEqual([[SET_URL, 'PATCH', { printed: true }]]));
    print.mockRestore();
  });

  it('printing from the browser\u2019s own menu marks the set printed too, once', async () => {
    renderPage();
    await ready();
    act(() => { window.dispatchEvent(new Event('afterprint')); });
    act(() => { window.dispatchEvent(new Event('afterprint')); });
    await waitFor(() => expect(calls('PATCH', SET_URL)).toEqual([[SET_URL, 'PATCH', { printed: true }]]));
  });

  it('in the Android app, Print waits for queued changes to reach the account', async () => {
    native.value = true;
    useStore.setState({ pendingWrites: [{ id: 'w2', endpoint: SET_URL, method: 'PATCH', body: { edits: { 1: { text: 'Queued wording' } } }, ownerUid: 'u1', createdAt: SET.createdAt }] });
    routes[`PATCH ${SET_URL}`] = () => { throw new Error('[OFFLINE]'); };
    renderPage();
    const button = await screen.findByRole('button', { name: 'Print in your browser' });
    await waitFor(() => expect(button).toHaveAccessibleDescription(/your latest changes must reach your account/));
    expect(button).toBeDisabled();
  });

  it('in the Android app, Print opens the set in the browser, once the set has synced', async () => {
    native.value = true;
    const user = userEvent.setup();
    const real = window.location;
    delete window.location;
    window.location = { href: '' };
    try {
      useStore.setState({ pendingWrites: [{ id: 'w1', endpoint: '/api/user/printed-sets', method: 'POST', body: SET, ownerUid: 'u1', createdAt: SET.createdAt }] });
      // The queue can't drain: the create keeps failing for now.
      routes['POST /api/user/printed-sets'] = () => { throw new Error('[OFFLINE]'); };
      routes[`GET ${SET_URL}`] = () => { throw Object.assign(new Error('nf'), { status: 404 }); };
      renderPage();
      const button = await screen.findByRole('button', { name: 'Print in your browser' });
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription(/Connect to the internet first/);
      expect(screen.getByRole('status')).toHaveTextContent('Saved on this device; syncs when online');
      act(() => { useStore.setState({ pendingWrites: [] }); });
      routes[`GET ${SET_URL}`] = () => ({ item: SET });
      await waitFor(() => expect(screen.getByRole('button', { name: 'Print in your browser' })).toBeEnabled());
      await user.click(screen.getByRole('button', { name: 'Print in your browser' }));
      expect(window.location.href).toBe(`https://ree-tracker.vercel.app/print/${ID}`);
      // No file downloads in the app: the .tex is copied.
      await user.click(screen.getByRole('button', { name: 'More' }));
      expect(screen.getByRole('button', { name: 'Copy .tex' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Open in Overleaf' })).toBeNull();
    } finally {
      window.location = real;
    }
  });

  it('edits an item in place: the change shows on the paper and is saved', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();
    const toggle = screen.getByRole('button', { name: 'Edit questions' });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Edit item 1' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit item 1' });
    expect(await axe(document.body, AXE_OPTS)).toHaveNoViolations();
    const stem = within(dialog).getByLabelText('Question');
    await user.clear(stem);
    await user.type(stem, 'E2E edited: $\\frac{{1}{{2}$');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    const item = sheets().querySelector('.ree-item[data-item="1"]');
    expect(item.textContent).toContain('E2E edited:');
    expect(item.querySelector('.katex .mfrac')).not.toBeNull();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^Saved$/), { timeout: 2000 });
    expect(calls('PATCH', SET_URL)[0][2]).toEqual({ edits: { 1: { text: 'E2E edited: $\\frac{1}{2}$' } } });
    expect(within(sheets()).getByRole('button', { name: 'Edit item 1' })).toHaveTextContent('Edited');
  });

  it('downloads one .tex of the edited set, and opens it in Overleaf', async () => {
    const user = userEvent.setup();
    const submitted = [];
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function capture() {
      submitted.push({ action: this.action, target: this.target, fields: Object.fromEntries(new FormData(this)) });
    });
    renderPage();
    await ready();
    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(screen.getByRole('button', { name: 'Download .tex' }));
    await waitFor(() => expect(screen.getByText('Downloaded REE-EE-SETA-2026-10-21.tex.')).toBeInTheDocument());
    // The LaTeX is for printing, so the set counts as printed.
    await waitFor(() => expect(calls('PATCH', SET_URL)).toEqual([[SET_URL, 'PATCH', { printed: true }]]));
    const [draw, opts] = buildExamTexDocumentSync.mock.calls[0];
    expect(draw).toMatchObject({ printId: ID, setLabel: 'SET A' });
    expect(opts).toMatchObject({ paper: 'a4', documents: { paper: true, sheet: true, key: true }, includeSolutions: true, printId: ID, setCode: 'K7P2-9QXA-M3TD' });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(screen.getByRole('button', { name: 'Open in Overleaf' }));
    expect(submitted).toEqual([{
      action: 'https://www.overleaf.com/docs',
      target: '_blank',
      fields: { encoded_snip: encodeURIComponent(buildExamTexDocumentSync.mock.results[1].value.content), snip_name: 'REE-EE-SETA-2026-10-21', engine: 'pdflatex' },
    }]);
    expect(document.querySelector('form[action]')).toBeNull();
    expect(calls('PATCH', SET_URL)).toHaveLength(1);
    submit.mockRestore();
  });

  it('draws a new set from the same setup, replacing an unused one', async () => {
    const user = userEvent.setup();
    renderPage();
    await ready();
    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(screen.getByRole('button', { name: 'Draw a new set' }));
    await waitFor(() => expect(screen.getByTestId('where').textContent).not.toBe(`/print/${ID}`));
    const next = screen.getByTestId('where').textContent.split('/').pop();
    expect(next).toMatch(/^[0-9A-HJKMNP-TV-Z]{12}$/);
    const created = calls('POST', '/api/user/printed-sets')[0][2];
    expect(created).toMatchObject({ id: next, config: SET.config, code: 'EE' });
    // Deleted only if the server agrees it is still unused (it may have been
    // printed or scanned from another device).
    await waitFor(() => expect(calls('DELETE', `${SET_URL}?ifUnused=1`)).toHaveLength(1));
    expect(calls('DELETE', SET_URL)).toHaveLength(0);
    await waitFor(() => expect(within(sheets()).getAllByText(/New question/).length).toBeGreaterThan(0));
  });

  it('asks first when the set already has scanned sheets, and keeps it', async () => {
    const user = userEvent.setup();
    routes[`GET ${SET_URL}/sheets`] = () => ({ items: [{ id: 's1' }, { id: 's2' }] });
    renderPage();
    await ready();
    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(screen.getByRole('button', { name: 'Draw a new set' }));
    const dialog = screen.getByRole('dialog', { name: 'Draw a new set?' });
    expect(dialog).toHaveTextContent('2 answer sheets are already scanned for this set.');
    await user.click(within(dialog).getByRole('button', { name: 'Draw a new set' }));
    await waitFor(() => expect(screen.getByTestId('where').textContent).not.toBe(`/print/${ID}`));
    expect(calls('DELETE')).toHaveLength(0);
  });

  it('says so when the set isn\u2019t in the account, and Back leaves', async () => {
    const user = userEvent.setup();
    routes[`GET ${SET_URL}`] = () => { throw Object.assign(new Error('nf'), { status: 404 }); };
    renderPage();
    expect(await screen.findByRole('heading', { name: 'This paper set isn\u2019t in your account' })).toBeInTheDocument();
    expect(await axe(document.body, AXE_OPTS)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Back to Exams' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/simulator');
  });

  it('names the items whose formula doesn\u2019t render, which print as typed', async () => {
    routes[`GET ${SET_URL}`] = () => ({ item: { ...SET, edits: { 2: { text: 'The meter reads $\\text{V_rms} = 120$.' } } } });
    renderPage();
    await ready();
    expect(await screen.findByText(/^Item 2 has a formula that doesn\u2019t render/)).toBeInTheDocument();
    expect(sheets().querySelector('.ree-item[data-item="2"] .katex-error')).not.toBeNull();
  });

  it('reads a code however it was typed, and refuses one that isn\u2019t a code', async () => {
    renderPage('/print/k7p2-9qxa-m3td');
    await ready();
    expect(calls('GET', SET_URL).length).toBeGreaterThan(0);
  });
});
