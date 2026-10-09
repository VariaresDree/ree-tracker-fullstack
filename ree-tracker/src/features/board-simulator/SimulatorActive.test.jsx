// In-exam realism: Submit is reachable from any item and says what's still
// open (unanswered, marked) with links back; "Mark for review" is a sitting
// flag, separate from saving to bookmarks; the navigator has the PRC answer
// sheet as a second view; and the page has one h1.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../../components/Scratchpad', () => ({ default: () => null }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
vi.mock('../../services/geminiApi', () => ({ generateMasterExplanation: vi.fn() }));

const { default: SimulatorActive } = await import('./SimulatorActive');

const QS = [1, 2, 3].map((n) => ({ id: `q${n}`, subject: 'EE', subtopic: 'Machines', text: `Question ${n}`, options: ['A1', 'B1', 'C1', 'D1'], answer: 'B1' }));

const engine = (over = {}) => ({
  session: { questions: QS, answers: { 0: 'C1' }, confidences: {}, isActive: true, isFinished: false },
  currentIndex: 0,
  handleIndexChange: vi.fn(),
  examEndTime: Date.now() + 3600_000,
  examTotalSecs: 7200,
  showTime: true,
  setShowTime: vi.fn(),
  handleSelectConfidence: vi.fn(),
  handleSelectOption: vi.fn(),
  bookmarks: new Set(),
  toggleBookmark: vi.fn(),
  marked: new Set([2]),
  toggleMarked: vi.fn(),
  handleFlagQuestion: vi.fn(),
  submitExam: vi.fn(),
  isSubmitting: false,
  resetToSetup: vi.fn(),
  ...over,
});

describe('SimulatorActive', () => {
  it('offers Submit from the first item and lists what is still open', () => {
    const e = engine();
    render(<SimulatorActive engine={e} isOnline />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Submit exam' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Submit this exam?' });
    expect(within(dialog).getByText(/items are unanswered/)).toBeInTheDocument();
    expect(within(dialog).getByText(/item is marked for review/)).toBeInTheDocument();
    // Jump back to unanswered item 2.
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Go to item 2' })[0]);
    expect(e.handleIndexChange).toHaveBeenCalledWith(1);
    expect(e.submitExam).not.toHaveBeenCalled();
  });

  it('submits from the dialog', () => {
    const e = engine();
    render(<SimulatorActive engine={e} isOnline />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Submit exam' })[0]);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Submit exam' }));
    expect(e.submitExam).toHaveBeenCalledTimes(1);
  });

  it('marking for review is not saving to bookmarks', () => {
    const e = engine();
    render(<SimulatorActive engine={e} isOnline />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark for review (M)' }));
    expect(e.toggleMarked).toHaveBeenCalledWith(0);
    expect(e.toggleBookmark).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'm' });
    expect(e.toggleMarked).toHaveBeenCalledTimes(2);
  });

  it('shows the answer sheet, shaded where answered', () => {
    render(<SimulatorActive engine={engine()} isOnline />);
    fireEvent.click(screen.getByRole('radio', { name: 'Answer sheet' }));
    expect(screen.getByRole('button', { name: 'Item 1, answered C' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Item 2, not answered' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Item 3, not answered, marked for review' })).toBeInTheDocument();
  });

  it('has exactly one h1 while answering', () => {
    render(<SimulatorActive engine={engine()} isOnline />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
