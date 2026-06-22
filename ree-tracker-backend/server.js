require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Initialize Firebase
const { initializeApp, cert } = require('firebase-admin/app');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const { createServer } = require('http');
const { Server } = require('socket.io');
const { setupBattleSocket } = require('./src/sockets/battleSocket');
const logger = require('./src/utils/logger');

const app = express();
const httpServer = createServer(app);

// 1. Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Rate limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Try again later.' }
});
app.use(globalLimiter);

const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'AI rate limit exceeded. Try again in a minute.' }
});

// 2. Route Mounts
const examRoutes = require('./src/routes/examRoutes');
app.use('/api/exams', examRoutes);

const analyticsRoutes = require('./src/routes/analyticsRoutes');
app.use('/api/analytics', analyticsRoutes);

const aiRoutes = require('./src/routes/aiRoutes');
app.use('/api/ai', aiLimiter, aiRoutes);

const questionRoutes = require('./src/routes/questionRoutes');
app.use('/api/questions', questionRoutes);

const materialRoutes = require('./src/routes/materialRoutes');
app.use('/api/materials', materialRoutes);

const metadataRoutes = require('./src/routes/metadataRoutes');
app.use('/api/metadata', metadataRoutes);

const leaderboardRoutes = require('./src/routes/leaderboardRoutes');
app.use('/api/leaderboard', leaderboardRoutes);

const bookmarkRoutes = require('./src/routes/bookmarkRoutes');
app.use('/api/bookmarks', bookmarkRoutes);

const userRoutes = require('./src/routes/userRoutes');
app.use('/api/user', userRoutes);

const configRoutes = require('./src/routes/configRoutes');
app.use('/api/config', configRoutes);

const battleRoutes = require('./src/routes/battleRoutes');
app.use('/api/battles', battleRoutes);

const srsRoutes = require('./src/routes/srsRoutes');
app.use('/api/srs', srsRoutes);

const studySessionRoutes = require('./src/routes/studySessionRoutes');
app.use('/api/analytics/study-sessions', studySessionRoutes);

const plannerRoutes = require('./src/routes/plannerRoutes');
app.use('/api/user', plannerRoutes);

const smartDrillRoutes = require('./src/routes/smartDrillRoutes');
app.use('/api/smart-drill', smartDrillRoutes);

const readinessRoutes = require('./src/routes/readinessRoutes');
app.use('/api/readiness', readinessRoutes);

const analyticsDeepRoutes = require('./src/routes/analyticsDeepRoutes');
app.use('/api/analytics/deep', analyticsDeepRoutes);

// 3. Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Assessment Core is Online' });
});

// 4. Global Error Handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
    res.status(500).json({ error: 'Internal Server Error' });
});

// 5. Socket.IO Setup
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true
    }
});
setupBattleSocket(io);

// 6. Server Boot
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    logger.info(`Assessment Engine initialized on port ${PORT}`);
});
