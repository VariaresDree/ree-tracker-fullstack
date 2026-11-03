import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { questionContentHash } from '@ree/shared';

const db = { fetchQuestionsForChecking: vi.fn(), previewReplacements: vi.fn(), replaceQuestions: vi.fn() };
vi.mock('../../../services/dbQueries', () => db);
const copyText = vi.fn(async () => true);
vi.mock('../../exam-export/deliver', () => ({ copyText: (...a) => copyText(...a), canDownloadFiles: () => false, downloadBlob: vi.fn() }));
vi.mock('../../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../../../store/useStore', () => ({ useStore: (select) => select({ dynamicTOS: { EE: ['Circuits'] } }) }));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), loading: vi.fn(() => 't'), dismiss: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: FixWithAI } = await import('./FixWithAI');
const { toExchangeBlock, parseExchange } = await import('./aiExchange');

const live = (id, over = {}) => {
  const q = { id, subject: 'EE', subtopic: 'Circuits', type: 'calculation', difficulty: 2, text: `Live stem ${id}, long enough?`, options: ['1 A', '2 A', '3 A', '4 A'], answer: '2 A', fixedExplanation: 'Old solution text for this one.', recorded: 4, unrecorded: 2, inBattle: false, ...over };
  return { ...q, hash: questionContentHash(q) };
};
const reply = (q, { stem = q.text, key = 'B', explanation = '**Answer:** $2\\ \\text{A}$ is the current.', verdict = 'formatted', notes = '', options = q.options, hash = q.hash } = {}) => [
  '===QUESTION===', `id: ${q.id}`, `hash: ${hash}`, 'subject: EE', 'topic: Circuits', `verdict: ${verdict}`,
  '---STEM---', stem, '---OPTIONS---', ...options.map((o, i) => `${'ABCD'[i]}. ${o}`), '---KEY---', key, '---EXPLANATION---', explanation, '---NOTES---', notes, '===END===',
].join('\n');

const show = (props) => render(<FixWithAI {...props} />);
async function compare(text, items) {
  db.previewReplacements.mockResolvedValue({ items });
  fireEvent.change(screen.getByLabelText(/corrected questions/), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: /Compare with the live/ }));
  await screen.findByRole('region', { name: /Step 4/ });
}

beforeEach(() => vi.clearAllMocks());

describe('export', () => {
  it('loads a page, shows progress and a prompt with ids and hashes', async () => {
    const q = live('q1');
    db.fetchQuestionsForChecking.mockResolvedValue({ items: [q], total: 16333, checked: 240 });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Load questions' }));
    expect(await screen.findByText('Checked 240 of 16,333')).toBeInTheDocument();
    expect(db.fetchQuestionsForChecking).toHaveBeenCalledWith(expect.objectContaining({ subject: 'EE', unchecked: true, limit: 10 }));
    const prompt = screen.getByLabelText('Prompt and questions').value;
    expect(prompt).toContain('id: q1');
    expect(prompt).toContain(`hash: ${q.hash}`);
    expect(prompt).toMatch(/same number of options, in the same order/);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(copyText).toHaveBeenCalledWith(prompt));
  });

  it('an exported block reads back as the same question', () => {
    const q = live('q1');
    const [read] = parseExchange(toExchangeBlock(q)).questions;
    expect(read).toMatchObject({ id: 'q1', hash: q.hash, text: q.text, options: q.options, answer: '2 A', fixedExplanation: q.fixedExplanation });
  });
});

describe('comparing', () => {
  it('ticks a clean formatting fix, and shows before and after', async () => {
    const q = live('q1');
    show();
    await compare(reply(q), [q]);
    expect(screen.getByRole('checkbox', { name: 'Apply question 1' })).toBeChecked();
    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getByText('Explanation', { selector: 'span,div' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply 1' })).toBeEnabled();
  });

  it('never ticks a key change for you, and says what it would do', async () => {
    const q = live('q1');
    show();
    await compare(reply(q, { key: 'C', verdict: 'corrected', notes: 'The key forgot root three.', explanation: '**Answer:** 3 A is the current.' }), [q]);
    expect(screen.getByRole('checkbox', { name: 'Apply question 1' })).not.toBeChecked();
    expect(screen.getAllByText('Key changes').length).toBeGreaterThan(1);
    expect(screen.getByText(/regrades 4 past answers; 2 more stored no option/)).toBeInTheDocument();
    expect(screen.getByText(/The key forgot root three/)).toBeInTheDocument();
  });

  it('a changed value in the key’s own slot is no key change, but is never ticked for you', async () => {
    const q = live('q1');
    show();
    await compare(reply(q, { options: ['1 A', '2.5 A', '3 A', '4 A'], verdict: 'formatted', explanation: '**Answer:** 2.5 A is the current.' }), [q]);
    expect(screen.getByRole('checkbox', { name: 'Apply question 1' })).not.toBeChecked();
    expect(screen.getByText(/A number changed in the stem or an option/)).toBeInTheDocument();
  });

  it('a change of numbers’ formatting alone can be ticked', async () => {
    const q = live('q1');
    const options = ['$1\\ \\text{A}$', '$2\\ \\text{A}$', '$3\\ \\text{A}$', '$4\\ \\text{A}$'];
    show();
    await compare(reply(q, { options }), [q]);
    expect(screen.getByRole('checkbox', { name: 'Apply question 1' })).toBeChecked();
  });

  it('leaves a corrected verdict unticked, whatever it changed', async () => {
    const q = live('q1');
    show();
    await compare(reply(q, { verdict: 'corrected', notes: 'Reworded the stem.' }), [q]);
    expect(screen.getByRole('checkbox', { name: 'Apply question 1' })).not.toBeChecked();
  });

  it('leaves an unsure verdict unticked', async () => {
    const q = live('q1');
    show();
    await compare(reply(q, { verdict: 'unsure', notes: 'Values look off.' }), [q]);
    expect(screen.getByRole('checkbox', { name: 'Apply question 1' })).not.toBeChecked();
    expect(screen.getByText(/The AI is unsure/)).toBeInTheDocument();
  });

  it.each([
    ['edited since export', { hash: 'old' }, /edited after you exported/],
    ['reordered options', { options: ['2 A', '1 A', '3 A', '4 A'] }, /reordered the options/],
    ['fewer options', { options: ['1 A', '2 A', '3 A'] }, /changed the number of options/],
  ])('refuses %s: no tick possible', async (_name, over, words) => {
    const q = live('q1');
    show();
    await compare(reply(q, { key: 'A', ...over }), [q]);
    expect(screen.getByRole('checkbox', { name: 'Apply question 1' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(words);
  });

  it('refuses a question in a running battle', async () => {
    const q = live('q1', { inBattle: true });
    show();
    await compare(reply(q), [q]);
    expect(screen.getByRole('checkbox', { name: 'Apply question 1' })).toBeDisabled();
    expect(screen.getByText(/running battle/)).toBeInTheDocument();
  });

  it('flags an explanation that contradicts the key', async () => {
    const q = live('q1');
    show();
    await compare(reply(q, { explanation: '**Answer:** 9 A is what this works out to.' }), [q]);
    expect(screen.getByRole('checkbox', { name: 'Apply question 1' })).not.toBeChecked();
    expect(screen.getByText(/doesn't match the key/)).toBeInTheDocument();
  });

  it('says when a reply has no ids', async () => {
    show();
    fireEvent.change(screen.getByLabelText(/corrected questions/), { target: { value: '===QUESTION===\nsubject: EE\n---STEM---\nA stem?\n---OPTIONS---\nA. a\nB. b\n---KEY---\nA\n===END===' } });
    fireEvent.click(screen.getByRole('button', { name: /Compare with the live/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/1 question had no id/);
    expect(db.previewReplacements).not.toHaveBeenCalled();
  });

  it('filters to key changes', async () => {
    const a = live('q1');
    const b = live('q2');
    show();
    await compare(`${reply(a)}\n${reply(b, { key: 'C', explanation: '**Answer:** 3 A is the current.' })}`, [a, b]);
    fireEvent.click(screen.getByRole('radio', { name: 'Key changes' }));
    const list = within(screen.getByRole('region', { name: /Step 4/ }));
    expect(list.getAllByRole('checkbox')).toHaveLength(1);
    expect(list.getByRole('checkbox', { name: 'Apply question 2' })).toBeInTheDocument();
  });
});

describe('applying', () => {
  it('sends a key change only when ticked on purpose, then offers the old versions back', async () => {
    const q = live('q1');
    db.replaceQuestions.mockResolvedValue({ applied: [{ id: 'q1', hash: 'newhash', keyChanged: true }], skipped: [] });
    const onSaved = vi.fn();
    show({ onSaved });
    await compare(reply(q, { key: 'C', explanation: '**Answer:** 3 A is the current.' }), [q]);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Apply question 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply 1' }));
    await waitFor(() => expect(db.replaceQuestions).toHaveBeenCalled());
    expect(db.replaceQuestions.mock.calls[0][0][0]).toMatchObject({ id: 'q1', hash: q.hash, answer: '3 A', confirmKeyChange: true });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole('button', { name: /Copy the old versions/ }));
    await waitFor(() => expect(copyText).toHaveBeenCalled());
    const undo = copyText.mock.calls.at(-1)[0];
    expect(undo).toContain('hash: newhash');
    expect(parseExchange(undo).questions[0].answer).toBe('2 A');
  });

  it('keeps a row the server skipped, with the reason', async () => {
    const q = live('q1');
    db.replaceQuestions.mockResolvedValue({ applied: [], skipped: [{ id: 'q1', reason: 'in-battle' }] });
    show();
    await compare(reply(q), [q]);
    fireEvent.click(screen.getByRole('button', { name: 'Apply 1' }));
    expect(await screen.findByText(/running battle/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Apply question 1' })).toBeDisabled();
  });

  it('keeps everything when a request fails', async () => {
    const q = live('q1');
    db.replaceQuestions.mockRejectedValue(new Error('Network'));
    show();
    await compare(reply(q), [q]);
    fireEvent.click(screen.getByRole('button', { name: 'Apply 1' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole('checkbox', { name: 'Apply question 1' })).toBeChecked();
  });
});
