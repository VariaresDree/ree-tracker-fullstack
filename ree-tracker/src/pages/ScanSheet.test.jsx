// /scan/:setId: the answer-sheet scanner, end to end on a synthetic photo,
// read by the real OMR engine (on the main thread: jsdom has no Worker). The
// camera is blocked, so only the photo buttons show; a photo chosen from the
// gallery is read, the double mark is flagged, a correction is made, the
// taker's name is required, and the sheet is scored and saved. A self-check
// also lands in your history as one outside score, a retest of the first.
//
// jsdom has no canvas: decoding the photo and painting the review image are
// stood in for (imageInput.js); the pixels the engine reads are real.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { todayManila } from '@ree/shared';
import { answerSheetGeometry } from '../features/exam-export/sheetLayout';
import { cameraH, mulberry32, photograph, renderSheet } from '../features/omr/__fixtures__/synthSheet';

expect.extend(axeMatchers);

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
  default: ({ content, inline }) => (inline ? <span>{content}</span> : <div>{content}</div>),
}));
const photo = { img: null };
vi.mock('../features/paper-sets/scan/imageInput', () => ({
  decodeImageFile: vi.fn(async () => ({ ...photo.img, data: photo.img.data.slice() })),
  frameFromVideo: () => null,
  paintImageData: vi.fn(),
  cropToDataUrl: () => 'data:image/png;base64,AAAA',
}));

const { useStore } = await import('../store/useStore');
const { default: ScanSheet } = await import('./ScanSheet');
const { __resetPrintedSetMemory } = await import('../features/paper-sets/printedSetsApi');
const { __resetOutsideScoresMemory } = await import('../features/exams/useOutsideScores');

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
const OUTSIDE = '/api/user/outside-scores';
const item = (n, answerIndex) => ({
  n, subject: 'EE', subtopic: 'Circuits', text: `Question ${n}: find $x^${n}$.`, options: ['10 V', '20 V', '30 V', '40 V'],
  answer: ['10 V', '20 V', '30 V', '40 V'][answerIndex], answerIndex, explanation: `Because $V = IR$ (${n}).`,
});
// Keys: B, C, A.
const SET = {
  id: ID, contentId: 'c1', label: 'SET B', title: 'Electrical Engineering Professional Subjects', code: 'EE', profile: 'custom',
  sittingKey: 'sk', generatedAt: '2026-10-27T01:00:00.000Z', config: {},
  plan: { kind: 'subject', profile: 'custom', code: 'EE', title: 'EE practice paper', sections: [{ subject: 'EE' }] },
  sections: [{ subject: 'EE', title: 'EE', from: 1, to: 3 }],
  items: [item(1, 1), item(2, 2), item(3, 0)],
  edits: {}, prefs: { paper: 'a4', docs: { paper: true, sheet: true, key: true }, solutions: true },
  printedAt: '2026-10-27T02:00:00.000Z', createdAt: '2026-10-27T01:00:00.000Z',
};

/** A phone photo of the sheet: item 1 B (right), item 2 A (wrong), item 3 A and C (two marks). */
function sheetPhoto(printId = ID) {
  const page = answerSheetGeometry({ optionCounts: [4, 4, 4], paper: 'a4', printId }).pages[0];
  const rng = mulberry32(3);
  const sheet = renderSheet(page, { ppm: 5, marks: { 1: [1], 2: [0], 3: [0, 2] }, rng });
  const H = cameraH({ srcW: sheet.width, srcH: sheet.height, outW: 1050, outH: 1400, rng, fill: 0.88, angleDeg: 3, tilt: 0.03 });
  return photograph(sheet, { H, outW: 1050, outH: 1400, rng, blurPx: 0.7, noiseSigma: 2.5, light: { gradient: 0.2, vignette: 0.1 } });
}
const GOOD = sheetPhoto();

let routes;
let sheets;
let outsideItems;
const handle = () => apiRequest.mockImplementation(async (endpoint, method = 'GET', body) => {
  const h = routes[`${method} ${endpoint}`];
  if (!h) throw Object.assign(new Error(`unexpected ${method} ${endpoint}`), { status: 400 });
  return h(body, endpoint);
});
const calls = (method, endpoint) => apiRequest.mock.calls.filter(([e, m = 'GET']) => m === method && e === endpoint);

function Where() {
  const loc = useLocation();
  return <span data-testid="where">{loc.pathname + loc.search}</span>;
}
const renderAt = (path) => render(
  <MemoryRouter initialEntries={['/exams?tab=paper', path]} initialIndex={1}>
    <Routes>
      <Route path="/scan" element={<><ScanSheet /><Where /></>} />
      <Route path="/scan/:setId" element={<><ScanSheet /><Where /></>} />
      <Route path="*" element={<Where />} />
    </Routes>
  </MemoryRouter>,
);

const denyCamera = () => {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => { throw new DOMException('Permission denied', 'NotAllowedError'); }) },
  });
};
const gallery = (container) => container.querySelector('input[type="file"]:not([capture])');
const choosePhoto = (container) => fireEvent.change(gallery(container), {
  target: { files: [new File(['x'], 'sheet.png', { type: 'image/png' })] },
});

beforeEach(() => {
  apiRequest.mockReset();
  idbMem.clear();
  localStorage.clear();
  __resetPrintedSetMemory();
  __resetOutsideScoresMemory();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'u1', pendingWrites: [], deadLetters: [] });
  useStore.getState().resetSyncBackoff();
  photo.img = GOOD;
  sheets = [];
  outsideItems = [];
  routes = {
    [`GET ${SET_URL}`]: () => ({ item: SET }),
    [`GET ${SHEETS_URL}`]: () => ({ items: sheets }),
    [`POST ${SHEETS_URL}`]: (body) => ({ item: { ...body, correct: 0, scored: 3 } }),
    [`GET ${OUTSIDE}`]: () => ({ items: outsideItems }),
    [`POST ${OUTSIDE}`]: (body) => ({ item: { ...body, createdAt: '2026-10-27T03:00:00.000Z' } }),
  };
  handle();
  denyCamera();
});

afterEach(() => {
  delete navigator.mediaDevices;
});

describe('Scanner: a taker\u2019s sheet from the gallery', () => {
  it('camera blocked: explains it, offers only the photo buttons, and says photos stay on the device', async () => {
    const { container } = renderAt(`/scan/${ID}?for=taker`);
    expect(await screen.findByText(/The camera is blocked for this site/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take a photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose from gallery' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Take the picture now' })).not.toBeInTheDocument();
    expect(container.querySelector('input[type="file"][capture="environment"]')).not.toBeNull();
    expect(screen.getByText('Photos stay on this device. Only the answers and the name are saved.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'A taker\u2019s sheet' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('heading', { level: 1, name: 'Scan answer sheets' })).toBeInTheDocument();
    expect(await screen.findByText(/SET B/)).toBeInTheDocument();
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  });

  it('reads the photo, flags the double mark, takes a correction, needs the name, then scores and saves', async () => {
    const user = userEvent.setup();
    const { container } = renderAt(`/scan/${ID}?for=taker`);
    await screen.findByText(/The camera is blocked/);
    choosePhoto(container);

    expect(await screen.findByRole('heading', { name: 'Check the answers' }, { timeout: 20_000 })).toBeInTheDocument();
    const flags = within(screen.getByRole('list', { name: 'Items to check' })).getAllByRole('button');
    expect(flags.map((b) => b.textContent)).toEqual(['Item 3: two marks, A and C']);
    // Every answer, behind a disclosure.
    await user.click(screen.getByText('All answers (3)'));
    expect(screen.getByRole('button', { name: 'Item 1. B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Item 2. A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Item 3. Two marks' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'The name written on the sheet' })).toBeInTheDocument();
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();

    // Correct item 3 to A.
    await user.click(flags[0]);
    const dialog = screen.getByRole('dialog', { name: 'Item 3' });
    expect(within(dialog).getByText('The scanner read two marks, A and C.')).toBeInTheDocument();
    expect(within(dialog).getAllByRole('radio').map((r) => r.closest('label').textContent))
      .toEqual(['A', 'B', 'C', 'D', 'Blank', 'Two marks (invalid)']);
    expect(within(dialog).getByRole('radio', { name: 'Two marks (invalid)' })).toBeChecked();
    expect(await axe(document.body, AXE_OPTS)).toHaveNoViolations();
    await user.click(within(dialog).getByRole('radio', { name: 'A' }));
    await user.click(within(dialog).getByRole('button', { name: 'Use this answer' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Item 3: two marks, A and C\. Now A/ })).toBeInTheDocument();

    // The name is required.
    await user.click(screen.getByRole('button', { name: 'Score this sheet' }));
    expect(screen.getByText('Write the taker\u2019s name.')).toBeInTheDocument();
    expect(calls('POST', SHEETS_URL)).toHaveLength(0);
    await user.type(screen.getByLabelText(/Taker.s name/), 'Juan Dela Cruz');
    await user.click(screen.getByRole('button', { name: 'Score this sheet' }));

    expect(await screen.findByRole('heading', { name: 'Juan Dela Cruz' })).toBeInTheDocument();
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument();
    expect(screen.queryByText(/General average/)).not.toBeInTheDocument(); // not a PRC paper
    const [[, , body]] = calls('POST', SHEETS_URL);
    expect(body).toMatchObject({
      takerName: 'Juan Dela Cruz', isSelf: false, answers: 'BAA', review: { corrected: [3], unsure: [] }, outsideScoreId: null,
    });
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body).not.toHaveProperty('correct'); // the server scores it
    // Kept on this device at once.
    const cached = [...idbMem.entries()].find(([k]) => k.includes(`printedSheets:${ID}`));
    expect(cached?.[1]?.value?.map((s) => s.id)).toContain(body.id);
    // No history entry for a taker.
    expect(calls('POST', OUTSIDE)).toHaveLength(0);
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();

    // The next sheet: the name clears, the photo buttons are back.
    expect(screen.getByRole('link', { name: /See results/ })).toHaveAttribute('href', `/exams/paper-sets/${ID}`);
    await user.click(screen.getByRole('button', { name: 'Scan the next sheet' }));
    expect(screen.getByRole('button', { name: 'Choose from gallery' })).toBeInTheDocument();
    expect(screen.getByText(/1 sheet scanned for this set/)).toBeInTheDocument();
  }, 40_000);

  it('a sheet from another set is refused with the reason', async () => {
    photo.img = sheetPhoto('AAAAAAAAAAAA');
    const { container } = renderAt(`/scan/${ID}`);
    await screen.findByText(/The camera is blocked/);
    choosePhoto(container);
    expect(await screen.findByText('This sheet belongs to another paper set.', {}, { timeout: 20_000 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Check the answers' })).not.toBeInTheDocument();
  }, 30_000);
});

describe('Scanner: a sheet of two pages', () => {
  it('reads page 1 then page 2, refusing a page out of order or read twice, and merges them', async () => {
    // 120 items of six options: items 1-93 on page 1, 94-120 on page 2.
    const six = ['a', 'b', 'c', 'd', 'e', 'f'];
    const big = {
      ...SET,
      sections: [{ subject: 'EE', title: 'EE', from: 1, to: 120 }],
      items: Array.from({ length: 120 }, (_, i) => ({ ...item(i + 1, 0), options: six, answer: 'a' })),
    };
    routes[`GET ${SET_URL}`] = () => ({ item: big });
    const geometry = answerSheetGeometry({ optionCounts: Array(120).fill(6), paper: 'a4', printId: ID });
    const shoot = (index) => {
      const page = geometry.pages[index];
      const marks = {};
      for (let n = page.from; n <= page.to; n += 1) marks[n] = n === 100 ? [1, 4] : [n % 6];
      const rng = mulberry32(20 + index);
      const sheet = renderSheet(page, { ppm: 5, marks, rng });
      const H = cameraH({ srcW: sheet.width, srcH: sheet.height, outW: 1200, outH: 1600, rng, fill: 0.9, angleDeg: 2, tilt: 0.02 });
      return photograph(sheet, { H, outW: 1200, outH: 1600, rng, blurPx: 0.6, noiseSigma: 2 });
    };
    const [one, two] = [shoot(0), shoot(1)];
    const { container } = renderAt(`/scan/${ID}`);
    await screen.findByText(/The camera is blocked/);

    photo.img = two;
    choosePhoto(container);
    expect(await screen.findByText('This is another page of the answer sheet. Scan page 1.', {}, { timeout: 20_000 })).toBeInTheDocument();

    photo.img = one;
    choosePhoto(container);
    expect(await screen.findByText('Page 1 of 2 read. Now scan page 2.', {}, { timeout: 20_000 })).toBeInTheDocument();
    expect(screen.getByText(/This answer sheet has 2 pages/)).toBeInTheDocument();

    choosePhoto(container);
    expect(await screen.findByText('This page is already read. Scan page 2.', {}, { timeout: 20_000 })).toBeInTheDocument();

    photo.img = two;
    choosePhoto(container);
    expect(await screen.findByRole('heading', { name: 'Check the answers' }, { timeout: 20_000 })).toBeInTheDocument();
    const flags = within(screen.getByRole('list', { name: 'Items to check' })).getAllByRole('button');
    expect(flags.map((b) => b.textContent)).toEqual(['Item 100: two marks, B and E']);
    expect(screen.getByText('All answers (120)')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Taker.s name/), 'Ana');
    fireEvent.click(screen.getByRole('button', { name: 'Score this sheet' }));
    await screen.findByRole('heading', { name: 'Ana' });
    const [[, , body]] = calls('POST', SHEETS_URL);
    const expected = Array.from({ length: 120 }, (_, i) => (i + 1 === 100 ? '*' : 'ABCDEF'[(i + 1) % 6])).join('');
    expect(body.answers).toBe(expected);
  }, 60_000);
});

describe('Scanner: my own sheet', () => {
  it('saves the sheet and one outside score (display only), a retest of the first self-check', async () => {
    const FIRST = '11111111-1111-4111-8111-111111111111';
    sheets = [{ id: 'old', isSelf: true, takerName: null, answers: 'BCA', outsideScoreId: FIRST, scannedAt: '2026-10-20T00:00:00.000Z' }];
    outsideItems = [{ id: FIRST, title: 'EE practice paper, SET B', subject: 'EE', score: 3, total: 3, takenOn: '2026-10-20', retestOfId: null, createdAt: '2026-10-20T00:00:00.000Z' }];
    const user = userEvent.setup();
    const { container } = renderAt(`/scan/${ID}?for=self`);
    await screen.findByText(/The camera is blocked/);
    expect(screen.getByRole('radio', { name: 'My own sheet' })).toHaveAttribute('aria-checked', 'true');
    choosePhoto(container);
    await screen.findByRole('heading', { name: 'Check the answers' }, { timeout: 20_000 });
    expect(screen.queryByLabelText(/Taker.s name/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Date you took it')).toHaveValue(todayManila());
    await user.click(screen.getByRole('button', { name: 'Score this sheet' }));

    expect(await screen.findByRole('heading', { name: 'Your score' })).toBeInTheDocument();
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    await waitFor(() => expect(calls('POST', OUTSIDE)).toHaveLength(1));
    const [[, , sheet]] = calls('POST', SHEETS_URL);
    const [[, , entry]] = calls('POST', OUTSIDE);
    expect(sheet).toMatchObject({ isSelf: true, takerName: null, answers: 'BA*' });
    expect(entry).toEqual({
      id: sheet.outsideScoreId,
      title: 'EE practice paper, SET B',
      source: 'REE.ai paper set',
      subject: 'EE',
      score: 1,
      total: 3,
      takenOn: todayManila(),
      note: 'Printed set K7P2-9QXA-M3TD. EE 1/3. 33.3%.',
      retestOfId: FIRST,
    });
    expect(screen.getByText('Saved to your history.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Past sittings/ })).toHaveAttribute('href', '/exams?tab=history');
    // The two items missed: the stem, your answer, the key and the solution.
    const missed = screen.getByRole('heading', { name: 'Items you missed' }).parentElement;
    expect(within(missed).getByText('Question 2: find $x^2$.')).toBeInTheDocument();
    expect(within(missed).getByText('Question 3: find $x^3$.')).toBeInTheDocument();
    expect(within(missed).getByText('Because $V = IR$ (3).')).toBeInTheDocument();
    expect(within(missed).getByText('Two marks')).toBeInTheDocument();
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 40_000);
});

describe('Scanner: no set in the link', () => {
  it('lists your sets to choose from', async () => {
    routes['GET /api/user/printed-sets'] = () => ({ items: [{ ...SET, items: undefined, _count: { sheets: 2 } }] });
    const user = userEvent.setup();
    const { container } = renderAt('/scan?for=self');
    expect(await screen.findByRole('heading', { name: 'Which paper set?' })).toBeInTheDocument();
    expect(await screen.findByText('K7P2-9QXA-M3TD \u00B7 2 sheets scanned')).toBeInTheDocument();
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
    await user.click(screen.getByRole('link', { name: /^Scan\s+SET B/ }));
    expect(screen.getByTestId('where')).toHaveTextContent(`/scan/${ID}?for=self`);
  });
});
