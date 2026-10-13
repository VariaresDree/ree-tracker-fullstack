import { describe, it, expect, beforeEach } from 'vitest';
const { chainFor, parseEntry, TASKS, TASK_IDS } = require('../src/config/aiModels');
const { runTask, plan, status } = require('../src/services/ai/aiRouter');
const health = require('../src/services/ai/aiHealth');

const ALL_KEYS = { GROQ_API_KEY: 'g', CEREBRAS_API_KEY: 'c', OPENROUTER_API_KEY: 'o', GEMINI_API_KEY: 'k' };

// A fake clock the router reads, advanced by the fake model calls.
const clock = () => {
    let t = 1_000_000;
    return { now: () => t, advance: (ms) => { t += ms; } };
};

beforeEach(() => health.reset());

describe('AI model chains', () => {
    it('every task has a non-empty chain of known providers', () => {
        for (const id of TASK_IDS) {
            expect(chainFor(id, {}).length).toBeGreaterThan(0);
        }
    });

    it('parses provider:model, keeping colons inside the model id', () => {
        expect(parseEntry('openrouter:openai/gpt-oss-20b:free')).toEqual({
            id: 'openrouter:openai/gpt-oss-20b:free', provider: 'openrouter', model: 'openai/gpt-oss-20b:free',
        });
        expect(parseEntry('groq:@pick:llama-4| qwen3')).toMatchObject({ provider: 'groq', pick: ['llama-4', 'qwen3'] });
        expect(parseEntry('groq:@pick:')).toBeNull();
        expect(parseEntry('nope:model')).toBeNull();
        expect(parseEntry('groq')).toBeNull();
    });

    it('learner-facing tasks start on a fast open model, not the biggest Gemini', () => {
        for (const id of ['report', 'explain', 'practice']) {
            expect(TASKS[id].tier).toBe('fast');
            expect(chainFor(id, {})[0].provider).not.toBe('gemini');
        }
        expect(TASKS.report.perModelTimeoutMs).toBeLessThanOrEqual(15_000);
    });

    it('the vision chain holds only models that read images', () => {
        const ids = chainFor('vision', { AI_CHAIN_VISION: 'groq:openai/gpt-oss-120b,gemini:gemini-2.5-flash' }).map((e) => e.id);
        expect(ids).toEqual(['gemini:gemini-2.5-flash']);
    });

    it('AI_CHAIN_<TASK> replaces a chain', () => {
        const ids = chainFor('report', { AI_CHAIN_REPORT: 'cerebras:gpt-oss-120b, gemini:x' }).map((e) => e.id);
        expect(ids).toEqual(['cerebras:gpt-oss-120b', 'gemini:x']);
    });

    it('skips providers without a key', () => {
        const ids = plan('report', { env: { GEMINI_API_KEY: 'k' } }).map((e) => e.provider);
        expect(new Set(ids)).toEqual(new Set(['gemini']));
    });
});

describe('runTask', () => {
    it('falls through failures to the next model and reports what it tried', async () => {
        const c = clock();
        const calls = [];
        const callModelImpl = async ({ provider, model }) => {
            calls.push(`${provider}:${model}`);
            c.advance(500);
            if (calls.length === 1) { const e = new Error('Groq 503: over capacity'); e.kind = 'unavailable'; throw e; }
            return { text: 'Study three-phase power next.' };
        };
        const out = await runTask({ task: 'report', contents: 'hi' }, { env: ALL_KEYS, callModelImpl, now: c.now });
        expect(out.text).toMatch(/three-phase/);
        expect(out.fallbacks).toBe(1);
        expect(out.tried.map((t) => t.status)).toEqual(['unavailable', 'ok']);
        expect(calls[0]).toBe(chainFor('report', {})[0].id);
    });

    it('cools a model down after a 404 so the next request skips it', async () => {
        const c = clock();
        const first = chainFor('report', {})[0].id;
        const seen = [];
        const callModelImpl = async ({ provider, model }) => {
            const id = `${provider}:${model}`;
            seen.push(id);
            if (id === first) { const e = new Error('model_not_found'); e.kind = 'not_found'; throw e; }
            return { text: 'ok' };
        };
        await runTask({ task: 'report', contents: 'a' }, { env: ALL_KEYS, callModelImpl, now: c.now });
        seen.length = 0;
        await runTask({ task: 'report', contents: 'b' }, { env: ALL_KEYS, callModelImpl, now: c.now });
        expect(seen[0]).not.toBe(first);
    });

    it('rejects a JSON task whose answer is not JSON and tries the next model', async () => {
        const c = clock();
        let n = 0;
        const callModelImpl = async () => { n += 1; return { text: n === 1 ? 'Sorry, I cannot.' : '{"items":[]}' }; };
        const out = await runTask({ task: 'author', contents: 'x' }, { env: ALL_KEYS, callModelImpl, now: c.now });
        expect(out.text).toBe('{"items":[]}');
        expect(out.tried[0].status).toBe('bad_output');
    });

    it('stops when the task budget is spent instead of walking the whole chain', async () => {
        const c = clock();
        let n = 0;
        const callModelImpl = async () => {
            n += 1;
            c.advance(TASKS.report.budgetMs);
            const e = new Error('model timeout'); e.kind = 'timeout'; throw e;
        };
        await expect(runTask({ task: 'report', contents: 'x' }, { env: ALL_KEYS, callModelImpl, now: c.now }))
            .rejects.toMatchObject({ reason: 'exhausted' });
        expect(n).toBe(1);
    });

    it('says unconfigured when no provider has a key', async () => {
        await expect(runTask({ task: 'report', contents: 'x' }, { env: {} })).rejects.toMatchObject({ reason: 'unconfigured' });
    });
});

describe('status', () => {
    it('marks a feature as running on backup when its first model is down', () => {
        const env = ALL_KEYS;
        const first = chainFor('report', env)[0].id;
        health.record(first, { ok: false, kind: 'not_found' });
        const s = status({ env, detailed: true });
        expect(s.tasks.report.state).toBe('backup');
        expect(s.tasks.report.chain[0].state).toBe('down');
        expect(s.providers.groq.configured).toBe(true);
    });

    it('marks slow when the primary model is over its tier line', () => {
        const env = ALL_KEYS;
        const first = chainFor('report', env)[0].id;
        for (let i = 0; i < 3; i++) health.record(first, { ok: true, latencyMs: 20_000 });
        expect(status({ env }).tasks.report.state).toBe('slow');
    });

    it('hides the model chain from learners', () => {
        const s = status({ env: ALL_KEYS });
        expect(s.tasks.report.chain).toBeUndefined();
        expect(s.providers).toBeUndefined();
    });

    it('is unconfigured with no keys', () => {
        expect(status({ env: {} }).tasks.report.state).toBe('unconfigured');
    });
});

describe('model catalog', () => {
    const catalog = require('../src/services/ai/modelCatalog');
    const reportFirst = chainFor('report', {})[0];

    const fakeFetch = (lists) => async (url) => {
        const hit = Object.entries(lists).find(([host]) => url.includes(host));
        if (!hit) return { ok: false, status: 500, json: async () => ({}) };
        const [, v] = hit;
        if (v === 401) return { ok: false, status: 401, json: async () => ({}) };
        if (url.includes('googleapis')) return { ok: true, json: async () => ({ models: v.map((id) => ({ name: `models/${id}` })) }) };
        return { ok: true, json: async () => ({ data: v.map((id) => ({ id })) }) };
    };

    beforeEach(() => catalog.resetCatalog());

    it('skips a model its provider no longer lists and reports it', async () => {
        const env = { GROQ_API_KEY: 'g', GEMINI_API_KEY: 'k' };
        const groqIds = chainFor('report', {}).filter((e) => e.provider === 'groq').map((e) => e.model).filter((m) => m !== reportFirst.model);
        await catalog.refreshCatalog({ env, fetchImpl: fakeFetch({ groq: groqIds, googleapis: ['gemini-2.5-flash-lite'] }) });
        expect(catalog.isListed('groq', reportFirst.model)).toBe(false);
        expect(plan('report', { env }).map((e) => e.id)).not.toContain(reportFirst.id);
        expect(catalog.missingModels(env)).toContain(reportFirst.id);
        const s = status({ env, detailed: true });
        expect(s.tasks.report.chain.find((c) => c.id === reportFirst.id).state).toBe('missing');
        expect(s.providers.groq.catalog.ok).toBe(true);
    });

    it('drops a provider whose key is rejected, and keeps models when the catalog is unreachable', async () => {
        const env = { GROQ_API_KEY: 'bad', OPENROUTER_API_KEY: 'o' };
        await catalog.refreshCatalog({ env, fetchImpl: fakeFetch({ groq: 401 }) });
        expect(catalog.summary().providers.groq).toMatchObject({ ok: false, error: 'API key rejected' });
        expect(plan('report', { env }).some((e) => e.provider === 'groq')).toBe(false);
        // OpenRouter answered 500: unknown, so its models stay in play.
        expect(catalog.isListed('openrouter', 'x')).toBeNull();
        // An exact id stays in play; a pick needs the list, so it stands for nothing.
        const exact = { ...env, AI_CHAIN_REPORT: 'openrouter:openai/gpt-oss-20b:free,openrouter:@pick:gpt-oss' };
        expect(plan('report', { env: exact }).map((e) => e.id)).toEqual(['openrouter:openai/gpt-oss-20b:free']);
    });
});

describe('model picks', () => {
    const catalog = require('../src/services/ai/modelCatalog');
    const env = { GROQ_API_KEY: 'g', OPENROUTER_API_KEY: 'o', GEMINI_API_KEY: 'k' };

    // OpenRouter-shaped list: pricing and input modalities per model.
    const orModel = (id, { price = '0', image = false } = {}) => ({
        id, pricing: { prompt: price, completion: price },
        architecture: { input_modalities: image ? ['text', 'image'] : ['text'] },
    });
    const lists = {
        groq: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3-32b', 'meta-llama/llama-4-maverick-17b-128e-instruct',
            'meta-llama/llama-guard-4-12b', 'whisper-large-v3'].map((id) => ({ id })),
        openrouter: [
            orModel('openai/gpt-oss-120b', { price: '0.0000001' }),
            orModel('openai/gpt-oss-120b:free'),
            orModel('deepseek/deepseek-r1-0528-qwen3-8b:free'),
            orModel('deepseek/deepseek-r1:free'),
            orModel('google/gemma-3-27b-it:free', { image: true }),
            orModel('mistralai/mistral-small-3.2-24b-instruct:free'),
        ],
        googleapis: ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite',
            'gemini-3.1-pro-preview', 'gemini-3.1-pro-preview-customtools', 'gemini-2.5-flash-image'],
    };
    const fetchImpl = async (url) => {
        if (url.includes('googleapis')) return { ok: true, json: async () => ({ models: lists.googleapis.map((id) => ({ name: `models/${id}` })) }) };
        const key = url.includes('groq') ? 'groq' : 'openrouter';
        return { ok: true, json: async () => ({ data: lists[key] }) };
    };

    beforeEach(async () => {
        catalog.resetCatalog();
        await catalog.refreshCatalog({ env, fetchImpl });
    });

    it('takes the shortest listed id for each keyword, free ones only on OpenRouter', () => {
        expect(catalog.expandPick('openrouter', ['gpt-oss-120b', 'deepseek-r1'])).toEqual(['openai/gpt-oss-120b:free', 'deepseek/deepseek-r1:free']);
        expect(catalog.expandPick('gemini', ['gemini-3.1-pro'])).toEqual(['gemini-3.1-pro-preview']);
        expect(catalog.expandPick('groq', ['llama-3.3-70b', 'qwen3-32b', 'llama-4-maverick', 'kimi-k2'])).toEqual(['qwen/qwen3-32b', 'meta-llama/llama-4-maverick-17b-128e-instruct']);
    });

    it('never picks guard, speech or image-generation models', () => {
        expect(catalog.expandPick('groq', ['guard', 'whisper'])).toEqual([]);
        expect(catalog.expandPick('gemini', ['flash-image'])).toEqual([]);
    });

    it('picks only image-reading models for vision', () => {
        expect(catalog.expandPick('openrouter', ['gemma-3-27b', 'mistral-small'], { vision: true })).toEqual(['google/gemma-3-27b-it:free']);
        const vision = catalog.resolveChain('vision', env).map((e) => e.id);
        expect(vision).toContain('groq:meta-llama/llama-4-maverick-17b-128e-instruct');
        expect(vision.every((id) => !id.includes('qwen3-32b'))).toBe(true);
    });

    it('resolves every chain against the live lists, with no model listed as missing', () => {
        for (const id of TASK_IDS) {
            const chain = catalog.resolveChain(id, env);
            expect(chain.every((e) => !e.pick)).toBe(true);
            expect(new Set(chain.map((e) => e.id)).size).toBe(chain.length);
        }
        const author = plan('author', { env }).map((e) => e.id);
        expect(author[0]).toBe('groq:openai/gpt-oss-120b');
        expect(author).toContain('openrouter:openai/gpt-oss-120b:free');
        expect(author).toContain('gemini:gemini-3.1-pro-preview');
        expect(catalog.missingModels(env)).toEqual([]);
        expect(catalog.summary().providers.openrouter.free).toBe(5);
        expect(catalog.picked(env)['groq:@pick:llama-3.3-70b|qwen3-32b|kimi-k2|llama-4-maverick']).toEqual(['qwen/qwen3-32b', 'meta-llama/llama-4-maverick-17b-128e-instruct']);
    });

    it('a pick stands for nothing until its provider list has been read', () => {
        catalog.resetCatalog();
        expect(catalog.resolveChain('report', env).some((e) => e.via)).toBe(false);
        expect(plan('report', { env })[0].id).toBe('groq:openai/gpt-oss-20b');
    });
});
