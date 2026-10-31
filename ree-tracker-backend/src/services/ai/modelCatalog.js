// Checks every model id in the chains against its provider's own model list.
//
// Providers rename and retire models (and free routes come and go), and a
// chain entry that no longer exists would otherwise cost a failed request
// before the router learns it. At boot and every 6 hours, each configured
// provider's catalog is fetched; a model it doesn't list is skipped until the
// next check, and /healthz and the Admin › AI models tab name it. The same
// request proves the API key works.
//
// A provider whose catalog can't be read (network, an outage) is left alone:
// its models stay in play and the router's own failure handling applies.
//
// The same lists resolve `provider:@pick:kw1|kw2` chain entries
// (resolveChain), so a backup slot follows whatever the provider offers now.
const {
    PROVIDERS, TASKS, TASK_IDS, VISION_MODELS, PICK_EXCLUDE, PICK_MAX, PICK_MIN_B, chainFor, isProviderConfigured,
} = require('../../config/aiModels');

// Names of open models that read images, for providers whose list doesn't
// say (Groq). OpenRouter's list states input modalities and that wins.
const VISION_NAME = /(llama-4|vision|scout|maverick|-vl\b|-vl-|gemma-3)/i;

const REFRESH_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 15_000;

// provider -> { checkedAt, ok, error?, count?, ids?: Set, meta?: Map<id, { free, image }> }
let catalogs = {};
let timer = null;
// `provider:model` ids a provider lists but refused with "not found" (Gemini
// keeps retired models in its list for old keys, "no longer available to new
// users"). Treated as unlisted until the next catalog check, which clears this.
let refused = new Set();

/** A listed model answered "not found": skip it, and let picks choose another, until the next check. */
function markRefused(provider, model) {
    refused.add(`${provider}:${model}`);
}

async function fetchJson(url, headers, fetchImpl) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetchImpl(url, { headers, signal: controller.signal });
        if (!res.ok) {
            const err = new Error(`HTTP ${res.status}`);
            err.status = res.status;
            throw err;
        }
        return await res.json();
    } finally {
        clearTimeout(t);
    }
}

const isZero = (v) => v != null && v !== '' && Number(v) === 0;

/** Map of model id -> { free, image } (image null when the list doesn't say). */
async function listProvider(provider, env, fetchImpl) {
    const p = PROVIDERS[provider];
    const key = env[p.envKey];
    const meta = new Map();
    if (p.kind === 'gemini') {
        let pageToken = '';
        for (let page = 0; page < 10; page += 1) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const data = await fetchJson(url, { 'x-goog-api-key': key }, fetchImpl);
            for (const m of data.models || []) {
                meta.set(String(m.name || '').replace(/^models\//, ''), { free: true, image: true });
            }
            if (!data.nextPageToken) break;
            pageToken = encodeURIComponent(data.nextPageToken);
        }
        return meta;
    }
    const data = await fetchJson(`${p.baseUrl}/models`, { Authorization: `Bearer ${key}` }, fetchImpl);
    for (const m of data.data || []) {
        if (!m?.id) continue;
        const free = /:free$/.test(m.id) || (isZero(m.pricing?.prompt) && isZero(m.pricing?.completion));
        const modalities = m.architecture?.input_modalities;
        meta.set(m.id, { free, image: Array.isArray(modalities) ? modalities.includes('image') : null });
    }
    return meta;
}

/** Fetch every configured provider's catalog. Never throws. */
async function refreshCatalog({ env = process.env, fetchImpl = fetch, logger = null } = {}) {
    const providers = Object.keys(PROVIDERS).filter((p) => isProviderConfigured(p, env));
    const next = {};
    await Promise.all(providers.map(async (provider) => {
        try {
            const meta = await listProvider(provider, env, fetchImpl);
            next[provider] = { checkedAt: new Date().toISOString(), ok: true, count: meta.size, ids: new Set(meta.keys()), meta };
        } catch (err) {
            const auth = err.status === 401 || err.status === 403;
            next[provider] = {
                checkedAt: new Date().toISOString(),
                ok: false,
                error: auth ? 'API key rejected' : (err.name === 'AbortError' ? 'timed out' : err.message),
                keyRejected: auth,
            };
        }
    }));
    catalogs = next;
    refused = new Set();
    const missing = missingModels(env);
    logger?.info?.('AI model catalog checked', { providers: summary().providers, missing });
    return { providers: summary().providers, missing };
}

/**
 * true  the provider lists this model
 * false the provider's catalog was read and doesn't list it (or rejected the key)
 * null  not checked, or the catalog couldn't be read
 */
function isListed(provider, model) {
    const c = catalogs[provider];
    if (!c) return null;
    if (c.keyRejected) return false;
    if (!c.ok) return null;
    return c.ids.has(model);
}

const isUnavailable = (provider, model) => refused.has(`${provider}:${model}`) || isListed(provider, model) === false;

function readsImages(provider, id, info) {
    if (PROVIDERS[provider].vision || VISION_MODELS.has(`${provider}:${id}`)) return true;
    if (info?.image != null) return info.image;
    return VISION_NAME.test(id);
}

/** Billions of parameters named in a model id ("qwen3-235b-a22b" → 235), or 0. */
function sizeInName(id) {
    let best = 0;
    for (const m of String(id).matchAll(/(\d+(?:\.\d+)?)b(?![a-z])/gi)) best = Math.max(best, Number(m[1]));
    return best;
}

/** Listed models a pick may choose from: chat models, free ones where it matters. */
function usable(provider, { vision = false } = {}) {
    const c = catalogs[provider];
    if (!c?.ok) return [];
    const freeOnly = !!PROVIDERS[provider].freeOnly;
    return [...c.meta.entries()]
        .filter(([id, info]) => !PICK_EXCLUDE.test(id)
            && !refused.has(`${provider}:${id}`)
            && (!freeOnly || info.free)
            && (!vision || readsImages(provider, id, info)))
        .map(([id]) => id);
}

/**
 * The ids a `@pick` entry stands for right now: for each keyword in order, the
 * shortest listed id containing it (free ones only where the provider is
 * freeOnly), at most PICK_MAX. `*` takes the largest remaining model by the
 * size in its name, if that is at least PICK_MIN_B billion. Empty until the
 * provider's list has been read.
 */
function expandPick(provider, keywords, { vision = false, skip = new Set() } = {}) {
    // `skip`: models already earlier in the chain, so a pick adds a different one.
    const pool = usable(provider, { vision }).filter((id) => !skip.has(id));
    const out = [];
    for (const kw of keywords) {
        if (out.length >= PICK_MAX) break;
        const rest = pool.filter((id) => !out.includes(id));
        let candidates;
        if (kw === '*') {
            candidates = rest.filter((id) => sizeInName(id) >= PICK_MIN_B)
                .sort((a, b) => sizeInName(b) - sizeInName(a) || a.length - b.length || a.localeCompare(b));
        } else {
            const needle = kw.toLowerCase();
            // Shortest is the plain model rather than a variant of it; ties by name.
            candidates = rest.filter((id) => id.toLowerCase().includes(needle))
                .sort((a, b) => a.length - b.length || a.localeCompare(b));
        }
        if (candidates.length) out.push(candidates[0]);
    }
    return out;
}

/** For /healthz: the chat models each open-model provider offers (free ones on OpenRouter). */
function offered(env = process.env) {
    const out = {};
    for (const provider of Object.keys(PROVIDERS)) {
        if (PROVIDERS[provider].kind !== 'openai' || !isProviderConfigured(provider, env) || !catalogs[provider]?.ok) continue;
        out[provider] = usable(provider).sort();
    }
    return out;
}

/**
 * A task's chain with every `@pick` replaced by the models it resolves to.
 * Resolved entries carry `via` (the pick's id) so the panel can say so.
 */
function resolveChain(taskId, env = process.env) {
    const task = TASKS[taskId] || TASKS.general;
    const seen = new Set();
    const out = [];
    for (const e of chainFor(taskId, env)) {
        const skip = new Set(out.filter((x) => x.provider === e.provider).map((x) => x.model));
        const expanded = e.pick
            ? expandPick(e.provider, e.pick, { vision: !!task.vision, skip })
                .map((model) => ({ id: `${e.provider}:${model}`, provider: e.provider, model, via: e.id }))
            : [e];
        for (const x of expanded) {
            if (seen.has(x.id)) continue;
            seen.add(x.id);
            out.push(x);
        }
    }
    return out;
}

/** Every exact chain entry whose provider says it doesn't exist. */
function missingModels(env = process.env) {
    const out = new Set();
    for (const task of TASK_IDS) {
        for (const e of chainFor(task, env)) {
            if (!e.pick && isProviderConfigured(e.provider, env) && isUnavailable(e.provider, e.model)) out.add(e.id);
        }
    }
    return [...out];
}

/**
 * For /healthz: per feature, the models it will try in order, picks resolved,
 * leaving out providers without a key and models their provider doesn't list.
 */
function chains(env = process.env) {
    return Object.fromEntries(TASK_IDS.map((taskId) => [
        taskId,
        resolveChain(taskId, env)
            .filter((e) => isProviderConfigured(e.provider, env) && !isUnavailable(e.provider, e.model))
            .map((e) => e.id),
    ]));
}

/** For /healthz and the status route: per-provider result, no id lists. */
function summary() {
    return {
        providers: Object.fromEntries(Object.entries(catalogs).map(([p, c]) => {
            if (!c.ok) return [p, { ok: false, error: c.error, checkedAt: c.checkedAt }];
            const row = { ok: true, models: c.count, checkedAt: c.checkedAt };
            if (PROVIDERS[p].freeOnly) row.free = [...c.meta.values()].filter((m) => m.free).length;
            return [p, row];
        })),
    };
}

function startCatalogRefresh(opts = {}) {
    if (timer) return;
    refreshCatalog(opts);
    timer = setInterval(() => refreshCatalog(opts), REFRESH_MS);
    timer.unref?.();
}

function resetCatalog() {
    catalogs = {};
    refused = new Set();
    if (timer) clearInterval(timer);
    timer = null;
}

module.exports = {
    refreshCatalog, startCatalogRefresh, isListed, isUnavailable, markRefused, missingModels, summary, resetCatalog,
    expandPick, resolveChain, chains, offered, sizeInName,
};
