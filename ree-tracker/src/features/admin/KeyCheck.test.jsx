import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// Admin › Question bank › Fix › Questions to check (2026-11-16).

const apiRequest = vi.fn();
const fetchQuestionById = vi.fn();
const updateQuestionInBank = vi.fn();
vi.mock('../../services/dbQueries', () => ({
  apiRequest: (...a) => apiRequest(...a),
  fetchQuestionById: (...a) => fetchQuestionById(...a),
  updateQuestionInBank: (...a) => updateQuestionInBank(...a),
}));
vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../quiz/ExplanationBody', () => ({ default: ({ text }) => <span>{text}</span> }));
vi.mock('../library/QuestionEditModal', () => ({
  default: ({ question, onSave }) => (question ? <button type="button" onClick={() => onSave(question)}>editor-save</button> : null),
}));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: KeyCheck } = await import('./KeyCheck');

const coils = { id: 'q1', subject: 'EE', subtopic: 'Magnetic Circuits', text: 'Two coils in series aiding…', options: ['0.853 H', '0.700 H', '0.953 H', '0.600 H'], answer: '0.853 H', fixedExplanation: '**Answer:** 0.953 H' };
const beam = { id: 'q3', subject: 'ESAS', subtopic: 'Statics', text: 'A beam…', options: ['A', 'B', 'C', 'D'], answer: 'A', fixedExplanation: 'Because.' };
const LIST = {
  total: 2,
  byReason: { 'explanation-names-other': 1, 'learners-chose-other': 1, 'duplicate-options': 0 },
  lastScan: { startedAt: '2026-11-16T00:00:00Z', ok: true, summary: { scanned: 18292 } },
  items: [
    { id: 'c1', reason: 'explanation-names-other', detail: { option: '0.953 H', line: 'The total inductance is 0.953 H.' }, question: coils, picks: [] },
    { id: 'c3', reason: 'learners-chose-other', detail: { option: 'B', chose: 4, right: 1, learners: 5 }, question: beam, picks: [{ option: 'B', learners: 4, isKey: false }, { option: 'A', learners: 1, isKey: true }] },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  apiRequest.mockImplementation(async (url, method, body) => {
    if (url === '/api/questions/key-checks') return LIST;
    if (url === '/api/questions/key-checks/scan') return { success: true, scanned: 18292, added: 2, open: 2 };
    if (url.endsWith('/resolve')) return body.action === 'use-option' ? { success: true, closed: 1, regraded: 3 } : { success: true, closed: 1 };
    throw new Error(url);
  });
});

describe('Questions to check', () => {
  it('leads with an explanation that works out another option, and shows which', async () => {
    render(<KeyCheck />);
    expect(await screen.findByText('Its explanation works out another option')).toBeInTheDocument();
    expect(screen.getByText(/Last checked .* · 18,292 questions · 2 to look at/)).toBeInTheDocument();
    expect(screen.getByText('Explanation’s answer')).toBeInTheDocument();
    expect(screen.getByText('The total inductance is 0.953 H.')).toBeInTheDocument();
    expect(screen.getByText('4 of 5 learners chose another option')).toBeInTheDocument();
    // Make … the key only where the explanation already agrees with it.
    expect(screen.getAllByRole('button', { name: /the key$/ })).toHaveLength(1);
  });

  it('makes the option the explanation names the key, and says how many answers were regraded', async () => {
    render(<KeyCheck />);
    fireEvent.click(await screen.findByRole('button', { name: 'Make C the key' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Key changed to C. 3 past answers regraded.'));
    const call = apiRequest.mock.calls.find(([url]) => url.endsWith('/c1/resolve'));
    expect(call[2]).toEqual({ action: 'use-option', answer: '0.953 H' });
    expect(screen.queryByText('Two coils in series aiding…')).toBeNull();
  });

  it("'Key is right' and Remove (after a second tap) settle a finding", async () => {
    render(<KeyCheck />);
    await screen.findByText('A beam…');
    const beamCard = screen.getByText('A beam…').closest('li');
    fireEvent.click(within(beamCard).getByRole('button', { name: 'Key is right' }));
    await waitFor(() => expect(screen.queryByText('A beam…')).toBeNull());
    expect(apiRequest.mock.calls.find(([url]) => url.endsWith('/c3/resolve'))[2]).toEqual({ action: 'keep' });

    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Take it out of the bank' }));
    await waitFor(() => expect(apiRequest.mock.calls.find(([url]) => url.endsWith('/c1/resolve'))[2]).toEqual({ action: 'remove' }));
  });

  it('Edit opens the editor; saving closes the finding for the next check to judge', async () => {
    fetchQuestionById.mockResolvedValue(coils);
    updateQuestionInBank.mockResolvedValue({});
    render(<KeyCheck />);
    await screen.findByText('Two coils in series aiding…');
    fireEvent.click(screen.getAllByRole('button', { name: /Edit/ })[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'editor-save' }));
    await waitFor(() => expect(updateQuestionInBank).toHaveBeenCalledWith('q1', coils));
    await waitFor(() => expect(apiRequest.mock.calls.find(([url]) => url.endsWith('/c1/resolve'))[2]).toEqual({ action: 'edited' }));
  });

  it('checks the bank on request and reloads the list', async () => {
    render(<KeyCheck />);
    await screen.findByText('Two coils in series aiding…');
    fireEvent.click(screen.getByRole('button', { name: /Check the bank/ }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('18,292 questions checked: 2 new to look at.'));
    expect(apiRequest.mock.calls.filter(([url]) => url === '/api/questions/key-checks')).toHaveLength(2);
  });

  // 2026-11-16: settling one at a time was the slow part.
  describe('settling many at once', () => {
    const twin = { id: 'q4', subject: 'Mathematics', subtopic: 'Algebra', text: 'Simplify…', options: ['$2\\pi$', '2 \\pi', '3', '4'], answer: '3', fixedExplanation: 'x' };
    const MANY = {
      ...LIST,
      total: 3,
      byReason: { ...LIST.byReason, 'duplicate-options': 1 },
      items: [...LIST.items, { id: 'c4', reason: 'duplicate-options', detail: { options: [0, 1] }, question: twin, picks: [] }],
    };
    beforeEach(() => {
      apiRequest.mockImplementation(async (url, method, body) => {
        if (url === '/api/questions/key-checks') return MANY;
        if (url.endsWith('/resolve-bulk')) return { success: true, settled: body.ids.length, regraded: body.action === 'use-option' ? 3 : 0, failed: [] };
        if (url.endsWith('/resolve')) return { success: true, closed: 1 };
        throw new Error(url);
      });
    });

    it('a duplicate says which two options, and can be marked "They differ"', async () => {
      render(<KeyCheck />);
      expect(await screen.findByText('Options A and B read the same')).toBeInTheDocument();
      const card = screen.getByText('Simplify…').closest('li');
      expect(within(card).getByText('Same as B')).toBeInTheDocument();
      expect(within(card).getByText('Same as A')).toBeInTheDocument();
      fireEvent.click(within(card).getByRole('button', { name: 'They differ' }));
      await waitFor(() => expect(apiRequest.mock.calls.find(([url]) => url.endsWith('/c4/resolve'))[2]).toEqual({ action: 'keep' }));
    });

    it('tick all, then keep them as they are in one go; the list reloads', async () => {
      render(<KeyCheck />);
      await screen.findByText('Simplify…');
      fireEvent.click(screen.getByRole('checkbox', { name: /Tick all 3/ }));
      expect(screen.getByText('3 of 3 ticked')).toBeInTheDocument();
      // Only the one whose explanation works out another option takes its answer.
      expect(screen.getByRole('button', { name: /Use the explanation’s answer · 1/ })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Keep as is · 3/ }));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('3 questions kept as they are.'));
      const call = apiRequest.mock.calls.find(([url]) => url.endsWith('/resolve-bulk'));
      expect(call[2]).toEqual({ ids: ['c1', 'c3', 'c4'], action: 'keep' });
      expect(apiRequest.mock.calls.filter(([url]) => url === '/api/questions/key-checks')).toHaveLength(2);
    });

    it("the explanation's answer goes only to those that have one; Remove asks first", async () => {
      render(<KeyCheck />);
      await screen.findByText('Simplify…');
      fireEvent.click(screen.getByRole('checkbox', { name: /Tick: Two coils/ }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Tick: Simplify/ }));
      fireEvent.click(screen.getByRole('button', { name: /Use the explanation’s answer · 1/ }));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('1 question given their explanation’s answer. 3 past answers regraded.'));
      expect(apiRequest.mock.calls.find(([url]) => url.endsWith('/resolve-bulk'))[2]).toEqual({ ids: ['c1'], action: 'use-option' });

      fireEvent.click(screen.getByRole('checkbox', { name: /Tick: Simplify/ }));
      fireEvent.click(screen.getByRole('button', { name: /Remove · 1/ }));
      expect(apiRequest.mock.calls.filter(([url]) => url.endsWith('/resolve-bulk'))).toHaveLength(1);
      fireEvent.click(screen.getByRole('button', { name: 'Take 1 out of the bank' }));
      await waitFor(() => expect(apiRequest.mock.calls.filter(([url]) => url.endsWith('/resolve-bulk'))[1][2]).toEqual({ ids: ['c4'], action: 'remove' }));
    });

    it('shows one kind at a time; ticking acts only on what is shown', async () => {
      render(<KeyCheck />);
      await screen.findByText('Simplify…');
      fireEvent.click(screen.getByRole('radio', { name: /Same options · 1/ }));
      expect(screen.queryByText('Two coils in series aiding…')).toBeNull();
      expect(screen.getByText('Simplify…')).toBeInTheDocument();
    });

    it('says which ones could not be settled, and why', async () => {
      apiRequest.mockImplementation(async (url) => {
        if (url === '/api/questions/key-checks') return MANY;
        if (url.endsWith('/resolve-bulk')) return { success: true, settled: 2, regraded: 0, failed: [{ id: 'c1', error: "It's in a running battle. Try again when the battle ends." }] };
        throw new Error(url);
      });
      render(<KeyCheck />);
      await screen.findByText('Simplify…');
      fireEvent.click(screen.getByRole('checkbox', { name: /Tick all/ }));
      fireEvent.click(screen.getByRole('button', { name: /Keep as is/ }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("1 question couldn’t be settled: It's in a running battle. Try again when the battle ends."));
    });
  });

  it('before the first check it says so, with the button to run it', async () => {
    apiRequest.mockImplementation(async (url) => (url === '/api/questions/key-checks' ? { total: 0, byReason: {}, lastScan: null, items: [] } : {}));
    render(<KeyCheck />);
    expect(await screen.findByText('The bank hasn’t been checked yet.')).toBeInTheDocument();
    expect(screen.queryByText('Nothing to look at')).toBeNull();
  });
});
