// src/services/serverErrorCapture.js
//
// A log transport that sends this server's error-level lines to Admin › App
// health, so reading them doesn't take a trip to Render's logs. Only the
// message, the error text, its stack and the path are kept, never the rest of
// a line's meta. Lines are grouped in memory and written once a minute, so a
// burst during an outage costs a few writes, not one per line.
const winston = require('winston');
const { recordErrors } = require('./appHealthService');

const FLUSH_MS = 60_000;
const MAX_DISTINCT = 50;

class ServerErrorCapture extends winston.Transport {
    constructor({ record = recordErrors, flushMs = FLUSH_MS, version = process.env.RENDER_GIT_COMMIT } = {}) {
        super({ level: 'error' });
        this.record = record;
        this.version = version ? version.slice(0, 7) : undefined; // as the app shortens its own
        this.pending = new Map();
        this.timer = setInterval(() => this.flush(), flushMs);
        this.timer.unref();
    }

    log(info, callback) {
        const message = [info.message, info.error].filter(Boolean).join(': ');
        const held = this.pending.get(message);
        if (held) held.count += 1;
        else if (this.pending.size < MAX_DISTINCT) {
            this.pending.set(message, {
                message,
                stack: typeof info.stack === 'string' ? info.stack : undefined,
                route: typeof info.path === 'string' ? info.path.split('?')[0].slice(0, 200) : undefined,
                version: this.version,
                count: 1,
            });
        }
        callback();
    }

    async flush() {
        if (this.pending.size === 0) return;
        const items = [...this.pending.values()];
        this.pending.clear();
        await this.record(items, 'server');
    }
}

module.exports = ServerErrorCapture;
