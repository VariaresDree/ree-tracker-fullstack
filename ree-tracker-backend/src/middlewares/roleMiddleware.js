// Single source of truth for the admin gate.
//
// There used to be two implementations: middlewares/adminMiddleware.js (60s
// cached, unbounded Map) and this file (uncached, fresh query per request).
// Same rule, different performance and different staleness — and only one of
// them could be fixed at a time. adminMiddleware.js now re-exports this module.
//
// The cache is deliberately short-lived and BOUNDED. A demoted admin keeps
// privilege for at most TTL_MS; making that window explicit is the trade for
// not re-querying User.role on every request of an admin burst (the review
// queue fires many). It is capped so it cannot grow with distinct uids for the
// process lifetime, which the old Map did.
const prisma = require('../config/db');
const logger = require('../utils/logger');

const TTL_MS = 60_000;
const MAX_ENTRIES = 5_000;
const cache = new Map(); // uid -> { role, expiresAt }

function remember(uid, role) {
    // Insertion-ordered eviction; the entries are cheap to rebuild.
    if (cache.size >= MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(uid, { role, expiresAt: Date.now() + TTL_MS });
}

/**
 * Is this user an admin? Returns a boolean rather than sending a response, so
 * handlers can BRANCH on clearance instead of being all-or-nothing gated.
 * POST /api/questions uses it to route non-admin submissions into the pending
 * review queue rather than rejecting them outright.
 */
async function isAdminUser(userId) {
    if (!userId) return false;
    const hit = cache.get(userId);
    if (hit && hit.expiresAt > Date.now()) return hit.role === 'ADMIN';

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    remember(userId, user?.role);
    return user?.role === 'ADMIN';
}

/** Drop a cached role — call after a role change so it takes effect at once. */
function invalidateRole(userId) {
    cache.delete(userId);
}

const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user?.id) return res.status(401).json({ error: 'Unauthenticated.' });
        if (!(await isAdminUser(req.user.id))) {
            return res.status(403).json({ error: 'Admin clearance required.' });
        }
        next();
    } catch (error) {
        logger.error('admin gate failed', { error: error.message });
        res.status(500).json({ error: 'Authorization check failed.' });
    }
};

module.exports = { requireAdmin, isAdminUser, invalidateRole };
