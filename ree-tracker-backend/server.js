require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const FIREBASE_JSON_PATH = path.join(__dirname, 'firebase-service-account.json');
const FIREBASE_ENV_KEYS = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];

// Subsystem readiness — populated during bootstrap, read by /healthz and route
// guards. The HTTP server always comes up; degraded subsystems return a clear
// 503 with remediation copy instead of crashing the whole process.
const readiness = {
    db: 'pending',
    firebase: 'pending',
    gemini: 'pending',
    startedAt: Date.now(),
};

function checkEnv() {
    const warnings = [];
    if (!process.env.DATABASE_URL) {
        warnings.push('DATABASE_URL is not set — DB-backed routes will return 503.');
        readiness.db = 'unconfigured';
    }
    if (!process.env.GEMINI_API_KEY) {
        warnings.push('GEMINI_API_KEY is not set — /api/ai/generate will return 503.');
        readiness.gemini = 'unconfigured';
    } else {
        readiness.gemini = 'ok';
    }
    if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
        warnings.push('FRONTEND_URL is not set in production — CORS will accept ANY origin. Set it to your Vercel URL.');
    }
    const hasFirebaseFile = fs.existsSync(FIREBASE_JSON_PATH);
    const hasFirebaseEnv = FIREBASE_ENV_KEYS.every((k) => !!process.env[k]);
    if (!hasFirebaseFile && !hasFirebaseEnv) {
        warnings.push('Firebase credentials missing — authenticated routes will return 503.');
        readiness.firebase = 'unconfigured';
    }
    if (warnings.length) {
        console.warn('\n[BOOT] Configuration warnings:');
        warnings.forEach((w) => console.warn(`  - ${w}`));
        console.warn('Server will still start. Set the missing variables to enable the affected features.\n');
    }
    return { hasFirebaseFile, hasFirebaseEnv };
}

function initFirebase({ hasFirebaseFile, hasFirebaseEnv }) {
    try {
        if (hasFirebaseFile) {
            initializeApp({ credential: cert(require(FIREBASE_JSON_PATH)) });
            readiness.firebase = 'ok';
        } else if (hasFirebaseEnv) {
            initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
            });
            readiness.firebase = 'ok';
        }
    } catch (err) {
        console.error('[BOOT] Firebase init failed:', err.message);
        readiness.firebase = 'fail';
    }
}

async function bootstrap() {
    const envState = checkEnv();
    initFirebase(envState);

    const prisma = require('./src/config/db');
    const { createServer } = require('http');
    const { Server } = require('socket.io');
    const { setupBattleSocket } = require('./src/sockets/battleSocket');
    const logger = require('./src/utils/logger');

    // Probe the DB but never abort boot on failure — degraded mode lets the
    // frontend circuit breaker show a banner instead of seeing every request
    // fail with a connection refused.
    if (readiness.db !== 'unconfigured') {
        try {
            await prisma.$queryRaw`SELECT 1`;
            readiness.db = 'ok';
        } catch (err) {
            console.error('[BOOT] DB connectivity check failed:', err.message);
            readiness.db = 'fail';
        }
    }

    const app = express();
    const httpServer = createServer(app);

    app.set('trust proxy', 1);

    const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:4173',
    ].filter(Boolean);

    // Strict when FRONTEND_URL is set (production): unknown origins get no
    // CORS headers, so browsers block them. Permissive only as dev fallback.
    const { makeOriginCheck } = require('./src/utils/corsOrigin');
    app.use(cors({
        origin: makeOriginCheck(allowedOrigins, { strict: !!process.env.FRONTEND_URL }),
        credentials: true,
    }));
    app.use(express.json({ limit: '2mb' }));

    // Static mount for the local-disk storage driver. Harmless when the S3
    // driver is in use — the folder simply stays empty.
    const storage = require('./src/services/storage');
    app.use('/uploads', express.static(storage.LOCAL_DIR));

    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests. Try again later.' },
    });
    app.use(globalLimiter);

    const aiLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'AI rate limit exceeded. Try again in a minute.' },
    });

    const meRateLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 60,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req, res) => req.headers.authorization || ipKeyGenerator(req, res),
        message: { error: 'Rate limit exceeded for /leaderboard/me.' },
    });

    const battleLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 60,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req, res) => req.headers.authorization || ipKeyGenerator(req, res),
        message: { error: 'Battle rate limit exceeded. Slow down.' },
    });

    // Subsystem guards — return a clear remediation message instead of letting
    // every downstream call blow up.
    const requireDb = (req, res, next) => {
        if (readiness.db === 'ok') return next();
        return res.status(503).json({
            error: 'Database temporarily unavailable.',
            subsystem: 'db',
            status: readiness.db,
            hint: readiness.db === 'unconfigured'
                ? 'DATABASE_URL is not configured on the server.'
                : 'The database connection is down. Retry in a moment.',
        });
    };
    const requireFirebase = (req, res, next) => {
        if (readiness.firebase === 'ok') return next();
        return res.status(503).json({
            error: 'Authentication temporarily unavailable.',
            subsystem: 'firebase',
            status: readiness.firebase,
        });
    };

    // Every protected mount needs both DB + Firebase.
    app.use('/api', requireFirebase, requireDb);

    app.use('/api/exams', require('./src/routes/examRoutes'));
    app.use('/api/analytics', require('./src/routes/analyticsRoutes'));
    app.use('/api/ai', aiLimiter, require('./src/routes/aiRoutes'));
    app.use('/api/questions', require('./src/routes/questionRoutes'));
    app.use('/api/materials', require('./src/routes/materialRoutes'));
    app.use('/api/metadata', require('./src/routes/metadataRoutes'));
    app.use('/api/leaderboard/me', meRateLimiter);
    app.use('/api/leaderboard', require('./src/routes/leaderboardRoutes'));
    app.use('/api/bookmarks', require('./src/routes/bookmarkRoutes'));
    app.use('/api/user', require('./src/routes/userRoutes'));
    app.use('/api/config', require('./src/routes/configRoutes'));
    app.use('/api/battles', battleLimiter, require('./src/routes/battleRoutes'));
    app.use('/api/srs', require('./src/routes/srsRoutes'));
    app.use('/api/analytics/study-sessions', require('./src/routes/studySessionRoutes'));
    app.use('/api/user', require('./src/routes/plannerRoutes'));
    app.use('/api/smart-drill', require('./src/routes/smartDrillRoutes'));
    app.use('/api/readiness', require('./src/routes/readinessRoutes'));
    app.use('/api/analytics/deep', require('./src/routes/analyticsDeepRoutes'));
    app.use('/api/forecast', require('./src/routes/forecastRoutes'));
    app.use('/api/reference', require('./src/routes/referenceRoutes'));
    app.use('/api/admin', require('./src/routes/adminRoutes'));
    app.use('/api/review', require('./src/routes/reviewRoutes'));

    app.get('/health', (req, res) => res.status(200).json({ status: 'Assessment Core is Online' }));

    app.get('/healthz', async (req, res) => {
        const report = {
            db: readiness.db,
            firebase: readiness.firebase,
            gemini: readiness.gemini,
            uptimeSec: Math.floor((Date.now() - readiness.startedAt) / 1000),
        };
        // Live-probe the DB if it was previously down so it can self-heal.
        if (readiness.db !== 'ok' && readiness.db !== 'unconfigured') {
            try { await prisma.$queryRaw`SELECT 1`; readiness.db = 'ok'; report.db = 'ok'; }
            catch { /* keep prior state */ }
        }
        const allGreen = report.db === 'ok' && report.firebase === 'ok'
            && (report.gemini === 'ok' || report.gemini === 'unconfigured');
        res.status(allGreen ? 200 : 503).json(report);
    });

    // Consistent JSON 404 for unmatched routes (must come before the error handler).
    app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

    app.use((err, req, res, next) => {
        logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
        res.status(500).json({ error: 'Internal Server Error' });
    });

    const io = new Server(httpServer, {
        cors: { origin: allowedOrigins.length ? allowedOrigins : 'http://localhost:5173', credentials: true },
    });
    if (readiness.firebase === 'ok' && readiness.db === 'ok') {
        setupBattleSocket(io);
    } else {
        console.warn('[BOOT] Battle socket NOT initialized — firebase or db unavailable.');
    }

    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
        logger.info(`Assessment Engine initialized on port ${PORT}`);
        console.log(`[BOOT] env=${readiness.db === 'ok' ? 'ok' : 'degraded'} db=${readiness.db} firebase=${readiness.firebase} gemini=${readiness.gemini} port=${PORT}`);
    });

    const shutdown = async (signal) => {
        console.log(`[SHUTDOWN] received ${signal}, draining...`);
        httpServer.close(() => {});
        try { await prisma.$disconnect(); } catch {}
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => {
        logger.error('unhandledRejection', { reason: String(reason) });
    });
    process.on('uncaughtException', (err) => {
        logger.error('uncaughtException', { error: err.message, stack: err.stack });
    });
}

bootstrap().catch((err) => {
    console.error('[BOOT] Bootstrap failed:', err);
    process.exit(1);
});

module.exports = { readiness };
