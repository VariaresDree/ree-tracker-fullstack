// src/services/featureFlags.js
// Server-side feature-flag reads (Phase 4.2). The FeatureFlag table (Phase 4.1)
// is tiny and changes only on admin writes, so reads go through a short TTL
// cache — the same pattern as topicResolver. A missing/unreadable table reads
// as "everything off": flags fail CLOSED.
const prisma = require('../config/db');

const TTL_MS = 60 * 1000;
let cache = { flags: null, at: 0 };

async function getFlags() {
    if (cache.flags && Date.now() - cache.at < TTL_MS) return cache.flags;
    try {
        const rows = await prisma.featureFlag.findMany();
        const flags = Object.create(null);
        for (const f of rows) flags[f.key] = { enabled: !!f.enabled, payload: f.payload ?? null };
        cache = { flags, at: Date.now() };
    } catch {
        // DB hiccup: serve the stale map if we have one, else nothing enabled.
        if (!cache.flags) return Object.create(null);
    }
    return cache.flags;
}

async function isFlagEnabled(key) {
    const flags = await getFlags();
    return flags[key]?.enabled === true;
}

// Called by the admin PUT /api/config/flags/:key so toggles apply immediately
// in this process (other processes converge within the TTL).
function invalidateFlagCache() {
    cache = { flags: null, at: 0 };
}

module.exports = { isFlagEnabled, getFlags, invalidateFlagCache };
