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
