import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const importQuestions = vi.fn();
vi.mock('../../../services/dbQueries', () => ({ importQuestions: (...a) => importQuestions(...a) }));
const copyText = vi.fn(async () => true);
vi.mock('../../exam-export/deliver', () => ({ copyText: (...a) => copyText(...a) }));
vi.mock('../../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../ai/QuestionGenerator', () => ({
  GeneratedItem: ({ q, idx, g }) => (
    <li>
      <label><input type="checkbox" checked={!!q.selected} onChange={() => g.toggle(idx)} aria-label={`Send question ${idx + 1}`} />{q.text}</label>
      {q.issues.map((i) => <p key={i}>{i}</p>)}
    </li>
  ),
}));
vi.mock('../../../store/useStore', () => ({
  useStore: (select) => select({ dynamicTOS: { EE: ['Electric Circuits 2'], ESAS: [], Mathematics: [] } }),
}));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), loading: vi.fn(() => 't'), dismiss: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: ImportFromAI } = await import('./ImportFromAI');

const block = (stem, key = 'B') => `===QUESTION===
subject: EE
topic: electric circuits 2
type: calculation
difficulty: 2
---STEM---
${stem}
---OPTIONS---
A. 1 A
B. 2 A
C. 3 A
D. 4 A
---KEY---
${key}
---EXPLANATION---
**Answer:** 2 A, which is the current through it.
===END===`;

const open = (props) => render(<ImportFromAI {...props} />);
const paste = (text) => {
  fireEvent.change(screen.getByLabelText(/The AI's reply/), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Read the reply' }));
};

beforeEach(() => vi.clearAllMocks());

describe('ImportFromAI', () => {
  it('copies a prompt for the chosen subject and topic', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'Electric Circuits 2' } });
    fireEvent.change(screen.getByLabelText(/Specific focus/), { target: { value: 'transformer efficiency' } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }));
    await waitFor(() => expect(copyText).toHaveBeenCalled());
    expect(copyText.mock.calls[0][0]).toContain('topic "Electric Circuits 2"');
    expect(copyText.mock.calls[0][0]).toContain('===QUESTION===');
    expect(copyText.mock.calls[0][0]).toContain('finer focus: "transformer efficiency"');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('shows the prompt, and it follows the settings like the generator’s', () => {
    open();
    const prompt = screen.getByLabelText(/^Prompt/);
    expect(prompt).toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('radio', { name: /Conceptual/ }));
    fireEvent.click(screen.getByRole('radio', { name: /^Hard/ }));
    expect(prompt.value).toContain('Write 5 original');
    expect(prompt.value).toContain('Every item is a conceptual');
    expect(prompt.value).toContain('exactly 5 hard');
  });

  it('adds a later reply to what’s already read', () => {
    open();
    paste(block('First question about current?'));
    paste(block('Second question about current?'));
    expect(screen.getByText('First question about current?')).toBeInTheDocument();
    expect(screen.getByText('Second question about current?')).toBeInTheDocument();
  });

  it('reads a reply, snaps its topic to the live spelling, and ticks clean items', () => {
    open();
    paste(block('A load draws what current at 230 V?'));
    expect(screen.getByText('A load draws what current at 230 V?')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Send question 1' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Send 1 to review queue' })).toBeEnabled();
  });

  it('leaves an item with a problem unticked, and says what’s wrong', () => {
    open();
    paste(block('A load draws what current at 230 V?', 'Z'));
    expect(screen.getByRole('checkbox', { name: 'Send question 1' })).not.toBeChecked();
    expect(screen.getByText('The answer matches none of the options')).toBeInTheDocument();
  });

  it('says so when nothing can be read', () => {
    open();
    paste('Sorry, I can only write three a day.');
    expect(screen.getByRole('alert')).toHaveTextContent(/Couldn't find any questions/);
  });

  it('sends the ticked items and keeps refused ones with the reason', async () => {
    importQuestions.mockResolvedValue({ queued: ['a'], rejected: [{ index: 1, reasons: ['duplicate'] }] });
    open();
    paste(`${block('First question about current?')}\n${block('Second question about current?')}`);
    fireEvent.click(screen.getByRole('button', { name: 'Send 2 to review queue' }));
    await screen.findByText('This question is already live or in the review queue.');
    const sent = importQuestions.mock.calls[0][0];
    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({ subject: 'EE', subtopic: 'Electric Circuits 2', answer: '2 A' });
    expect(sent[0].issues).toBeUndefined();
    expect(screen.queryByText('First question about current?')).not.toBeInTheDocument();
    expect(screen.getByText('Second question about current?')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/1 sent.*1 still here/), expect.anything());
  });

  it('keeps everything when a send fails', async () => {
    importQuestions.mockRejectedValue(new Error('Network'));
    open();
    paste(block('First question about current?'));
    fireEvent.click(screen.getByRole('button', { name: 'Send 1 to review queue' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText('First question about current?')).toBeInTheDocument();
  });

  it('sends in chunks of 25', async () => {
    importQuestions.mockResolvedValue({ queued: [], rejected: [] });
    open();
    paste(Array.from({ length: 30 }, (_, i) => block(`Question number ${i} about current?`)).join('\n'));
    fireEvent.click(screen.getByRole('button', { name: 'Send 30 to review queue' }));
    await waitFor(() => expect(importQuestions).toHaveBeenCalledTimes(2));
    expect(importQuestions.mock.calls[0][0]).toHaveLength(25);
    expect(importQuestions.mock.calls[1][0]).toHaveLength(5);
  });
});
