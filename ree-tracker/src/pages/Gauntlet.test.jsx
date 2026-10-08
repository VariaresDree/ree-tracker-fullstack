// Regression coverage for 1.4: Submit exam used to render in an always-visible
// group right next to Next, one misclick away at every single question. It
// must now render ONLY on the last item, replacing Next rather than sitting
// beside it (mirrors the Board Simulator's SimulatorActive.jsx). This test
// mocks useGauntletEngine directly (its own behavior is covered by
// useGauntletEngine.test.jsx) so it stays focused on button placement.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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

function renderAtIndex(index, total = 3, status = 'active') {
  engineState = {
    status,
    questions: makeQuestions(total),
    answers: {},
    confidences: {},
    timeLeft: 600,
    diagnostics: null,
    currentIndex: index,
    setCurrentIndex: vi.fn(),
    bookmarks: new Set(),
    toggleBookmark: vi.fn(),
    flags: new Set(),
    toggleFlag: vi.fn(),
    resumeGauntlet: vi.fn(),
    discardAndStartFresh: vi.fn(),
    handleAnswer: vi.fn(),
    handleConfidence: vi.fn(),
    submitExam: vi.fn(),
  };

  return render(
    <MemoryRouter initialEntries={['/gauntlet/1']}>
      <Routes>
        <Route path="/gauntlet/:level" element={<Gauntlet />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Gauntlet — layouts', () => {
  it.each(['loading', 'resume', 'pending', 'error', 'diagnostics'])('the %s screen has the app chrome, not the exam banner', (status) => {
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

describe('Gauntlet — Submit exam placement', () => {
  beforeEach(() => {
    engineState = null;
  });

  it('does not render Submit on the first item; Next is the only forward control', () => {
    renderAtIndex(0, 3);
    expect(screen.queryByRole('button', { name: /submit exam/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^next$/i })).toBeInTheDocument();
  });

  it('does not render Submit on a middle item either', () => {
    renderAtIndex(1, 3);
    expect(screen.queryByRole('button', { name: /submit exam/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^next$/i })).toBeInTheDocument();
  });

  it('renders Submit REPLACING Next on the last item — no Next button present alongside it', () => {
    renderAtIndex(2, 3);
    expect(screen.getByRole('button', { name: /submit exam/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^next$/i })).not.toBeInTheDocument();
  });
});
