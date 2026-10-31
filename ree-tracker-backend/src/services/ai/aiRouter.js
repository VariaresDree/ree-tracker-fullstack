// Runs one AI request down its task's model chain (config/aiModels).
//
// For each `provider:model` in order: skip it if its provider has no key, skip
// it while it is cooling down (aiHealth) unless nothing else is left, give it
// the task's per-model timeout (never more than what's left of the task's
// total budget), and on any failure move straight to the next. Every outcome
// is recorded, which is what the status panel and the "AI is slow" notices
// read.
const { TASKS, PROVIDERS, isProviderConfigured } = require('../../config/aiModels');
const { callModel, classifyError } = require('./providers');
const health = require('./aiHealth');
const catalog = require('./modelCatalog');
const { parseModelJson } = require('@ree/shared');

class AiUnavailableError extends Error {
    constructor(message, tried, reason) {
        super(message);
        this.tried = tried;
        this.reason = reason; // 'unconfigured' | 'exhausted'
    }
}

function withTimeout(run, ms) {
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            controller.abort();
            const err = new Error(`model timeout after ${ms}ms`);
            err.kind = 'timeout';
            reject(err);
        }, ms);
    });
    return Promise.race([run(controller.signal), timeout]).finally(() => clearTimeout(timer));
}

/** The models this task will try, in order, given what's configured and healthy. */
function plan(taskId, { env = process.env, now = Date.now() } = {}) {
    // A model its provider no longer lists (modelCatalog) is never tried, and
    // `@pick` entries stand for whatever that list offers now.
    const configured = catalog.resolveChain(taskId, env)
        .filter((e) => isProviderConfigured(e.provider, env) && !catalog.isUnavailable(e.provider, e.model));
    const healthy = configured.filter((e) => !health.isCooling(e.id, now));
    const cooling = configured.filter((e) => health.isCooling(e.id, now));
    return [...healthy, ...cooling];
}

async function runTask(
    { task: taskId = 'general', contents, system, json, maxTokens, temperature },
    { env = process.env, callModelImpl = callModel, logger = null, now = () => Date.now() } = {},
) {
    const task = TASKS[taskId] || TASKS.general;
    const models = plan(taskId, { env, now: now() });
    if (!models.length) {
        throw new AiUnavailableError('No AI provider is configured for this feature.', [], 'unconfigured');
    }

    const startedAt = now();
    const tried = [];
    const wantJson = json ?? !!task.json;

    for (const m of models) {
        const remaining = task.budgetMs - (now() - startedAt);
        // Always give the first model a chance; after that, stop when there
        // isn't time left for a useful attempt.
        if (tried.length > 0 && remaining < 3_000) break;
        const timeoutMs = Math.max(3_000, Math.min(task.perModelTimeoutMs, remaining));
        const t0 = now();
        try {
            const { text } = await withTimeout((signal) => callModelImpl({
                provider: m.provider,
                model: m.model,
                system,
                contents,
                json: wantJson,
                maxTokens: maxTokens || task.maxTokens,
                temperature: temperature ?? task.temperature,
                reasoningEffort: task.reasoningEffort,
                signal,
                env,
            }), timeoutMs);
            // A JSON task's answer must be readable here, or the next model
            // gets the turn: a cut-off or malformed answer used to count as a
            // success and fail in the browser with nothing else tried.
            let answer = text;
            if (wantJson) {
                const parsed = parseModelJson(text);
                if (!parsed.ok) {
                    const err = new Error(parsed.message);
                    err.kind = 'bad_output';
                    throw err;
                }
                answer = parsed.text;
            }
            const latencyMs = now() - t0;
            health.record(m.id, { ok: true, latencyMs }, now());
            tried.push({ model: m.model, provider: m.provider, status: 'ok', latencyMs });
            logger?.info?.('AI model success', { task: taskId, model: m.id, latencyMs });
            return {
                text: answer,
                model: m.model,
                provider: m.provider,
                providerLabel: PROVIDERS[m.provider].label,
                latencyMs: now() - startedAt,
                fallbacks: tried.length - 1,
                tried,
            };
        } catch (error) {
            const latencyMs = now() - t0;
            const kind = classifyError(error);
            // Listed but refused (a retired model kept for old keys): out of
            // every chain until the catalog is next checked, not just cooled.
            if (kind === 'not_found') catalog.markRefused(m.provider, m.model);
            health.record(m.id, { ok: false, kind, latencyMs, error: error.message }, now());
            tried.push({ model: m.model, provider: m.provider, status: kind, latencyMs, error: String(error.message).slice(0, 200) });
            logger?.warn?.('AI model fallback', { task: taskId, model: m.id, kind, latencyMs, error: error.message });
        }
    }

    throw new AiUnavailableError('Every AI model for this feature failed or timed out.', tried, 'exhausted');
}

/** The per-task view behind GET /api/ai/status. */
function status({ env = process.env, now = Date.now(), detailed = false } = {}) {
    const providers = Object.fromEntries(Object.entries(PROVIDERS).map(([id, p]) => [
        id, { label: p.label, configured: isProviderConfigured(id, env), envKey: p.envKey, catalog: catalog.summary().providers[id] || null },
    ]));

    const tasks = {};
    for (const [taskId, task] of Object.entries(TASKS)) {
        const chain = catalog.resolveChain(taskId, env).map((e) => {
            const configured = isProviderConfigured(e.provider, env);
            const listed = configured ? catalog.isListed(e.provider, e.model) : null;
            let health_;
            if (!configured) health_ = { state: 'unconfigured', calls: 0 };
            else if (listed === false) health_ = { state: 'missing', calls: 0 };
            else health_ = health.summary(e.id, task.tier, now);
            return {
                id: e.id,
                provider: e.provider,
                providerLabel: PROVIDERS[e.provider].label,
                model: e.model,
                picked: !!e.via,
                configured,
                listed,
                ...health_,
            };
        });
        const usable = chain.filter((c) => c.configured && c.state !== 'missing');
        // The task's state is that of the model it would use first; if that one
        // is down, the next healthy one decides, flagged as running on backup.
        const first = usable.find((c) => c.state !== 'down');
        let state;
        if (!usable.length) state = 'unconfigured';
        else if (!first) state = 'down';
        else if (first.state === 'unknown' || first.state === 'ok') state = first === usable[0] ? 'ok' : 'backup';
        else state = first.state; // slow | degraded
        tasks[taskId] = {
            label: task.label,
            audience: task.audience,
            tier: task.tier,
            state,
            primary: first ? { model: first.model, provider: first.provider, providerLabel: first.providerLabel, medianMs: first.medianMs ?? null } : null,
            ...(detailed ? { perModelTimeoutMs: task.perModelTimeoutMs, budgetMs: task.budgetMs, chain } : {}),
        };
    }
    return { providers: detailed ? providers : undefined, tasks, checkedAt: new Date(now).toISOString() };
}

module.exports = { runTask, plan, status, AiUnavailableError };
