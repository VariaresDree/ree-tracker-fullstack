// Recent outcomes per model, so the router can skip one that is failing and
// the app can say "AI is slow" or "AI is down" instead of a spinner that hangs.
//
// In memory, per process: Render runs one instance, and a restart forgetting
// a bad minute is fine. Each `provider:model` keeps its last WINDOW outcomes.
//
// Cool-downs:
//   not_found       the model id is gone (or never existed): skip 10 minutes
//   auth            the key is wrong: skip 10 minutes
//   rate_limited    skip 45 seconds
//   3 failures in a row within 3 minutes: skip 60 seconds
// A cooled-down model is still tried when nothing else in the chain is left.

const WINDOW = 20;
const SLOW_MS = { fast: 8_000, accurate: 45_000 };
const COOLDOWN_MS = {
    not_found: 10 * 60_000,
    auth: 10 * 60_000,
    rate_limited: 45_000,
    streak: 60_000,
};
const STREAK = 3;
const STREAK_WINDOW_MS = 3 * 60_000;

const stats = new Map(); // id -> { outcomes: [{ ok, kind, latencyMs, at, error }], coolUntil, coolReason }

function entry(id) {
    let s = stats.get(id);
    if (!s) {
        s = { outcomes: [], coolUntil: 0, coolReason: null };
        stats.set(id, s);
    }
    return s;
}

function record(id, { ok, kind = ok ? 'ok' : 'other', latencyMs = 0, error = null }, now = Date.now()) {
    const s = entry(id);
    s.outcomes.push({ ok, kind, latencyMs, at: now, error: error ? String(error).slice(0, 200) : null });
    if (s.outcomes.length > WINDOW) s.outcomes.shift();

    if (ok) {
        s.coolUntil = 0;
        s.coolReason = null;
        return;
    }
    if (COOLDOWN_MS[kind]) {
        s.coolUntil = now + COOLDOWN_MS[kind];
        s.coolReason = kind;
        return;
    }
    const recent = s.outcomes.slice(-STREAK);
    if (recent.length === STREAK && recent.every((o) => !o.ok && now - o.at < STREAK_WINDOW_MS)) {
        s.coolUntil = now + COOLDOWN_MS.streak;
        s.coolReason = 'failing';
    }
}

const isCooling = (id, now = Date.now()) => (stats.get(id)?.coolUntil || 0) > now;

function median(nums) {
    if (!nums.length) return null;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * One model's recent record. `state` is what the status panel shows:
 *   unknown   no calls yet
 *   ok        recent calls succeed at a normal speed
 *   slow      they succeed, but the median is over the tier's slow line
 *   degraded  some recent calls failed
 *   down      cooling down, or the last calls all failed
 */
function summary(id, tier = 'fast', now = Date.now()) {
    const s = stats.get(id);
    if (!s || !s.outcomes.length) return { state: 'unknown', calls: 0 };
    const last = s.outcomes.slice(-10);
    const okOnes = last.filter((o) => o.ok);
    const successRate = okOnes.length / last.length;
    const medianMs = median(okOnes.map((o) => o.latencyMs));
    const lastOutcome = s.outcomes[s.outcomes.length - 1];
    const lastFailure = [...s.outcomes].reverse().find((o) => !o.ok) || null;

    let state = 'ok';
    if (isCooling(id, now) || okOnes.length === 0) state = 'down';
    else if (successRate < 0.7) state = 'degraded';
    else if (medianMs != null && medianMs > (SLOW_MS[tier] || SLOW_MS.fast)) state = 'slow';

    return {
        state,
        calls: s.outcomes.length,
        successRate: Math.round(successRate * 100) / 100,
        medianMs,
        lastAt: new Date(lastOutcome.at).toISOString(),
        lastOk: lastOutcome.ok,
        coolingUntil: isCooling(id, now) ? new Date(s.coolUntil).toISOString() : null,
        coolReason: isCooling(id, now) ? s.coolReason : null,
        lastError: lastFailure ? { kind: lastFailure.kind, message: lastFailure.error, at: new Date(lastFailure.at).toISOString() } : null,
    };
}

function reset() {
    stats.clear();
}

module.exports = { record, isCooling, summary, reset, SLOW_MS, COOLDOWN_MS };
