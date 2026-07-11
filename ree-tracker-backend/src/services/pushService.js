// src/services/pushService.js
// FCM push sending (Phase 4.2). Uses the SAME firebase-admin app server.js
// already initializes with the service account — no extra secrets. The whole
// pipeline is gated by the `push-notifications` feature flag (fails closed),
// and sending never throws: a push is best-effort by definition.
const { getMessaging } = require('firebase-admin/messaging');
const prisma = require('../config/db');
const { isFlagEnabled } = require('./featureFlags');
const logger = require('../utils/logger');

// FCM error codes that mean "this token is dead — stop sending to it".
const DEAD_TOKEN_CODES = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
    'messaging/invalid-argument',
]);

/**
 * Pure: pair each token with its send response and split into delivered vs
 * dead (prunable) vs transient failures. Exported for tests.
 *
 * @param {string[]} tokens - in the order they were sent
 * @param {Array<{success: boolean, error?: {code?: string}}>} responses
 */
function partitionSendResults(tokens, responses) {
    const delivered = [];
    const dead = [];
    const failed = [];
    (responses || []).forEach((r, i) => {
        const token = tokens[i];
        if (!token) return;
        if (r?.success) delivered.push(token);
        else if (DEAD_TOKEN_CODES.has(r?.error?.code)) dead.push(token);
        else failed.push(token);
    });
    return { delivered, dead, failed };
}

/**
 * Send a notification to every registered device of one user.
 * Returns a summary ({sent, delivered, pruned, failed}) or null when skipped
 * (flag off / no tokens / messaging unavailable). Never throws.
 *
 * @param {string} userId
 * @param {{title: string, body: string, data?: Object<string,string>}} message
 */
async function sendToUser(userId, { title, body, data = {} } = {}) {
    try {
        if (!(await isFlagEnabled('push-notifications'))) {
            logger.info('push skipped — flag disabled', { userId });
            return null;
        }

        const rows = await prisma.deviceToken.findMany({
            where: { userId },
            select: { token: true },
        });
        if (rows.length === 0) return null;
        const tokens = rows.map((r) => r.token);

        // FCM data values must be strings.
        const stringData = Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)]),
        );

        const res = await getMessaging().sendEachForMulticast({
            tokens,
            notification: { title, body },
            data: stringData,
        });

        const { delivered, dead, failed } = partitionSendResults(tokens, res.responses);
        if (dead.length > 0) {
            await prisma.deviceToken.deleteMany({ where: { token: { in: dead } } });
        }
        if (failed.length > 0) {
            logger.warn('push partial failure', { userId, failed: failed.length });
        }
        return { sent: tokens.length, delivered: delivered.length, pruned: dead.length, failed: failed.length };
    } catch (err) {
        logger.warn('push send failed', { userId, error: err.message });
        return null;
    }
}

module.exports = { sendToUser, partitionSendResults, DEAD_TOKEN_CODES };
