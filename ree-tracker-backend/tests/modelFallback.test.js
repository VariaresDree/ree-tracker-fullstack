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
        expect(plan('report', { env }).some((e) => e.provider === 'openrouter')).toBe(true);
    });
});
