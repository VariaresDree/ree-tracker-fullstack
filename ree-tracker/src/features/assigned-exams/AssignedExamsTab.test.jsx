// src/features/assigned-exams/AssignedExamsTab.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { apiRequest, createMultiplayerBattle } from '../../services/dbQueries';
import AssignedExamsTab from './AssignedExamsTab';
import { __resetAssignedExamList } from './assignedExamsApi';
import { retakeConfig } from '../exams/review/retake';

vi.mock('../../services/dbQueries', () => ({ apiRequest: vi.fn(), createMultiplayerBattle: vi.fn() }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));

const exam = (over = {}) => ({
  id: 'x1', title: 'EE prelim, week 3', description: 'Circuits 1 and Machinery 1.', subject: 'EE', itemCount: 40,
  timeLimitSecs: 8640, publishedAt: '2026-11-20T03:00:00Z', mine: null, class: null, ...over,
});
const run = { id: 'x1', title: 'EE prelim, week 3', timeLimitSecs: 8640, questions: [{ id: 'q1', subject: 'EE', subtopic: null, text: 'Find P', options: ['1', '2'], answer: '2', fixedExplanation: 'P = VI' }] };

// The simulator stub shows the router state it was opened with.
function Simulator() {
  return <pre data-testid="simulator-state">{JSON.stringify(useLocation().state)}</pre>;
}
const simulatorState = () => JSON.parse(screen.getByTestId('simulator-state').textContent);
const renderTab = () => render(
  <MemoryRouter initialEntries={['/exams?tab=assigned']}>
    <Routes>
      <Route path="/exams" element={<AssignedExamsTab />} />
      <Route path="/simulator" element={<Simulator />} />
      <Route path="/battle/:id" element={<p>battle lobby</p>} />
    </Routes>
  </MemoryRouter>,
);

let items;
beforeEach(() => {
  __resetAssignedExamList();
  vi.clearAllMocks();
  items = [exam(), exam({ id: 'x2', title: 'Mixed mock', subject: 'Mixed', mine: { attempts: 2, best: 78, first: 64 }, class: { average: 66, takers: 5 } })];
  apiRequest.mockImplementation(async (url) => (url.endsWith('/questions') ? run : { items }));
});

describe('Exams › Assigned', () => {
  it('shows each posted exam: subject, size, time, note, and whether this learner has sat it', async () => {
    renderTab();
    const fresh = (await screen.findByText('EE prelim, week 3')).closest('article');
    expect(within(fresh).getByText('New')).toBeInTheDocument();
    expect(fresh).toHaveTextContent('40 items · 2 h 24 min · posted');
    expect(within(fresh).getByText('Circuits 1 and Machinery 1.')).toBeInTheDocument();
    expect(within(fresh).getByRole('button', { name: 'Take exam' })).toBeInTheDocument();

    const sat = screen.getByText('Mixed mock').closest('article');
    expect(within(sat).getByText('Best 78% · 2 tries')).toBeInTheDocument();
    expect(within(sat).getByText('Mixed subjects')).toBeInTheDocument();
    expect(within(sat).getByText('Class average 66% · 5 took it')).toBeInTheDocument();
    expect(within(sat).getByRole('button', { name: 'Take again' })).toBeInTheDocument();
  });

  it('says what the sitting is before it starts, then runs it in the simulator with its own time', async () => {
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Take exam' }));
    const sheet = screen.getByRole('dialog', { name: 'Before you start' });
    expect(sheet).toHaveTextContent('40 items');
    expect(sheet).toHaveTextContent('Pass mark 70%');
    expect(sheet).toHaveTextContent('Answers and explanations show after you submit.');
    expect(sheet).toHaveTextContent('Your reviewer sees your first attempt');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Start' }));
    expect(await screen.findByTestId('simulator-state')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/api/assigned-exams/x1/questions', 'GET', null, expect.anything());
    expect(simulatorState().retake).toMatchObject({
      ownerUid: 'u1', kind: 'assigned', assigned: { id: 'x1', title: 'EE prelim, week 3', timeLimitSecs: 8640 },
    });
    expect(simulatorState().retake.questions[0]).toMatchObject({ id: 'q1', question: 'Find P', explanation: 'P = VI', subtopic: 'General' });
  });

  it('keeps the sheet open with the reason when the exam can’t be opened', async () => {
    apiRequest.mockImplementation(async (url) => {
      if (url.endsWith('/questions')) throw Object.assign(new Error('You’re in a battle with some of these questions. Finish it first.'), { status: 409 });
      return { items };
    });
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: 'Take exam' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Finish it first');
    expect(screen.queryByTestId('simulator-state')).toBeNull();
  });

  it('hosts a battle on the exam and opens its lobby', async () => {
    createMultiplayerBattle.mockResolvedValue('ABC123');
    renderTab();
    const card = (await screen.findByText('EE prelim, week 3')).closest('article');
    fireEvent.click(within(card).getByRole('button', { name: 'Battle with friends' }));
    expect(await screen.findByText('battle lobby')).toBeInTheDocument();
    expect(createMultiplayerBattle).toHaveBeenCalledWith({ mode: 'assigned', assignedExamId: 'x1' }, 8640);
  });

  it('says why a battle couldn’t be hosted', async () => {
    createMultiplayerBattle.mockRejectedValue(new Error('Question pool unavailable for that configuration.'));
    renderTab();
    const card = (await screen.findByText('EE prelim, week 3')).closest('article');
    fireEvent.click(within(card).getByRole('button', { name: 'Battle with friends' }));
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Question pool unavailable for that configuration.'));
    expect(within(card).getByRole('button', { name: 'Battle with friends' })).toBeEnabled();
  });

  it('shows exams it can’t start yet, or any more, after the open ones, without a way in', async () => {
    items = [
      exam({ id: 'c', title: 'Closed one', availability: 'closed', closesAt: '2026-11-20T09:00:00Z', mine: { attempts: 1, best: 55, first: 55 } }),
      exam({ id: 'l', title: 'Locked one', availability: 'locked' }),
      exam({ id: 'u', title: 'Upcoming one', availability: 'upcoming', opensAt: '2026-11-28T00:00:00Z' }),
      exam({ id: 'o', title: 'Open one', availability: 'open', closesAt: '2026-11-30T09:00:00Z' }),
    ];
    renderTab();
    await screen.findByText('Open one');
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Open one', 'Upcoming one', 'Locked one', 'Closed one']);
    const card = (title) => screen.getByText(title).closest('article');
    expect(card('Open one')).toHaveTextContent(/Closes /);
    expect(within(card('Upcoming one')).getByText('Not open yet')).toBeInTheDocument();
    expect(card('Upcoming one')).toHaveTextContent(/Opens /);
    expect(within(card('Locked one')).getByText('Your reviewer has locked it for now.')).toBeInTheDocument();
    expect(within(card('Closed one')).getByText('Best 55% · 1 try')).toBeInTheDocument();
    for (const t of ['Upcoming one', 'Locked one', 'Closed one']) expect(within(card(t)).queryByRole('button')).toBeNull();
    expect(within(card('Open one')).getByRole('button', { name: 'Take exam' })).toBeInTheDocument();
  });

  it('says so when nothing is posted yet', async () => {
    items = [];
    renderTab();
    expect(await screen.findByText('No assigned exams yet')).toBeInTheDocument();
  });

  it('offers another try when the list won’t load', async () => {
    apiRequest.mockRejectedValueOnce(new Error('[OFFLINE]'));
    renderTab();
    expect(await screen.findByText(/You’re offline/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Mixed mock')).toBeInTheDocument();
  });
});

describe('retakeConfig for an assigned exam', () => {
  const questions = [{ id: 'q1', subject: 'EE' }];
  it('carries the exam and its time, and names the sitting Assigned', () => {
    const cfg = retakeConfig({ battleId: 'OLD' }, { questions, kind: 'assigned', assigned: { id: 'x1', title: 'T', timeLimitSecs: 600 } });
    expect(cfg.retake).toEqual({ sourceSessionId: null, kind: 'assigned', assignedExamId: 'x1', title: 'T', timeLimitSecs: 600 });
    expect(cfg.battleId).toBeUndefined();
  });
  it('a retake of its misses is an ordinary retake, at the board’s pace', () => {
    const cfg = retakeConfig({ retake: { kind: 'assigned', assignedExamId: 'x1', timeLimitSecs: 600 } }, { questions });
    expect(cfg.retake).toEqual({ sourceSessionId: null, kind: 'retake' });
  });
});
