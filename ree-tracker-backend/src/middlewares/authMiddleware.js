// src/middlewares/authMiddleware.js
const { getAuth } = require('firebase-admin/auth');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// First-write bootstrap: the very first time we see a Firebase UID we make
// sure a matching User row exists in Postgres so downstream upserts /
// foreign-key writes (telemetry, leaderboard, etc.) don't fail with P2025.
// Keep an in-memory cache of UIDs we've already verified so we don't hit
// the DB on every authenticated request.
const ensuredUsers = new Set();

async function ensureUserExists(decoded) {
    if (ensuredUsers.has(decoded.uid)) return;
    try {
        await prisma.user.upsert({
            where: { id: decoded.uid },
            update: { lastActive: new Date() },
            create: {
                id: decoded.uid,
                email: decoded.email || null,
                displayName: decoded.name || (decoded.email ? decoded.email.split('@')[0] : null),
                photoURL: decoded.picture || null,
                lastActive: new Date(),
            },
        });
        ensuredUsers.add(decoded.uid);
    } catch (err) {
        // Don't block the request if the upsert fails — the per-route handler
        // will surface the real error. Just log it for diagnosis.
        logger.warn('user-ensure upsert failed', { uid: decoded.uid, error: err.message });
    }
}

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('Missing or malformed auth token', { route: req.originalUrl });
            return res.status(401).json({ error: 'No authentication token provided.' });
        }

        const token = authHeader.split('Bearer ')[1];

        const decodedToken = await getAuth().verifyIdToken(token);

        req.user = {
            id: decodedToken.uid,
            email: decodedToken.email || null,
            name: decodedToken.name || null,
            picture: decodedToken.picture || null,
        };

        // Fire-and-await — first call per UID hits the DB, subsequent calls
        // are O(1) Set lookups. ~1ms amortized cost.
        await ensureUserExists(decodedToken);

        next();
    } catch (error) {
        logger.error('Auth verification failed', { route: req.originalUrl, error: error.message });
        res.status(401).json({ error: 'Unauthorized: Session expired or invalid. Token refresh required.' });
    }
};

module.exports.ensuredUsers = ensuredUsers;
