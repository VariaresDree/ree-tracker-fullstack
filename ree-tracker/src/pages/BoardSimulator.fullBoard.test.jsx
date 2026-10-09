// Full PRC board orchestration on the Board Simulator page: sections run one
// at a time on one session, results are withheld between sections, and the
// board result appears after the last.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../layouts/MainLayout', () => ({ default: ({ children }) => <div data-testid="main">{children}</div> }));
vi.mock('../layouts/ExamLayout', () => ({ default: ({ children }) => <div data-testid="exam">{children}</div> }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
vi.mock('../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
vi.mock('../hooks/useBattleSocket', () => ({ useBattleSocket: () => ({ connected: false, opponentProgress: [] }) }));
vi.mock('../services/dbQueries', () => ({ getAnalyticsProfile: vi.fn(), hideExamSession: vi.fn().mockResolvedValue({}) }));
vi.mock('../features/board-simulator/SimulatorConfig', () => ({ default: () => <div>config-screen</div> }));
vi.mock('../features/board-simulator/SimulatorActive', () => ({ default: () => <div>exam-review</div> }));
vi.mock('../features/board-simulator/SimulatorDiagnostics', () => ({
  default: ({ headingLevel = 1 }) => { const H = `h${headingLevel}`; return <H>section-diagnostics</H>; },
}));

let engine;
vi.mock('../features/board-simulator/useSimulatorEngine', () => ({ useSimulatorEngine: () => engine }));

const { default: BoardSimulator } = await import('./BoardSimulator');
const { startFullBoard, recordSection } = await import('../features/board-simulator/fullBoard');

const baseEngine = (over = {}) => ({
  config: {},
  session: { isActive: false, isFinished: false, answers: {}, questions: [], diagnostics: null, loading: false },
  hasSavedSession: false,
  startSimulation: vi.fn(),
  resumeSimulation: vi.fn(),
  setSession: vi.fn(),
  resetToSetup: vi.fn(),
  savedDraftMeta: vi.fn(() => null),
  ...over,
});

const renderPage = (entries = ['/simulator']) => render(<MemoryRouter initialEntries={entries}><BoardSimulator /></MemoryRouter>);

beforeEach(() => localStorage.clear());

describe('Board Simulator — full PRC board', () => {
  it('an unfinished board leaves setup usable, and continues on the same session when asked', () => {
    let board = startFullBoard('board-1');
    recordSection(board, 0, { correct: 60, total: 100, answered: 98, timeTakenSecs: 15000 });
    engine = baseEngine();
    renderPage();

    // It used to replace setup for up to a week, ignoring a format picked on
    // the Exams hub. Setup shows, with a banner.
    expect(screen.getByText('config-screen')).toBeInTheDocument();
    expect(screen.getByText('You have a full PRC board in progress')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue the board' }));
    expect(screen.getByText('Section 1 of 3 complete')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start ESAS (4h)' }));
    expect(engine.startSimulation).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'ESAS', count: 100, fullBoard: { sessionId: 'board-1', sectionIndex: 1 },
    }));
  });

  it('withholds a mid-board section result: no diagnostics, no answer review', () => {
    let board = startFullBoard('board-1');
    recordSection(board, 0, { correct: 60, total: 100, timeTakenSecs: 15000 });
    engine = baseEngine({
      config: { fullBoard: { sessionId: 'board-1', sectionIndex: 0 } },
      session: { isActive: true, isFinished: true, answers: {}, questions: [], diagnostics: { score: 60 } },
    });
    renderPage();
    expect(screen.getByText('Section 1 of 3 complete')).toBeInTheDocument();
    expect(screen.queryByText('section-diagnostics')).not.toBeInTheDocument();
    expect(screen.queryByText('exam-review')).not.toBeInTheDocument();
  });

  it('after the last section, shows the board result on the PRC rule', () => {
    let board = startFullBoard('board-1');
    board = recordSection(board, 0, { correct: 40, total: 100, timeTakenSecs: 15000 });
    board = recordSection(board, 1, { correct: 80, total: 100, timeTakenSecs: 12000 });
    recordSection(board, 2, { correct: 80, total: 100, timeTakenSecs: 18000 });
    engine = baseEngine({
      config: { fullBoard: { sessionId: 'board-1', sectionIndex: 2 } },
      session: { isActive: true, isFinished: true, answers: {}, questions: [], diagnostics: { score: 80 } },
    });
    renderPage();
    expect(screen.getByText('Full PRC board result')).toBeInTheDocument();
    // One h1: the board result. The last section's diagnostics step down.
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Full PRC board result']);
    expect(screen.getByRole('heading', { level: 2, name: 'section-diagnostics' })).toBeInTheDocument();
    expect(screen.getByText('70.0%')).toBeInTheDocument();
    expect(screen.getByText('CONDITIONAL PASS')).toBeInTheDocument();
    expect(screen.getByText(/under the 50% floor/)).toBeInTheDocument();
  });

  it('abandoning keeps finished sections in analytics but drops the board', () => {
    startFullBoard('board-1');
    engine = baseEngine();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Continue the board' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abandon this sitting' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abandon' }));
    expect(localStorage.getItem('ree_full_board')).toBeNull();
    expect(engine.resetToSetup).toHaveBeenCalled();
    expect(screen.getByText('config-screen')).toBeInTheDocument();
    expect(screen.queryByText('You have a full PRC board in progress')).not.toBeInTheDocument();
  });

  it('offers to resume only the board’s own section, not any mock left on the device', () => {
    startFullBoard('board-1');
    engine = baseEngine({ hasSavedSession: true, savedDraftMeta: vi.fn(() => ({ fullBoard: null, source: 'library' })) });
    const { unmount } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Continue the board' }));
    expect(screen.queryByRole('button', { name: 'Resume the section in progress' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Start Math/ })).toBeInTheDocument();
    unmount();

    engine = baseEngine({ hasSavedSession: true, savedDraftMeta: vi.fn(() => ({ fullBoard: { sessionId: 'board-1', sectionIndex: 0 } })) });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Continue the board' }));
    expect(screen.getByRole('button', { name: 'Resume the section in progress' })).toBeInTheDocument();
  });
});

describe('Board Simulator — layout', () => {
  it('a running exam is in the exam layout; its results are not', () => {
    engine = baseEngine({ session: { isActive: true, isFinished: false, answers: {}, questions: [], diagnostics: null } });
    const { unmount } = renderPage();
    expect(screen.getByTestId('exam')).toBeInTheDocument();
    expect(screen.queryByTestId('main')).not.toBeInTheDocument();
    unmount();

    // Finished: the red "exam in progress" banner used to stay up over the results.
    engine = baseEngine({ session: { isActive: true, isFinished: true, answers: {}, questions: [], diagnostics: { score: 70 } } });
    renderPage();
    expect(screen.getByTestId('main')).toBeInTheDocument();
    expect(screen.queryByTestId('exam')).not.toBeInTheDocument();
    expect(screen.getByText('section-diagnostics')).toBeInTheDocument();
  });

  it('setup has the app chrome', () => {
    engine = baseEngine();
    renderPage();
    expect(screen.getByTestId('main')).toBeInTheDocument();
  });
});

describe('Board Simulator — retake of a past sitting', () => {
  const questions = [{ id: 'q1', subject: 'EE', text: 'Q1', options: ['A', 'B'], answer: 'A' }, { id: 'q2', subject: 'EE', text: 'Q2', options: ['A', 'B'], answer: 'B' }];

  it('starts a timed retake of exactly those questions', () => {
    engine = baseEngine();
    renderPage([{ pathname: '/simulator', state: { retake: { ownerUid: 'u1', sourceSessionId: 's1', questions } } }]);
    expect(engine.startSimulation).toHaveBeenCalledWith(expect.objectContaining({
      source: 'retake', subject: 'EE', count: 2, retakeQuestions: questions, retake: { sourceSessionId: 's1' },
    }));
  });

  it('ignores a retake handed over for another account', () => {
    engine = baseEngine();
    renderPage([{ pathname: '/simulator', state: { retake: { ownerUid: 'someone-else', questions } } }]);
    expect(engine.startSimulation).not.toHaveBeenCalled();
  });
});
