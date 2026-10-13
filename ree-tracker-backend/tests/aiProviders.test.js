import { describe, it, expect, vi } from 'vitest';
const { callModel, kindForStatus, splitContents } = require('../src/services/ai/providers');

const okResponse = (content) => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) });

describe('OpenAI-compatible providers', () => {
    it('sends system + user messages, JSON mode and reasoning effort to Groq', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(okResponse('{"items":[]}'));
        const out = await callModel({
            provider: 'groq', model: 'openai/gpt-oss-120b', system: 'You are an examiner.', contents: 'Write one.',
            json: true, maxTokens: 900, temperature: 0.2, reasoningEffort: 'high',
            env: { GROQ_API_KEY: 'k' }, fetchImpl,
        });
        expect(out.text).toBe('{"items":[]}');
        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
        expect(init.headers.Authorization).toBe('Bearer k');
        const body = JSON.parse(init.body);
        expect(body.messages).toEqual([
            { role: 'system', content: 'You are an examiner.' },
            { role: 'user', content: 'Write one.' },
        ]);
        expect(body.response_format).toEqual({ type: 'json_object' });
        expect(body.reasoning_effort).toBe('high');
        expect(body.max_tokens).toBe(900);
    });

    it('sends Groq Qwen3 no effort level, hides its reasoning, and strips any <think> left in', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(okResponse('<think>V = IR, so…</think>\n{"items":[]}'));
        const out = await callModel({
            provider: 'groq', model: 'qwen/qwen3-32b', contents: 'Write one.', json: true, reasoningEffort: 'high',
            env: { GROQ_API_KEY: 'k' }, fetchImpl,
        });
        expect(out.text).toBe('{"items":[]}');
        const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
        expect(body.reasoning_effort).toBeUndefined();
        expect(body.reasoning_format).toBe('hidden');
    });

    it('turns Gemini-shaped image parts into image_url data URIs', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(okResponse('{}'));
        await callModel({
            provider: 'groq', model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            contents: ['Read this.', { inlineData: { data: 'QUJD', mimeType: 'image/png' } }],
            env: { GROQ_API_KEY: 'k' }, fetchImpl,
        });
        const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
        expect(body.messages[0].content).toEqual([
            { type: 'text', text: 'Read this.' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,QUJD' } },
        ]);
        expect(body.reasoning_effort).toBeUndefined();
    });

    it('classifies HTTP failures so the router knows what to do', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => '{"error":{"message":"The model does not exist"}}' });
        await expect(callModel({ provider: 'cerebras', model: 'x', contents: 'a', env: { CEREBRAS_API_KEY: 'k' }, fetchImpl }))
            .rejects.toMatchObject({ kind: 'not_found' });
        expect(kindForStatus(429)).toBe('rate_limited');
        expect(kindForStatus(401)).toBe('auth');
        expect(kindForStatus(503)).toBe('unavailable');
    });

    it('treats an empty answer as bad output', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: '' }, finish_reason: 'length' }] }) });
        await expect(callModel({ provider: 'openrouter', model: 'm', contents: 'a', env: { OPENROUTER_API_KEY: 'k' }, fetchImpl }))
            .rejects.toMatchObject({ kind: 'bad_output' });
    });

    it('splits contents into text and images', () => {
        expect(splitContents('hi')).toEqual({ text: 'hi', images: [] });
        expect(splitContents(['a', 'b', { inlineData: { data: 'x' } }]).images).toHaveLength(1);
    });
});
