// src/services/tosCache.js
// Caches the GET /api/config/tos RESPONSE — the subject -> [topic names] map.
//
// A singleton, not a uid-keyed store like dashboardCache: the TOS is identical
// for every caller, and the endpoint is not even auth-gated. Modelled on
// featureFlags.js, which caches the other global config table the same way.
//
// WHY: every page load fetches this, it changes only when an admin edits the
// taxonomy, and each miss costs the ~200ms Oregon->Singapore hop for a ~500 byte
// answer. topicResolver already keeps a 5-minute index of the same table, but
// that is a lookup structure for resolving attempt topics, not this payload —
// so the route was querying on every request while a cache of the same rows sat
// beside it.
//
// PUT /api/config/tos invalidates this in the same place it invalidates
// topicResolver, so an admin edit is visible immediately rather than after the
// TTL. On a DB error we serve the stale map if we have one: a taxonomy a few
// minutes old is far better than a 500 on a page-load-critical endpoint.

const prisma = require('../config/db');

const TTL_MS = 5 * 60 * 1000;
let cache = { payload: null, at: 0 };

/**
 * The grouped TOS payload, or null when neither the Topic table nor the legacy
 * SystemConfig blob has anything. Throws only if the DB fails AND nothing has
 * been cached yet, so the route can still answer 500 on a genuinely cold error.
 */
async function getTos() {
    if (cache.payload !== null && Date.now() - cache.at < TTL_MS) return cache.payload;

    try {
        const topics = await prisma.topic.findMany({
            where: { active: true },
            orderBy: [{ subject: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
            select: { subject: true, name: true },
        });

        let payload;
        if (topics.length > 0) {
            const grouped = {};
            for (const t of topics) (grouped[t.subject] ||= []).push(t.name);
            payload = grouped;
        } else {
            // Pre-migrateTaxonomy deploys still read the legacy JSON blob, so
            // the endpoint's shape never changes under the client.
            const config = await prisma.systemConfig.findUnique({ where: { id: 'global_config' } });
            payload = config ? config.tos : null;
        }

        cache = { payload, at: Date.now() };
        return payload;
    } catch (err) {
        if (cache.payload !== null) return cache.payload;   // stale beats 500
        throw err;
    }
}

function invalidateTosCache() {
    cache = { payload: null, at: 0 };
}

module.exports = { getTos, invalidateTosCache, TTL_MS };
