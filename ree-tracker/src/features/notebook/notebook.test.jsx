// Library › Notebook: the mistake notebook and personal notes.
//   - a note saved in one place shows everywhere at once (one shared copy),
//     queued offline, put back when the server refuses it;
//   - mistakes come from the server; a cause tag shows at once and is sent as
//     the full tag state; Mark fixed / Reopen; filters; Practise these;
//   - the top line says what most tagged misses come down to.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../../config/firebaseDb', () => ({ auth: { currentUser: { uid: 'user-A' } } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'user-A' } }) }));
const apiRequest = vi.fn();
vi.mock('../../services/dbQueries', () => ({ apiRequest: (...a) => apiRequest(...a) }));
const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
}));
const toastFn = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toastFn }));
vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../../components/SmartText', () => ({ default: ({ text }) => <span>{text}</span> }));
vi.mock('../quiz/SolutionPanel', () => ({ default: () => <p>solution panel</p> }));
vi.mock('../quiz/useAiExplanation', () => ({ useAiExplanation: () => ({ textFor: () => null, isLoading: () => false, explain: vi.fn() }) }));

const { useStore } = await import('../../store/useStore');
const { __resetNotes, overlayQueuedNotes, withNote } = await import('./notesStore');
const { __resetMistakesMemory, withTag } = await import('./useMistakes');
const { causeSummary } = await import('./causeSummary');
const { default: NoteButton, NoteView } = await import('./NoteButton');
const { default: MistakesPanel } = await import('./MistakesPanel');
const { default: NotesPanel } = await import('./NotesPanel');

let practiceState;
function PracticeProbe() {
  practiceState = useLocation().state;
  return <p>practice-page</p>;
}
const renderAt = (ui) => render(
  <MemoryRouter>
    <Routes>
      <Route path="/" element={ui} />
      <Route path="/practice" element={<PracticeProbe />} />
    </Routes>
  </MemoryRouter>,
);

const mistake = (questionId, over = {}) => ({
  questionId, subject: 'EE', topic: 'Machines', text: `Question ${questionId}`, options: ['A', 'B'], correctAnswer: 'A',
  explanation: 'Why', type: null, lastAnswer: 'B', confidence: 'MED', timeSpentMs: 60_000, timesWrong: 1,
  lastWrongAt: '2026-10-05T03:00:00.000Z', lastCorrectAt: null, cause: null, suggestedCause: null, resolvedAt: null, fixed: false, ...over,
});

beforeEach(() => {
  apiRequest.mockReset();
  idbMem.clear();
  toastFn.error.mockClear();
  __resetNotes();
  __resetMistakesMemory();
  useStore.setState({ pendingWrites: [], ownerUid: 'user-A' });
});

describe('notes', () => {
  it('lays queued notes over the list, the newest per note, deleting an emptied one', () => {
    const items = [{ targetType: 'question', targetId: 'q1', body: 'old', target: { title: 'Q1' } }];
    const writes = [
      { method: 'PUT', endpoint: '/api/user/notes/question/q1', body: { body: 'newer' }, ownerUid: 'user-A' },
      { method: 'PUT', endpoint: '/api/user/notes/card/c%201', body: { body: 'card note' }, ownerUid: 'user-A' },
      { method: 'PUT', endpoint: '/api/user/notes/question/q9', body: { body: 'someone else' }, ownerUid: 'user-B' },
    ];
    const out = overlayQueuedNotes(items, writes, 'user-A');
    expect(out.map((n) => [n.targetId, n.body])).toEqual([['c 1', 'card note'], ['q1', 'newer']]);
    expect(out.find((n) => n.targetId === 'q1').target).toEqual({ title: 'Q1' });
    expect(overlayQueuedNotes(items, [{ method: 'PUT', endpoint: '/api/user/notes/question/q1', body: { body: '  ' }, ownerUid: 'user-A' }], 'user-A')).toEqual([]);
    expect(withNote(items, 'question', 'q1', null)).toEqual([]);
  });

  it('a note saved from the button shows under the solution at once, and is sent as its whole text', async () => {
    apiRequest.mockImplementation(async (endpoint, method, body) => {
      if (!method) return { items: [] };
      return { item: { targetType: 'question', targetId: 'q1', body: body.body } };
    });
    render(
      <>
        <NoteButton type="question" targetId="q1" target={{ title: 'Q1' }} />
        <NoteView type="question" targetId="q1" />
      </>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Add a note' }));
    fireEvent.change(screen.getByLabelText(/Your note on this question/), { target: { value: '  Draw the phasor first.  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));

    expect(await screen.findByText('Draw the phasor first.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit your note' })).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/api/user/notes/question/q1', 'PUT', { body: 'Draw the phasor first.' });
  });

  it('puts the note back when the server refuses it', async () => {
    apiRequest.mockImplementation(async (endpoint, method) => {
      if (!method) return { items: [{ targetType: 'card', targetId: 'c1', body: 'keep me', updatedAt: '2026-10-01' }] };
      throw Object.assign(new Error('nope'), { status: 400 });
    });
    render(<NoteView type="card" targetId="c1" />);
    expect(await screen.findByText('keep me')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText(/Your note on this formula card/), { target: { value: 'changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    await waitFor(() => expect(toastFn.error).toHaveBeenCalled());
    expect(screen.getByText('keep me')).toBeInTheDocument();
  });

  it('My notes lists every note with what it is on, and filters by kind', async () => {
    apiRequest.mockResolvedValue({
      items: [
        { targetType: 'question', targetId: 'q1', body: 'Per-unit first', updatedAt: '2026-10-05T00:00:00Z', target: { subject: 'EE', topic: 'Power', title: 'A 100 MVA system…' } },
        { targetType: 'card', targetId: 'c1', body: 'Units!', updatedAt: '2026-10-04T00:00:00Z', target: { subject: 'EE', topic: null, title: 'Capacitive reactance (X_c)', name: 'Capacitive reactance' } },
      ],
    });
    renderAt(<NotesPanel isOnline />);
    expect(await screen.findByText('Per-unit first')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open card' })).toHaveAttribute('href', '/library?tab=formulas');
    fireEvent.click(screen.getByRole('radio', { name: /Formula cards 1/ }));
    expect(screen.queryByText('Per-unit first')).not.toBeInTheDocument();
    expect(screen.getByText('Units!')).toBeInTheDocument();
  });
});

describe('mistakes', () => {
  it('recomputes Fixed when marked, and when unmarked', () => {
    const m = mistake('q1');
    const marked = withTag(m, { cause: 'time', resolved: true }, new Date('2026-10-06T00:00:00Z'));
    expect(marked).toMatchObject({ cause: 'time', resolvedAt: '2026-10-06T00:00:00.000Z', fixed: true });
    expect(withTag(marked, { cause: 'time', resolved: false })).toMatchObject({ resolvedAt: null, fixed: false });
  });

  it('says what most tagged misses come down to, once there are three', () => {
    expect(causeSummary([mistake('a', { cause: 'time' }), mistake('b', { cause: 'time' })])).toBeNull();
    expect(causeSummary(['time', 'time', 'concept'].map((cause, i) => mistake(`q${i}`, { cause })))).toBe('Most of your tagged misses are running out of time (2 of 3).');
    expect(causeSummary(['time', 'concept', 'misread', 'computation'].map((cause, i) => mistake(`q${i}`, { cause })))).toMatch(/spread out/);
  });

  it('lists open mistakes, tags a cause at once, and practises the ones on screen', async () => {
    apiRequest.mockImplementation(async (endpoint, method, body) => {
      if (!method) {
        return { items: [mistake('q1', { suggestedCause: 'concept', confidence: 'HIGH' }), mistake('q2', { subject: 'Mathematics' }), mistake('q3', { fixed: true, lastCorrectAt: '2026-10-06T00:00:00Z' })], truncated: false };
      }
      return { item: { questionId: 'q1', ...body } };
    });
    renderAt(<MistakesPanel currentUser={{ uid: 'user-A' }} isOnline />);
    expect(await screen.findByText('Question q1')).toBeInTheDocument();
    expect(screen.getByText('Question q2')).toBeInTheDocument();
    expect(screen.queryByText('Question q3')).not.toBeInTheDocument(); // fixed
    expect(screen.getByText(/2 open · 1 fixed/)).toBeInTheDocument();

    const card = screen.getByText('Question q1').closest('li');
    const concept = within(card).getByRole('button', { name: /Concept/ });
    expect(concept).toHaveTextContent('suggested');
    fireEvent.click(within(card).getByRole('button', { name: /Computation/ }));
    expect(within(card).getByRole('button', { name: /Computation/ })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/user/mistakes/q1', 'PUT', { cause: 'computation', resolved: false }));

    fireEvent.click(screen.getByRole('radio', { name: /^Math/ }));
    expect(screen.queryByText('Question q1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Practise these/ }));
    expect(await screen.findByText('practice-page')).toBeInTheDocument();
    expect(practiceState.preset.items.map((q) => q.id)).toEqual(['q2']);
  });

  it('marks a mistake fixed, and it moves to Fixed', async () => {
    apiRequest.mockImplementation(async (endpoint, method, body) => (method ? { item: { questionId: 'q1', ...body } } : { items: [mistake('q1')], truncated: false }));
    renderAt(<MistakesPanel currentUser={{ uid: 'user-A' }} isOnline />);
    fireEvent.click(await screen.findByRole('button', { name: /Mark fixed/ }));
    expect(screen.queryByText('Question q1')).not.toBeInTheDocument();
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/user/mistakes/q1', 'PUT', { cause: null, resolved: true }));
    fireEvent.click(screen.getByRole('radio', { name: /Fixed 1/ }));
    expect(screen.getByRole('button', { name: /Reopen/ })).toBeInTheDocument();
  });

  it('explains an empty notebook', async () => {
    apiRequest.mockResolvedValue({ items: [], truncated: false });
    renderAt(<MistakesPanel currentUser={{ uid: 'user-A' }} isOnline />);
    expect(await screen.findByText('No mistakes yet')).toBeInTheDocument();
  });
});
