// One call to one model. Two wire formats cover every provider:
//   openai  Groq, Cerebras, OpenRouter (OpenAI-compatible /chat/completions)
//   gemini  Google's SDK
// Both take the same request shape and return { text }, or throw an Error
// whose `kind` the router uses to decide what to do next.
const { GoogleGenAI } = require('@google/genai');
const { PROVIDERS } = require('../../config/aiModels');

class AiCallError extends Error {
    constructor(message, kind, status) {
        super(message);
        this.kind = kind;
        this.status = status;
    }
}

function kindForStatus(status, message = '') {
    const msg = String(message).toLowerCase();
    if (status === 401 || status === 403) return 'auth';
    if (status === 404 || msg.includes('model_not_found') || msg.includes('does not exist') || msg.includes('decommissioned')) return 'not_found';
    if (status === 429) return 'rate_limited';
    if (status === 413 || msg.includes('context length') || msg.includes('too large')) return 'too_large';
    if (status === 400 && (msg.includes('json') || msg.includes('validate'))) return 'bad_output';
    if (status >= 500) return 'unavailable';
    return 'other';
}

function classifyError(err) {
    if (err?.kind) return err.kind;
    if (err?.name === 'AbortError') return 'timeout';
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('timeout') || msg.includes('aborted')) return 'timeout';
    if (msg.includes('not found') || msg.includes('404')) return 'not_found';
    if (msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted')) return 'rate_limited';
    if (msg.includes('401') || msg.includes('403') || msg.includes('api key')) return 'auth';
    if (msg.includes('503') || msg.includes('unavailable') || msg.includes('overloaded')) return 'unavailable';
    return 'other';
}

// The request's `contents`: a prompt string, or [prompt, ...{ inlineData }]
// (the Gemini shape the client already sends for images).
function splitContents(contents) {
    if (typeof contents === 'string') return { text: contents, images: [] };
    const parts = Array.isArray(contents) ? contents : [];
    const text = parts.filter((p) => typeof p === 'string').join('\n\n');
    const images = parts
        .filter((p) => p && typeof p === 'object' && p.inlineData?.data)
        .map((p) => ({ data: p.inlineData.data, mimeType: p.inlineData.mimeType || 'image/jpeg' }));
    return { text, images };
}

const isReasoningModel = (model) => /gpt-oss|qwen3|deepseek-r1|reasoning/i.test(model);
// Only gpt-oss takes low/medium/high on Groq and Cerebras; Groq's Qwen3 accepts
// just none/default and rejects anything else with a 400.
const takesEffortLevels = (model) => /gpt-oss/i.test(model);
// Models that write their reasoning into the answer as <think>…</think>.
const thinksInline = (model) => /qwen3|deepseek-r1/i.test(model);

/** The answer without any <think> block a reasoning model left in it. */
function stripThinking(text) {
    return String(text).replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

async function callOpenAICompatible({ provider, model, system, contents, json, maxTokens, temperature, reasoningEffort, signal, env = process.env, fetchImpl = fetch }) {
    const p = PROVIDERS[provider];
    const { text, images } = splitContents(contents);
    const userContent = images.length
        ? [{ type: 'text', text }, ...images.map((img) => ({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.data}` } }))]
        : text;

    const body = {
        model,
        messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: userContent },
        ],
        temperature,
        max_tokens: maxTokens,
    };
    // JSON mode: the prompts ask for one object ({ "items": [...] }), which is
    // what json_object requires. OpenRouter's free routes don't all honour it.
    if (json && provider !== 'openrouter') body.response_format = { type: 'json_object' };
    if (reasoningEffort && isReasoningModel(model)) {
        if (provider === 'openrouter') body.reasoning = { effort: reasoningEffort };
        else if (takesEffortLevels(model)) body.reasoning_effort = reasoningEffort;
    }
    // Groq keeps a Qwen3 or R1 model's reasoning out of the answer when asked.
    if (provider === 'groq' && thinksInline(model)) body.reasoning_format = 'hidden';

    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env[p.envKey]}`,
    };
    if (provider === 'openrouter') {
        headers['HTTP-Referer'] = env.FRONTEND_URL || 'https://ree-tracker.vercel.app';
        headers['X-Title'] = 'REE.ai';
    }

    const res = await fetchImpl(`${p.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let message = errText;
        try { message = JSON.parse(errText)?.error?.message || errText; } catch { /* plain text */ }
        throw new AiCallError(`${p.label} ${res.status}: ${String(message).slice(0, 300)}`, kindForStatus(res.status, message), res.status);
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    const out = typeof raw === 'string' ? stripThinking(raw) : raw;
    if (typeof out !== 'string' || !out.trim()) {
        const reason = data?.choices?.[0]?.finish_reason;
        throw new AiCallError(`${p.label} returned no text${reason ? ` (${reason})` : ''}`, 'bad_output');
    }
    return { text: out };
}

let _gemini = null;
let _geminiKey = null;
function geminiClient(env) {
    const key = env.GEMINI_API_KEY;
    if (!key) return null;
    if (!_gemini || _geminiKey !== key) {
        _gemini = new GoogleGenAI({ apiKey: key });
        _geminiKey = key;
    }
    return _gemini;
}

async function callGemini({ model, system, contents, json, maxTokens, temperature, signal, env = process.env }) {
    const ai = geminiClient(env);
    if (!ai) throw new AiCallError('GEMINI_API_KEY is not set', 'auth');
    const config = {
        temperature,
        maxOutputTokens: maxTokens,
        ...(system ? { systemInstruction: system } : {}),
        ...(json ? { responseMimeType: 'application/json' } : {}),
        ...(signal ? { abortSignal: signal } : {}),
    };
    const response = await ai.models.generateContent({ model, contents, config });
    const text = response?.text;
    if (typeof text !== 'string' || !text.trim()) throw new AiCallError('Gemini returned no text', 'bad_output');
    return { text };
}

function callModel(req) {
    const kind = PROVIDERS[req.provider]?.kind;
    if (kind === 'openai') return callOpenAICompatible(req);
    if (kind === 'gemini') return callGemini(req);
    return Promise.reject(new AiCallError(`Unknown provider ${req.provider}`, 'other'));
}

module.exports = { callModel, classifyError, kindForStatus, splitContents, AiCallError };
