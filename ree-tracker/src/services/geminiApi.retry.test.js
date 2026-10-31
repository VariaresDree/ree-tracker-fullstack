// Admin AI requests on free-tier keys: a whole model chain can fail in a bad
// minute, so admin tasks try once more, and the error names what each model did.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./dbQueries', () => ({ apiRequest: vi.fn() }));

import { apiRequest } from './dbQueries';
import { callAITask, describeTriedModels, shrinkImage, AI_RETRY_DELAY_MS } from './geminiApi';

const exhausted = () => Object.assign(new Error('AI is unavailable right now.'), {
  status: 502,
  code: 'AI_EXHAUSTED',
  triedModels: [
    { model: 'openai/gpt-oss-120b', provider: 'groq', status: 'timeout' },
    { model: 'gemini-3.5-flash', provider: 'gemini', status: 'rate_limited' },
  ],
});

beforeEach(() => {
  apiRequest.mockReset();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('callAITask', () => {
  it('tries an admin task once more after every model failed', async () => {
    apiRequest.mockRejectedValueOnce(exhausted()).mockResolvedValueOnce({ text: '{"items":[]}', model: 'm' });
    const pending = callAITask('author', 'write', { json: true });
    await vi.advanceTimersByTimeAsync(AI_RETRY_DELAY_MS);
    await expect(pending).resolves.toMatchObject({ text: '{"items":[]}' });
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it('says which models failed and why when the second try fails too', async () => {
    apiRequest.mockRejectedValue(exhausted());
    const pending = callAITask('verify', 'check', { json: true });
    const settled = expect(pending).rejects.toThrow('Last try: gpt-oss-120b timed out, gemini-3.5-flash rate limited.');
    await vi.advanceTimersByTimeAsync(AI_RETRY_DELAY_MS);
    await settled;
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it('does not retry a learner task', async () => {
    apiRequest.mockRejectedValue(exhausted());
    await expect(callAITask('explain', 'why')).rejects.toThrow(/Every AI model failed\. Try again/);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it('names an upload that is too large', async () => {
    apiRequest.mockRejectedValue(Object.assign(new Error('x'), { status: 413, code: 'TOO_LARGE' }));
    await expect(callAITask('vision', ['read', { inlineData: { data: 'x' } }])).rejects.toThrow(/too large/);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
});

describe('describeTriedModels', () => {
  it('lists only the failures, by short model name', () => {
    expect(describeTriedModels([
      { model: 'nvidia/nemotron-3-ultra:free', status: 'bad_output' },
      { model: 'gemini-2.5-pro', status: 'not_found' },
      { model: 'x', status: 'ok' },
    ])).toBe('nemotron-3-ultra:free unusable answer, gemini-2.5-pro retired');
    expect(describeTriedModels(undefined)).toBe('');
  });
});

describe('shrinkImage', () => {
  it('falls back to the original image where the browser cannot scale it', async () => {
    vi.useRealTimers();
    const file = new Blob(['abc'], { type: 'image/png' });
    await expect(shrinkImage(file)).resolves.toMatch(/^data:image\/png;base64,/);
  });
});
