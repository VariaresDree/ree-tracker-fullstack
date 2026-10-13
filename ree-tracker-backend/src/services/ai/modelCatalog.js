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
const { PROVIDERS, TASK_IDS, chainFor, isProviderConfigured } = require('../../config/aiModels');

const REFRESH_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 15_000;

// provider -> { checkedAt, ok, error?, count?, ids?: Set }
let catalogs = {};
let timer = null;

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

async function listProvider(provider, env, fetchImpl) {
    const p = PROVIDERS[provider];
    const key = env[p.envKey];
    if (p.kind === 'gemini') {
        const ids = new Set();
        let pageToken = '';
        for (let page = 0; page < 10; page += 1) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const data = await fetchJson(url, { 'x-goog-api-key': key }, fetchImpl);
            for (const m of data.models || []) ids.add(String(m.name || '').replace(/^models\//, ''));
            if (!data.nextPageToken) break;
            pageToken = encodeURIComponent(data.nextPageToken);
        }
        return ids;
    }
    const data = await fetchJson(`${p.baseUrl}/models`, { Authorization: `Bearer ${key}` }, fetchImpl);
    return new Set((data.data || []).map((m) => m.id));
}

/** Fetch every configured provider's catalog. Never throws. */
async function refreshCatalog({ env = process.env, fetchImpl = fetch, logger = null } = {}) {
    const providers = Object.keys(PROVIDERS).filter((p) => isProviderConfigured(p, env));
    const next = {};
    await Promise.all(providers.map(async (provider) => {
        try {
            const ids = await listProvider(provider, env, fetchImpl);
            next[provider] = { checkedAt: new Date().toISOString(), ok: true, count: ids.size, ids };
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

const isUnavailable = (provider, model) => isListed(provider, model) === false;

/** Every chain entry whose provider says it doesn't exist. */
function missingModels(env = process.env) {
    const out = new Set();
    for (const task of TASK_IDS) {
        for (const e of chainFor(task, env)) {
            if (isProviderConfigured(e.provider, env) && isUnavailable(e.provider, e.model)) out.add(e.id);
        }
    }
    return [...out];
}

/** For /healthz and the status route: per-provider result, no id lists. */
function summary() {
    return {
        providers: Object.fromEntries(Object.entries(catalogs).map(([p, c]) => [
            p, c.ok ? { ok: true, models: c.count, checkedAt: c.checkedAt } : { ok: false, error: c.error, checkedAt: c.checkedAt },
        ])),
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
    if (timer) clearInterval(timer);
    timer = null;
}

module.exports = { refreshCatalog, startCatalogRefresh, isListed, isUnavailable, missingModels, summary, resetCatalog };
