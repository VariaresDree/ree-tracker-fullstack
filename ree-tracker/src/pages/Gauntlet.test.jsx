// The Gauntlet page: which chrome each screen gets, Submit (always in the
// toolbar, through the dialog that lists unanswered items), Leave (counts as
// not passing, so it forfeits), a saved run (resume or submit as it stands —
// no "start fresh" around the lock), and Try again after a refused grade.
// The engine is mocked (its behaviour is in useGauntletEngine.test.jsx).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Gauntlet from './Gauntlet';

const makeQuestions = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `q-${i}`,
    text: `Question ${i}`,
    question: `Question ${i}`,
    options: ['A', 'B', 'C', 'D'],
    answer: 'A',
  }));

let engineState;
vi.mock('../components/PomodoroOwner', () => ({ default: () => null }));
vi.mock('../features/gauntlet/useGauntletEngine', () => ({
  useGauntletEngine: () => engineState,
}));

// jsdom doesn't implement Element.scrollTo — ExamNavigator calls it to keep
// the active item in view. Harmless no-op stub, same pattern as the
// window.matchMedia stub in src/test/setup.js.
if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollTo) {
  window.HTMLElement.prototype.scrollTo = () => {};
}

vi.mock('../features/gauntlet/GauntletDiagnostics', () => ({
  default: () => <div>diagnostics</div>,
}));
// The two chromes, told apart: the app shell for every screen with no clock
// running, the exam layout only for the run itself.
vi.mock('../layouts/MainLayout', () => ({ default: ({ children }) => <div data-testid="app-chrome">{children}</div> }));
vi.mock('../layouts/ExamLayout', () => ({ default: ({ children }) => <div data-testid="exam-chrome">{children}</div> }));

function PathProbe() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}

function renderAtIndex(index, total = 3, status = 'active', extra = {}) {
  engineState = {
    status,
    questions: makeQuestions(total),
    answers: {},
    confidences: {},
    gauntletEndTime: Date.now() + 600_000,
    diagnostics: status === 'diagnostics' ? { scorePct: 80 } : null,
    currentIndex: index,
    setCurrentIndex: vi.fn(),
    bookmarks: new Set(),
    toggleBookmark: vi.fn(),
    flags: new Set(),
    toggleFlag: vi.fn(),
    resumeGauntlet: vi.fn(),
    submitSavedRun: vi.fn(),
    forfeitRun: vi.fn(),
    handleAnswer: vi.fn(),
    handleConfidence: vi.fn(),
    submitExam: vi.fn(),
    ...extra,
  };

  return render(
    <MemoryRouter initialEntries={['/gauntlet/1']}>
      <Routes>
        <Route path="/gauntlet/:level" element={<Gauntlet />} />
        <Route path="*" element={<PathProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  engineState = null;
});

describe('Gauntlet — a tier that can’t load', () => {
  it('offline, it says the tier needs a connection', () => {
    renderAtIndex(0, 3, 'error', { errorKind: 'offline' });
    expect(screen.getByText('This tier needs a connection')).toBeInTheDocument();
    expect(screen.queryByText("Couldn't build this exam")).toBeNull();
  });

  it('any other failure keeps the plain message', () => {
    renderAtIndex(0, 3, 'error', { errorKind: null });
    expect(screen.getByText("Couldn't build this exam")).toBeInTheDocument();
  });
});

describe('Gauntlet — layouts', () => {
  it.each(['loading', 'resume', 'submitting', 'pending', 'submit-error', 'error', 'diagnostics'])('the %s screen has the app chrome, not the exam banner', (status) => {
    renderAtIndex(0, 3, status);
    expect(screen.getByTestId('app-chrome')).toBeInTheDocument();
    expect(screen.queryByTestId('exam-chrome')).not.toBeInTheDocument();
  });

  it('a running exam is distraction-free', () => {
    renderAtIndex(0, 3);
    expect(screen.getByTestId('exam-chrome')).toBeInTheDocument();
    expect(screen.queryByTestId('app-chrome')).not.toBeInTheDocument();
  });
});

describe('Gauntlet — the same tools as the mock', () => {
  it('has a scratchpad', () => {
    renderAtIndex(0, 3);
    fireEvent.click(screen.getByRole('button', { name: 'Open scratchpad' }));
    expect(screen.getByRole('dialog', { name: 'Scratchpad' })).toBeInTheDocument();
  });

  it('has no calculator: a timed exam keeps the scratchpad only', () => {
    renderAtIndex(0, 3);
    expect(screen.queryByRole('button', { name: 'Open calculator and units' })).not.toBeInTheDocument();
  });

  it('marks an item for review, by button or M, and the submit dialog lists it', () => {
    const toggleMarked = vi.fn();
    renderAtIndex(1, 3, 'active', { toggleMarked, marked: new Set([2]) });
    fireEvent.click(screen.getByRole('button', { name: 'Mark for review (M)' }));
    expect(toggleMarked).toHaveBeenCalledWith(1);
    fireEvent.keyDown(window, { key: 'm' });
    expect(toggleMarked).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: /submit exam/i }));
    expect(within(screen.getByRole('dialog', { name: 'Submit this exam?' })).getByText(/item is marked for review/)).toBeInTheDocument();
  });

  it('left and right change the item, once, and stop at the ends', () => {
    renderAtIndex(0, 3);
    const options = within(screen.getByRole('radiogroup', { name: 'Answer choices' })).getAllByRole('radio');
    options[0].focus();
    fireEvent.keyDown(options[0], { key: 'ArrowRight' });
    expect(engineState.setCurrentIndex).toHaveBeenCalledTimes(1);
    expect(engineState.setCurrentIndex).toHaveBeenCalledWith(1);
    expect(document.activeElement).toBe(options[0]);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(engineState.setCurrentIndex).toHaveBeenCalledTimes(1);
  });

  it('keys wait while the scratchpad is open', () => {
    renderAtIndex(0, 3);
    fireEvent.click(screen.getByRole('button', { name: 'Open scratchpad' }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(engineState.setCurrentIndex).not.toHaveBeenCalled();
  });
});

describe('Gauntlet — Submit', () => {
  it('is in reach from the first item, and asks first with the unanswered items', () => {
    renderAtIndex(0, 3, 'active', { answers: { 1: 'B' } });
    expect(screen.getByRole('button', { name: /^next$/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /submit exam/i }));
    const dialog = screen.getByRole('dialog', { name: 'Submit this exam?' });
    expect(within(dialog).getByText(/items are left blank/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Go to item 1' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Go to item 3' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Go to item 2' })).not.toBeInTheDocument();
    expect(engineState.submitExam).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Submit exam' }));
    expect(engineState.submitExam).toHaveBeenCalledTimes(1);
  });

  it('a jump link in the dialog goes to that item', () => {
    renderAtIndex(0, 3);
    fireEvent.click(screen.getByRole('button', { name: /submit exam/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Go to item 3' }));
    expect(engineState.setCurrentIndex).toHaveBeenCalledWith(2);
    expect(engineState.submitExam).not.toHaveBeenCalled();
  });

  it('on the last item Next is off, and Submit is still there', () => {
    renderAtIndex(2, 3);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: /submit exam/i })).toHaveLength(1);
  });
});

describe('Gauntlet — leaving a run', () => {
  it('says leaving counts as not passing, then forfeits the run and returns to the ladder', () => {
    renderAtIndex(0, 3);
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    const dialog = screen.getByRole('dialog', { name: 'Leave this run?' });
    expect(dialog).toHaveTextContent(/counts as not passing/);
    expect(dialog).toHaveTextContent(/locks the Gauntlet for 12 hours/);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep working' }));
    expect(engineState.forfeitRun).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    fireEvent.click(screen.getByRole('button', { name: 'Leave and lock' }));
    expect(engineState.forfeitRun).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('path')).toHaveTextContent('/exams');
  });
});

describe('Gauntlet — a saved run', () => {
  it('is resumed, or submitted as it stands after a confirm — there is no start fresh', () => {
    renderAtIndex(0, 3, 'resume');
    expect(screen.getByRole('heading', { level: 1, name: 'You have an unfinished run' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start fresh/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume run' }));
    expect(engineState.resumeGauntlet).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Submit this run' }));
    expect(engineState.submitSavedRun).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Submit run' }));
    expect(engineState.submitSavedRun).toHaveBeenCalledTimes(1);
  });
});

describe('Gauntlet — a refused grade', () => {
  it('keeps the run and offers Try again', () => {
    renderAtIndex(0, 3, 'submit-error');
    expect(screen.getByRole('heading', { level: 1, name: "Couldn't grade this run" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(engineState.submitExam).toHaveBeenCalledTimes(1);
  });

  it('shows a waiting state while the run is being sent', () => {
    renderAtIndex(0, 3, 'submitting');
    expect(screen.getByRole('status')).toHaveTextContent('Submitting your run');
  });
});
