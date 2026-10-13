import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const generateBoardQuestionBatch = vi.fn();
const verifyQuestions = vi.fn();
vi.mock('../../../services/geminiApi', () => ({
  generateBoardQuestionBatch: (...a) => generateBoardQuestionBatch(...a),
  verifyQuestions: (...a) => verifyQuestions(...a),
  fetchAiStatus: () => Promise.resolve({ tasks: { author: { state: 'ok', primary: { model: 'openai/gpt-oss-120b', providerLabel: 'Groq' } } } }),
}));
const saveQuestionToBank = vi.fn().mockResolvedValue('id');
vi.mock('../../../services/dbQueries', () => ({ saveQuestionToBank: (...a) => saveQuestionToBank(...a) }));
vi.mock('../../../services/liveTaxonomy', () => ({ refreshLiveTOS: () => Promise.resolve(null) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'admin1' } }) }));
const LIVE = { EE: ['Electric Circuits 1'], ESAS: ['Fluid Mechanics'], Mathematics: ['Algebra'] };
vi.mock('../../../store/useStore', () => {
  const state = { dynamicTOS: LIVE };
  const useStore = (sel) => sel(state);
  useStore.getState = () => state;
  return { useStore };
});
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn() }) }));
vi.mock('../../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));

const { default: QuestionGenerator } = await import('./QuestionGenerator');

const q = (n, answer = '2 A') => ({
  text: `Question number ${n}: a 10 ohm resistor carries what current at 20 V?`,
  options: ['1 A', '2 A', '3 A', '4 A'],
  answer,
  type: 'calculation',
  difficulty: 2,
  subtopic: 'Electric Circuits 1',
  fixedExplanation: '**Given:** V = 20 V, R = 10 ohm. **Answer:** 2 A',
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('navigator', { onLine: true });
});

describe('QuestionGenerator', () => {
  it('plans the run from the settings', () => {
    render(<QuestionGenerator />);
    fireEvent.click(screen.getByRole('button', { name: '20' }));
    expect(screen.getByText(/20 questions in 4 batches: 12 calculation, 8 conceptual/)).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /Conceptual/ }));
    expect(screen.getByText(/0 calculation, 20 conceptual/)).toBeTruthy();
  });

  it('previews, leaves a checker disagreement unticked, and sends only ticked items with a note', async () => {
    generateBoardQuestionBatch.mockImplementation(async ({ batch }) => ({
      items: Array.from({ length: batch.size }, (_, i) => q(i)),
      meta: { model: 'openai/gpt-oss-120b', providerLabel: 'Groq' },
    }));
    verifyQuestions.mockImplementation(async (qs) => qs.map((x, i) => ({
      ...x, check: i === 0 ? { status: 'disagrees', choice: 'C', model: 'gemini-x' } : { status: 'agrees' },
    })));

    render(<QuestionGenerator />);
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: /Generate 5 questions/ }));

    await screen.findByText(/5 questions ready/);
    expect(screen.getByText(/4 ticked/)).toBeTruthy();
    expect(screen.getByText('Answer check picked C')).toBeTruthy();
    expect(saveQuestionToBank).not.toHaveBeenCalled();

    // Tick the flagged one too, then send.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Send question 1' }));
    fireEvent.click(screen.getByRole('button', { name: /Send 5 to review queue/ }));
    await waitFor(() => expect(saveQuestionToBank).toHaveBeenCalledTimes(5));
    const first = saveQuestionToBank.mock.calls[0][0];
    expect(first.status).toBe('quarantined');
    expect(first.difficultyTier).toBe(2);
    expect(first.reviewNote).toMatch(/picked C/);
    expect(saveQuestionToBank.mock.calls[1][0].reviewNote).toBeUndefined();
  });

  it('flags a question whose key matches no option', async () => {
    generateBoardQuestionBatch.mockResolvedValue({ items: [q(1, '9 A')], meta: { model: 'm', providerLabel: 'Groq' } });
    render(<QuestionGenerator />);
    fireEvent.change(screen.getByLabelText('How many questions'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('More options'));
    fireEvent.click(screen.getByRole('checkbox', { name: /Double-check answers/ }));
    fireEvent.click(screen.getByRole('button', { name: /Generate 1 question/ }));
    const item = (await screen.findByText('The answer matches none of the options')).closest('li').parentElement.closest('li');
    expect(within(item).getByRole('checkbox', { name: 'Send question 1' }).checked).toBe(false);
    expect(verifyQuestions).not.toHaveBeenCalled();
  });
});
