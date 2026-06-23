require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const REQUIRED_ENV = ['DATABASE_URL', 'GEMINI_API_KEY'];
const FIREBASE_JSON_PATH = path.join(__dirname, 'firebase-service-account.json');
const FIREBASE_ENV_KEYS = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];

function validateEnv() {
    const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
    const hasFirebaseFile = fs.existsSync(FIREBASE_JSON_PATH);
    const hasFirebaseEnv = FIREBASE_ENV_KEYS.every((k) => !!process.env[k]);
    if (!hasFirebaseFile && !hasFirebaseEnv) {
        missing.push('Firebase credentials (firebase-service-account.json OR FIREBASE_PROJECT_ID+FIREBASE_CLIENT_EMAIL+FIREBASE_PRIVATE_KEY)');
    }
    if (missing.length) {
        console.error('\n[BOOT] Missing required environment configuration:');
        missing.forEach((m) => console.error(`  - ${m}`));
        console.error('\nSet these in .env (local) or your hosting environment (Vercel/Render/etc.) and restart.\n');
        process.exit(1);
    }
    return { hasFirebaseFile, hasFirebaseEnv };
}

function initFirebase({ hasFirebaseFile }) {
    if (hasFirebaseFile) {
        initializeApp({ credential: cert(require(FIREBASE_JSON_PATH)) });
    } else {
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
    }
}

async function bootstrap() {
    const envState = validateEnv();
    initFirebase(envState);

    // Defer prisma + route loading until after env validation
    const prisma = require('./src/config/db');
    const { createServer } = require('http');
    const { Server } = require('socket.io');
    const { setupBattleSocket } = require('./src/sockets/battleSocket');
    const logger = require('./src/utils/logger');

    // Sanity-check DB up front so a misconfigured DATABASE_URL fails fast
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
        console.error('[BOOT] Database connectivity check failed:', err.message);
        process.exit(1);
    }

    const app = express();
    const httpServer = createServer(app);

    app.set('trust proxy', 1);

    app.use(cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    }));
    app.use(express.json({ limit: '2mb' }));

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
        keyGenerator: (req) => req.headers.authorization || req.ip,
        message: { error: 'Rate limit exceeded for /leaderboard/me.' },
    });

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
    app.use('/api/battles', require('./src/routes/battleRoutes'));
    app.use('/api/srs', require('./src/routes/srsRoutes'));
    app.use('/api/analytics/study-sessions', require('./src/routes/studySessionRoutes'));
    app.use('/api/user', require('./src/routes/plannerRoutes'));
    app.use('/api/smart-drill', require('./src/routes/smartDrillRoutes'));
    app.use('/api/readiness', require('./src/routes/readinessRoutes'));
    app.use('/api/analytics/deep', require('./src/routes/analyticsDeepRoutes'));
    app.use('/api/forecast', require('./src/routes/forecastRoutes'));

    const startedAt = Date.now();

    app.get('/health', (req, res) => res.status(200).json({ status: 'Assessment Core is Online' }));

    app.get('/healthz', async (req, res) => {
        const report = { db: 'ok', firebase: 'ok', gemini: 'ok', uptimeSec: Math.floor((Date.now() - startedAt) / 1000) };
        try { await prisma.$queryRaw`SELECT 1`; } catch { report.db = 'fail'; }
        try { getAuth(); } catch { report.firebase = 'fail'; }
        if (!process.env.GEMINI_API_KEY) report.gemini = 'fail';
        const overall = Object.values(report).every((v) => v === 'ok' || typeof v === 'number');
        res.status(overall ? 200 : 503).json(report);
    });

    app.use((err, req, res, next) => {
        logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
        res.status(500).json({ error: 'Internal Server Error' });
    });

    const io = new Server(httpServer, {
        cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true },
    });
    setupBattleSocket(io);

    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
        logger.info(`Assessment Engine initialized on port ${PORT}`);
        console.log(`[BOOT] env=ok db=ok firebase=ok gemini=ok port=${PORT}`);
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
