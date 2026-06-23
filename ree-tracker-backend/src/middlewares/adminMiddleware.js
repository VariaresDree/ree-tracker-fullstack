// Admin gate. Runs *after* authMiddleware — assumes req.user is set.
// Checks User.role in Postgres; cached briefly to avoid re-querying on bursts.
const prisma = require('../config/db');
const logger = require('../utils/logger');

const cache = new Map(); // uid -> { role, expiresAt }
const TTL_MS = 60_000;

module.exports = async (req, res, next) => {
    try {
        if (!req.user?.id) return res.status(401).json({ error: 'Unauthenticated.' });

        const now = Date.now();
        const hit = cache.get(req.user.id);
        if (hit && hit.expiresAt > now) {
            if (hit.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only.' });
            return next();
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { role: true },
        });
        cache.set(req.user.id, { role: user?.role, expiresAt: now + TTL_MS });

        if (user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only.' });
        next();
    } catch (err) {
        logger.error('admin gate failed', { error: err.message });
        return res.status(500).json({ error: 'Authorization check failed.' });
    }
};
