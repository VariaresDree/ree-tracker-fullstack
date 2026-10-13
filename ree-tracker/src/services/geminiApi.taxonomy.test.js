// The AI must label questions from the LIVE taxonomy. getStrictRules used to
// read the static fallback TOS in config/constants.js, so "All topics"
// generation told the model to pick from a 28-topic EE list the Topic table
// doesn't have — and questions went live as "Transient Response" /
// "AC Impedance" with no topicId.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiRequest = vi.fn();
vi.mock('./dbQueries', () => ({ apiRequest: (...a) => apiRequest(...a) }));

const LIVE = { EE: ['Electric Circuits 1', 'Electrical Transient Analysis'], ESAS: ['Fluid Mechanics'], Mathematics: ['Algebra'] };
vi.mock('../store/useStore', () => ({ useStore: { getState: () => ({ dynamicTOS: LIVE }) } }));

const { getStrictRules, generateQuestionsAI } = await import('./geminiApi');

describe('getStrictRules', () => {
  it('for "All topics", lists exactly the topics it is given', () => {
    const rules = getStrictRules('EE', 'All', ['Electric Circuits 1', 'Electrical Transient Analysis']);
    expect(rules).toContain('[Electric Circuits 1, Electrical Transient Analysis]');
  });

  it('for a specific topic, demands it verbatim', () => {
    expect(getStrictRules('EE', 'Electric Circuits 1', LIVE.EE)).toContain('MUST be EXACTLY "Electric Circuits 1"');
  });
});

describe('generateQuestionsAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
    apiRequest.mockResolvedValue({ text: '[]' });
  });

  it('prompts with the live store taxonomy, never the stale fallback list', async () => {
    await generateQuestionsAI('EE', 'All');
    const prompt = apiRequest.mock.calls[0][2].contents;
    expect(prompt).toContain('[Electric Circuits 1, Electrical Transient Analysis]');
    expect(prompt).not.toContain('Transient Response');
    expect(prompt).not.toContain('AC Impedance');
  });
});

describe('AI tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
  });

  it('practice questions ask for the fast "practice" chain and unwrap { items }', async () => {
    apiRequest.mockResolvedValue({ text: '{"items":[{"text":"Q","options":["A. 1","2"],"answer":"A. 1"}]}' });
    const out = await generateQuestionsAI('EE', 'Electric Circuits 1');
    expect(apiRequest.mock.calls[0][2].task).toBe('practice');
    expect(out).toEqual([{ text: 'Q', options: ['1', '2'], answer: '1' }]);
  });

  it('the board report uses the "report" chain with a short budget', async () => {
    const { generateBoardReadinessReport } = await import('./geminiApi');
    apiRequest.mockResolvedValue({ text: 'Study power systems.' });
    await generateBoardReadinessReport({}, 55, ['Power Systems']);
    const [, , body, opts] = apiRequest.mock.calls[0];
    expect(body.task).toBe('report');
    expect(body.system).toMatch(/three short sentences/i);
    expect(opts.timeoutMs).toBeLessThanOrEqual(40_000);
  });

  it('admin batches use the "author" chain', async () => {
    const { generateBoardQuestionBatch } = await import('./geminiApi');
    apiRequest.mockResolvedValue({ text: '{"items":[]}', model: 'm', provider: 'groq', providerLabel: 'Groq', latencyMs: 5 });
    const res = await generateBoardQuestionBatch({ subject: 'EE', topic: 'All', batch: { size: 1, calculation: 1, conceptual: 0, difficulty: { 1: 0, 2: 1, 3: 0 } } });
    expect(apiRequest.mock.calls[0][2].task).toBe('author');
    expect(apiRequest.mock.calls[0][2].json).toBe(true);
    expect(res.meta.providerLabel).toBe('Groq');
  });
});
