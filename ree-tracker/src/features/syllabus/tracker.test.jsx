// Progress › Syllabus: the tracker and each topic's table of contents. The
// suggested list comes from the server, a learner's own rows lie over it, and
// changes show at once and queue offline. The figures are pure (trackerModel).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

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
const { resetSyncedMemory } = await import('../../hooks/useSyncedUserData');
const { default: SyllabusTab } = await import('./SyllabusTab');
const { __resetSyllabusMemory } = await import('./useSyllabus');
const { __resetSubtopicsMemory } = await import('./useSubtopics');
const model = await import('./trackerModel');
const { forgetSubtopicChoices } = await import('./subtopicChoices');

const MINE = '/api/user/syllabus-subtopics';
const row = (topicId, subject, name, over = {}) => ({
  topicId, subject, name, sortOrder: 0, read: false, watched: false, drilled: false,
  autoDrilled: false, attempts: 0, correct: 0, startedOn: null, finishedOn: null, note: null, masteryEffective: null, ...over,
});
const TOPICS = [
  row('t-calc', 'Mathematics', 'Calculus 1', { attempts: 40, correct: 25, masteryEffective: 0.7 }),
  row('t-alg', 'Mathematics', 'Algebra', { attempts: 12, correct: 4, masteryEffective: 0.2 }),
  row('t-vec', 'Mathematics', 'Vector Analysis', { attempts: 2, correct: 2 }),
  row('t-psa', 'EE', 'Power System Analysis'),
];
const sub = (id, topicId, name, sortOrder, active = true) => ({ id, topicId, name, sortOrder, active });
const PREMADE = [
  sub('a', 't-alg', 'Functions', 0),
  sub('b', 't-alg', 'Age Problems', 1),
  sub('c', 't-calc', 'Limits', 0),
];

let mineRows;
function routeApi({ offline = false } = {}) {
  apiRequest.mockImplementation(async (endpoint, method = 'GET', body) => {
    if (endpoint === '/api/config/subtopics') return { items: PREMADE };
    if (endpoint === MINE && method === 'GET') return { items: mineRows };
    if (method === 'GET') return { weights: { Mathematics: 0.25, ESAS: 0.3, EE: 0.45 }, topics: TOPICS };
    if (offline) throw new Error('[OFFLINE]');
    if (endpoint === `${MINE}/bulk`) return { items: body.items };
    if (endpoint.startsWith(MINE)) return { item: { ...body, id: decodeURIComponent(endpoint.slice(MINE.length + 1)) } };
    return { item: body };
  });
}
const writes = (endpoint) => apiRequest.mock.calls.filter((c) => c[0].startsWith(endpoint) && (c[1] || 'GET') !== 'GET');

// Stands in for the phone's Back button.
function BackButton() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(-1)}>device-back</button>;
}
const show = (initialEntries = ['/progress?tab=syllabus']) => render(<MemoryRouter initialEntries={initialEntries}><SyllabusTab /><BackButton /></MemoryRouter>);
const open = async (name) => {
  fireEvent.click(await screen.findByRole('button', { name }));
  return within(screen.getByRole('region', { name: `${name}: table of contents` }));
};

beforeEach(() => {
  vi.clearAllMocks();
  idbMem.clear();
  __resetSyllabusMemory();
  __resetSubtopicsMemory();
  forgetSubtopicChoices();
  resetSyncedMemory('premadeSubtopics');
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'user-A', pendingWrites: [], deadLetters: [] });
  mineRows = [];
  routeApi();
});

describe('the tracker’s tiles', () => {
  it('each tile reports its subtopics and checks, and has nothing to change on it', async () => {
    show();
    const alg = await screen.findByRole('button', { name: 'Algebra' });
    await waitFor(() => expect(screen.getByRole('progressbar', { name: 'Algebra: 0 of 2 subtopics' })).toBeInTheDocument());
    const item = alg.closest('li');
    expect(within(item).getByText('0/2')).toBeInTheDocument();
    expect(within(item).getByRole('img', { name: 'not read, not watched, not drilled' })).toBeInTheDocument();
    expect(within(item).getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('marks a weak topic with its pill and a red edge, and only that one', async () => {
    show();
    const item = (await screen.findByRole('button', { name: 'Algebra' })).closest('li');
    expect(within(item).getByText('Weak')).toBeInTheDocument();
    expect(item.getAttribute('style')).toMatch(/accent-danger/);
    const calc = screen.getByRole('button', { name: 'Calculus 1' }).closest('li');
    expect(within(calc).queryByText('Weak')).not.toBeInTheDocument();
    expect(calc.getAttribute('style') || '').not.toMatch(/accent-danger/);
  });

  it('tells a board figure nowhere on the screen', async () => {
    show();
    await screen.findByRole('button', { name: 'Algebra' });
    await open('Algebra');
    expect(document.body.textContent).not.toMatch(/board items|board’s 100|not itemized/i);
  });

  it('rings switch the subject, three always in a row', async () => {
    show();
    const math = await screen.findByRole('button', { name: /^Mathematics: / });
    expect(math).toHaveAttribute('aria-pressed', 'true');
    expect(math.parentElement.className).toMatch(/grid-cols-3/);
    expect(math.parentElement.children).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: /^EE: / }));
    expect(screen.getByRole('heading', { level: 3, name: 'Power System Analysis' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Algebra' })).not.toBeInTheDocument();
  });

  it('the mastery strip gives every count in words', async () => {
    show();
    expect(await screen.findByRole('img', { name: 'Mathematics topics by mastery: Proficient 1, Building 1, No answers 1' })).toBeInTheDocument();
  });

  it('filter chips carry their counts, and narrow the list', async () => {
    TOPICS[0] = { ...TOPICS[0], read: true, drilled: true };
    try {
      show();
      await screen.findByRole('button', { name: 'Algebra' });
      const names = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
      expect(names()).toEqual(['Calculus 1', 'Algebra', 'Vector Analysis']);
      fireEvent.click(screen.getByRole('radio', { name: 'To do 2' }));
      expect(names()).toEqual(['Algebra', 'Vector Analysis']);
      fireEvent.click(screen.getByRole('radio', { name: 'Done 1' }));
      expect(names()).toEqual(['Calculus 1']);
      fireEvent.click(screen.getByRole('radio', { name: 'Weak 1' }));
      expect(names()).toEqual(['Algebra']);
      fireEvent.click(screen.getByRole('button', { name: /^EE: / }));
      expect(screen.getByText('No weak topics in this subject.')).toBeInTheDocument();
    } finally {
      TOPICS[0] = { ...TOPICS[0], read: false, drilled: false };
    }
  });

  it('sorts weakest first, and has no board-items sort', async () => {
    show();
    await screen.findByRole('button', { name: 'Algebra' });
    const names = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names()).toEqual(['Calculus 1', 'Algebra', 'Vector Analysis']);
    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'weakest' } });
    expect(names()).toEqual(['Algebra', 'Calculus 1', 'Vector Analysis']);
    expect(screen.queryByRole('option', { name: /board items/ })).not.toBeInTheDocument();
  });

  it('how coverage works is one tap away, not on the screen', async () => {
    show();
    await screen.findByRole('button', { name: 'Algebra' });
    expect(screen.queryByText(/A topic counts as covered/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'How coverage works' }));
    expect(screen.getByText(/A topic counts as covered/)).toHaveTextContent('Math 25%, ESAS 30%, EE 45%');
  });
});

describe('a topic’s sheet', () => {
  it('opens over the list with its mastery and accuracy, and waits for enough answers', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Calculus 1' }));
    let sheet = within(screen.getByRole('dialog', { name: 'Calculus 1' }));
    expect(sheet.getByText('Proficient')).toBeInTheDocument();
    expect(sheet.getByText('63%')).toBeInTheDocument();
    fireEvent.click(sheet.getByRole('button', { name: 'Close dialog' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Vector Analysis' }));
    sheet = within(await screen.findByRole('dialog', { name: 'Vector Analysis' }));
    // 2 of 2 right is too few answers to call 100%.
    expect(sheet.getByText('Accuracy').nextSibling).toHaveTextContent('—');
  });

  it('Back closes it, and the list and subject stay', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: /^EE: / }));
    fireEvent.click(screen.getByRole('button', { name: 'Power System Analysis' }));
    expect(screen.getByRole('dialog', { name: 'Power System Analysis' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('device-back'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 3, name: 'Power System Analysis' })).toBeInTheDocument();
  });

  it('a link opens the topic and the subject it names, and closing stays on the page', async () => {
    show(['/progress?tab=syllabus&subject=EE&topic=t-psa']);
    const sheet = await screen.findByRole('dialog', { name: 'Power System Analysis' });
    expect(screen.getByRole('button', { name: /^EE: / })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close dialog' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 3, name: 'Power System Analysis' })).toBeInTheDocument();
  });

  it('a link to a topic that isn’t there just shows the list', async () => {
    show(['/progress?tab=syllabus&topic=gone']);
    await screen.findByRole('button', { name: 'Algebra' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('a topic’s table of contents', () => {
  it('a tick saves the row’s full state against the suggested subtopic', async () => {
    show();
    const toc = await open('Algebra');
    fireEvent.click(await toc.findByRole('checkbox', { name: 'Functions' }));
    await waitFor(() => expect(writes(MINE)).toHaveLength(1));
    const [endpoint, method, body] = writes(MINE)[0];
    expect(endpoint).toBe(`${MINE}/a`);
    expect(method).toBe('PUT');
    expect(body).toMatchObject({ topicId: 't-alg', subtopicId: 'a', done: true, hidden: false, name: null, sortOrder: null });
    expect(body.doneOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(toc.getByRole('checkbox', { name: 'Functions' })).toBeChecked();
    expect(toc.getByText('1 of 2')).toBeInTheDocument();
  });

  it('finishing the last one ticks Read, and unticking later leaves it', async () => {
    mineRows = [{ id: 'a', topicId: 't-alg', subtopicId: 'a', done: true }];
    show();
    const toc = await open('Algebra');
    fireEvent.click(await toc.findByRole('checkbox', { name: 'Age Problems' }));
    await waitFor(() => expect(writes('/api/user/syllabus/t-alg')).toHaveLength(1));
    expect(writes('/api/user/syllabus/t-alg')[0][2]).toMatchObject({ read: true });
    fireEvent.click(toc.getByRole('checkbox', { name: 'Age Problems' }));
    await waitFor(() => expect(toc.getByRole('checkbox', { name: 'Age Problems' })).not.toBeChecked());
    expect(writes('/api/user/syllabus/t-alg')).toHaveLength(1);
  });

  it('Mark all sends the ones not done, in one request, and ticks Read', async () => {
    mineRows = [{ id: 'a', topicId: 't-alg', subtopicId: 'a', done: true }];
    show();
    const toc = await open('Algebra');
    await toc.findByRole('checkbox', { name: 'Age Problems' });
    fireEvent.click(toc.getByRole('button', { name: 'Mark all' }));
    await waitFor(() => expect(writes(`${MINE}/bulk`)).toHaveLength(1));
    expect(writes(`${MINE}/bulk`)[0][2].items.map((i) => i.id)).toEqual(['b']);
    await waitFor(() => expect(writes('/api/user/syllabus/t-alg')[0][2]).toMatchObject({ read: true }));
  });

  it('offline, a tick shows at once and queues', async () => {
    routeApi({ offline: true });
    show();
    const toc = await open('Algebra');
    fireEvent.click(await toc.findByRole('checkbox', { name: 'Functions' }));
    await waitFor(() => expect(useStore.getState().pendingWrites).toHaveLength(1));
    expect(useStore.getState().pendingWrites[0]).toMatchObject({ endpoint: `${MINE}/a`, method: 'PUT', body: { done: true } });
    expect(toc.getByRole('checkbox', { name: 'Functions' })).toBeChecked();
    expect(await screen.findByText('1 subtopic change saved on this device, waiting to sync.')).toBeInTheDocument();
  });

  it('follows a retired subtopic off the list, unless it was ticked', async () => {
    const retired = [sub('a', 't-alg', 'Functions', 0, false), sub('b', 't-alg', 'Age Problems', 1, false)];
    apiRequest.mockImplementation(async (endpoint) => {
      if (endpoint === '/api/config/subtopics') return { items: retired };
      if (endpoint === MINE) return { items: [{ id: 'a', topicId: 't-alg', subtopicId: 'a', done: true }] };
      return { weights: {}, topics: TOPICS };
    });
    show();
    const toc = await open('Algebra');
    expect(await toc.findByRole('checkbox', { name: 'Functions' })).toBeChecked();
    expect(toc.queryByRole('checkbox', { name: 'Age Problems' })).not.toBeInTheDocument();
  });
});

describe('Customize', () => {
  const customize = async () => {
    const toc = await open('Algebra');
    await toc.findByRole('checkbox', { name: 'Functions' });
    fireEvent.click(toc.getByRole('button', { name: 'Customize' }));
    return toc;
  };

  it('a switch turns a row off: still listed, out of the count, ticks kept', async () => {
    mineRows = [{ id: 'a', topicId: 't-alg', subtopicId: 'a', done: true }];
    show();
    const toc = await customize();
    fireEvent.click(toc.getByRole('switch', { name: 'Include Age Problems' }));
    await waitFor(() => expect(toc.getByRole('switch', { name: 'Include Age Problems' })).not.toBeChecked());
    expect(writes(MINE)[0][2]).toMatchObject({ hidden: true });
    expect(toc.getByText('1 of 1')).toBeInTheDocument();
    fireEvent.click(toc.getByRole('button', { name: 'Done' }));
    expect(toc.queryByRole('checkbox', { name: 'Age Problems' })).not.toBeInTheDocument();
    expect(toc.getByText('1 switched off.')).toBeInTheDocument();
  });

  it('adds their own, which alone can be deleted', async () => {
    show();
    const toc = await customize();
    expect(toc.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument();
    fireEvent.change(toc.getByLabelText('Add your own'), { target: { value: '  My sheet  ' } });
    fireEvent.click(toc.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(writes(MINE)).toHaveLength(1));
    expect(writes(MINE)[0][2]).toMatchObject({ topicId: 't-alg', subtopicId: null, name: 'My sheet' });
    fireEvent.click(await toc.findByRole('button', { name: 'Delete My sheet' }));
    await waitFor(() => expect(toc.queryByText('My sheet')).not.toBeInTheDocument());
    expect(writes(MINE).at(-1)[1]).toBe('DELETE');
  });

  it('renames a suggested row, and back to its name follows the list again', async () => {
    show();
    const toc = await customize();
    fireEvent.click(toc.getByRole('button', { name: 'Rename Functions' }));
    fireEvent.change(toc.getByLabelText(/^Name/), { target: { value: 'Graphs' } });
    fireEvent.click(toc.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(writes(MINE)[0][2]).toMatchObject({ name: 'Graphs', subtopicId: 'a' }));
    expect(await toc.findByText(/was Functions/)).toBeInTheDocument();
    fireEvent.click(toc.getByRole('button', { name: 'Rename Graphs' }));
    fireEvent.change(toc.getByLabelText(/^Name/), { target: { value: 'Functions' } });
    fireEvent.click(toc.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(writes(MINE).at(-1)[2]).toMatchObject({ name: null }));
  });

  it('moves a row, saving the whole topic’s order in one request', async () => {
    show();
    const toc = await customize();
    fireEvent.click(toc.getByRole('button', { name: 'Move Age Problems up' }));
    await waitFor(() => expect(writes(`${MINE}/bulk`)).toHaveLength(1));
    expect(writes(`${MINE}/bulk`)[0][2].items.map((i) => [i.id, i.sortOrder])).toEqual([['b', 0], ['a', 1]]);
    await waitFor(() => expect(toc.getByRole('list', { name: 'Algebra: customize' }).querySelector('li')).toHaveTextContent('Age Problems'));
  });

  it('Start blank switches the suggested rows off, and the suggested list brings them back, ticks and own rows kept', async () => {
    mineRows = [{ id: 'a', topicId: 't-alg', subtopicId: 'a', done: true, name: 'Renamed', sortOrder: 5 }, { id: 'own', topicId: 't-alg', subtopicId: null, name: 'Mine', createdAt: '2026-11-01' }];
    show();
    const toc = await open('Algebra');
    await toc.findByRole('checkbox', { name: /^Mine/ });
    fireEvent.click(toc.getByRole('button', { name: 'Customize' }));
    fireEvent.click(toc.getByRole('button', { name: 'Start blank' }));
    await waitFor(() => expect(writes(`${MINE}/bulk`)).toHaveLength(1));
    expect(writes(`${MINE}/bulk`)[0][2].items.map((i) => [i.id, i.hidden])).toEqual([['b', true], ['a', true]]);

    fireEvent.click(toc.getByRole('button', { name: 'Use the suggested list' }));
    await waitFor(() => expect(writes(`${MINE}/bulk`)).toHaveLength(2));
    const items = writes(`${MINE}/bulk`)[1][2].items;
    expect(items.find((i) => i.id === 'a')).toMatchObject({ hidden: false, name: null, sortOrder: null, done: true });
    expect(items.find((i) => i.id === 'own')).toMatchObject({ hidden: true, name: 'Mine' });
  });

  it('says so when a save is refused, and shows the row as it was', async () => {
    apiRequest.mockImplementation(async (endpoint, method = 'GET') => {
      if (endpoint === '/api/config/subtopics') return { items: PREMADE };
      if (endpoint === MINE && method === 'GET') return { items: [] };
      if (method === 'GET') return { weights: {}, topics: TOPICS };
      throw Object.assign(new Error('No such topic'), { status: 404 });
    });
    show();
    const toc = await customize();
    fireEvent.click(toc.getByRole('switch', { name: 'Include Functions' }));
    await waitFor(() => expect(toastFn.error).toHaveBeenCalledWith('Couldn’t save: No such topic'));
    expect(toc.getByRole('switch', { name: 'Include Functions' })).toBeChecked();
  });
});

describe('trackerModel', () => {
  it('accuracy waits for 5 answers, and for a copy with `correct`', () => {
    expect(model.accuracyOf({ attempts: 4, correct: 4 })).toBeNull();
    expect(model.accuracyOf({ attempts: 5, correct: 4 })).toBe(80);
    expect(model.accuracyOf({ attempts: 9 })).toBeNull();
  });

  it('weak is a Novice topic with at least 10 answers', () => {
    expect(model.isWeak({ masteryEffective: 0.2, attempts: 10 })).toBe(true);
    expect(model.isWeak({ masteryEffective: 0.2, attempts: 9 })).toBe(false);
    expect(model.isWeak({ masteryEffective: 0.5, attempts: 50 })).toBe(false);
    expect(model.isWeak({ masteryEffective: null, attempts: 50 })).toBe(false);
  });

  it('the filters split a subject by coverage and weakness', () => {
    const rows = [
      { topicId: 'covered', read: true, drilled: true },
      { topicId: 'weak', masteryEffective: 0.2, attempts: 10 },
      { topicId: 'new' },
    ];
    const ids = (filter) => model.filterTopics(rows, filter).map((r) => r.topicId);
    expect(ids('all')).toEqual(['covered', 'weak', 'new']);
    expect(ids('todo')).toEqual(['weak', 'new']);
    expect(ids('done')).toEqual(['covered']);
    expect(ids('weak')).toEqual(['weak']);
    expect(ids('nonsense')).toEqual(['covered', 'weak', 'new']);
    expect(model.filterTopics(null, 'all')).toEqual([]);
  });

  it('least done puts topics with no list last', () => {
    const rows = [{ topicId: 'none' }, { topicId: 'half' }, { topicId: 'zero' }];
    const progress = { none: { done: 0, total: 0 }, half: { done: 1, total: 2 }, zero: { done: 0, total: 5 } };
    expect(model.sortTopics(rows, 'least', (id) => progress[id]).map((r) => r.topicId)).toEqual(['zero', 'half', 'none']);
  });
});

describe('drilling one subtopic', () => {
  function PracticeProbe() {
    const { state } = useLocation();
    return <p>practice: {JSON.stringify(state?.preset)}</p>;
  }

  it('a subtopic with enough tagged questions shows them, your accuracy, and a Drill', async () => {
    const tagged = PREMADE.map((s) => ({ ...s, questions: s.id === 'a' ? 14 : 3 }));
    apiRequest.mockImplementation(async (endpoint, method = 'GET', body) => {
      if (endpoint === '/api/config/subtopics') return { items: tagged };
      if (endpoint.startsWith(`${MINE}/accuracy`)) return { items: [{ subtopicId: 'a', answered: 8, correct: 6 }] };
      if (endpoint === MINE && method === 'GET') return { items: mineRows };
      if (method === 'GET') return { weights: { Mathematics: 0.25, ESAS: 0.3, EE: 0.45 }, topics: TOPICS };
      return { item: body };
    });
    render(
      <MemoryRouter initialEntries={['/progress?tab=syllabus']}>
        <Routes>
          <Route path="/progress" element={<SyllabusTab />} />
          <Route path="/practice" element={<PracticeProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    const contents = await open('Algebra');
    expect(await contents.findByText('14 questions · 75% of 8')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith(`${MINE}/accuracy?topicId=t-alg`);
    // Three tagged questions aren't a set: no Drill for Age Problems.
    expect(contents.queryByRole('button', { name: 'Drill Age Problems' })).not.toBeInTheDocument();
    fireEvent.click(contents.getByRole('button', { name: 'Drill Functions' }));
    const preset = JSON.parse((await screen.findByText(/^practice:/)).textContent.slice('practice: '.length));
    expect(preset).toMatchObject({ studyMode: 'subtopic', subject: 'Mathematics', subtopic: 'Algebra', subtopicId: 'a', subtopicName: 'Functions', source: 'library' });
  });
});
