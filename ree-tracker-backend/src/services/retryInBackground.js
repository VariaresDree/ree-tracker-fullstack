// src/services/retryInBackground.js
//
// Re-run a failed, IDEMPOTENT write a few times off the request path. For work
// whose result the caller has already handled (a battle is graded in memory
// before its attempts are persisted), so the retry never delays a response.
//
// In-process and best effort: a restart drops pending retries. Use it only for
// writes that are safe to repeat (deterministic clientAttemptIds) and where a
// lost write is a gap in analytics, not a corrupted total.

'use strict';

const logger = require('../utils/logger');

const DEFAULT_DELAYS = [2000, 8000, 30000];

/**
 * @param {string} label            for logs
 * @param {() => Promise<unknown>} fn the idempotent write
 * @param {{ delays?: number[], onGiveUp?: (err: Error) => void }} [opts]
 */
function retryInBackground(label, fn, { delays = DEFAULT_DELAYS, onGiveUp } = {}) {
    const attempt = (i) => {
        if (i >= delays.length) return;
        const timer = setTimeout(async () => {
            try {
                await fn();
                logger.info(`${label}: background retry succeeded`, { attempt: i + 1 });
            } catch (err) {
                if (i + 1 < delays.length) {
                    attempt(i + 1);
                } else {
                    logger.error(`${label}: background retry gave up`, { attempts: delays.length, error: err.message });
                    onGiveUp?.(err);
                }
            }
        }, delays[i]);
        // Never hold the process open for a retry.
        timer.unref?.();
    };
    attempt(0);
}

module.exports = { retryInBackground, DEFAULT_DELAYS };
