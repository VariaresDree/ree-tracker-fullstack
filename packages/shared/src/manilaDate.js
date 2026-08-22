// Asia/Manila calendar-day bucketing — the single JS-side definition.
//
// The client and the server each kept their own Intl formatter. They agreed,
// but nothing enforced that: if either side ever changed the locale (en-CA is
// load-bearing — it yields the ISO-like YYYY-MM-DD shape) or the zone, "today"
// would diverge and streaks and daily quotas would silently break on one side.
//
// The backend's manilaDaySql deliberately does NOT live here: it depends on
// Prisma.sql, and the bug it encodes is unrepresentable on the client. Because
// schema.prisma declares no @db.Timestamptz, every DateTime column is a naive
// `timestamp`, and `col AT TIME ZONE 'Asia/Manila'` LOCALIZES rather than
// converts — a 16-hour error that misdated 79% of measured attempts. That helper
// stays in the backend's manilaDate.js, which now re-exports these three
// functions instead of redefining them.

'use strict';

const MANILA_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });

/**
 * YYYY-MM-DD in Manila time. Safe on any genuine JS Date/instant — Prisma always
 * hands back real UTC instants for DateTime columns, so Intl's timeZone
 * conversion is correct here even though the column itself is naive.
 */
function todayManila() {
    return MANILA_FMT.format(new Date());
}

/**
 * Manila "yesterday". Manila is a fixed UTC+8 with no DST, so subtracting a flat
 * 24h is always correct — no spring-forward or fall-back edge cases.
 */
function yesterdayManila() {
    return MANILA_FMT.format(new Date(Date.now() - 86400000));
}

/** Manila calendar date of an arbitrary Date/instant. */
function manilaDateOf(d) {
    return MANILA_FMT.format(d instanceof Date ? d : new Date(d));
}

module.exports = { todayManila, yesterdayManila, manilaDateOf };
