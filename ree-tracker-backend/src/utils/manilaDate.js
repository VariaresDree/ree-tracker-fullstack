// src/utils/manilaDate.js
// Single source of truth for Asia/Manila calendar-day bucketing, backend-wide.
// Mirrors ree-tracker/src/utils/manilaDate.js (the frontend counterpart) so
// "today" means the same thing in both places.
//
// Three modules (telemetryService, analyticsDeepRoutes, readinessRoutes) used
// to each declare their own `MANILA_FMT` — harmless on its own, but it meant
// there was no single place to fix when the raw-SQL sibling bug (below) was
// found. Collapsed onto this file so there's exactly one Manila-day
// implementation to reason about.
const { Prisma } = require('@prisma/client');

const MANILA_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });

// YYYY-MM-DD in Manila time (en-CA locale yields the ISO-like shape). Safe to
// call on a genuine JS Date/instant — Prisma Client always hands back real
// UTC instants for DateTime columns, so Intl's timeZone conversion is correct
// here even though the column itself is a naive `timestamp` (see manilaDaySql
// below for why the RAW-SQL equivalent is not this simple).
function todayManila() {
    return MANILA_FMT.format(new Date());
}

// Manila "yesterday". Manila is a fixed UTC+8 with no DST, so subtracting a
// flat 24h is always correct (no spring-forward/fall-back edge cases).
function yesterdayManila() {
    return MANILA_FMT.format(new Date(Date.now() - 86400000));
}

// Manila calendar date of an arbitrary Date/instant.
function manilaDateOf(d) {
    return MANILA_FMT.format(d instanceof Date ? d : new Date(d));
}

// Manila calendar-day bucketing expression for use INSIDE a $queryRaw tagged
// template, e.g.:
//   prisma.$queryRaw`SELECT ${manilaDaySql(Prisma.sql`qa."createdAt"`)} AS day, ...`
//
// `columnExpr` must be a trusted Prisma.sql/Prisma.raw fragment (a column
// reference or COALESCE(...) of columns) — never interpolated user input;
// this helper does not parameterize it.
//
// WHY THIS IS TWO STEPS, NOT ONE:
// schema.prisma has no `@db.Timestamptz` anywhere, so every DateTime column
// is `timestamp without time zone` — Postgres stores it "naive" with no zone
// attached, even though the application always writes genuine UTC instants
// into it (`new Date()` via Prisma Client).
//
// `col AT TIME ZONE 'Asia/Manila'` on a NAIVE timestamp does not CONVERT it —
// it LOCALIZES it: Postgres treats the stored digits as already being Manila
// wall-clock time and attaches that zone, which is backwards. Confirmed live
// against production: a value that is actually 2026-08-09 01:00 UTC (Manila
// 09:00) rendered as 2026-08-08 17:00 under the single-step expression —
// shifted a full 16 hours, landing on the wrong calendar day for anything
// answered before 16:00 Manila (measured: 826 of 1049 attempts, 79%).
//
// The fix reattaches the zone the value ACTUALLY is in first (naive -> UTC
// timestamptz — a real instant, since that's what it is), then converts that
// real instant to Manila wall-clock time:
function manilaDaySql(columnExpr) {
    return Prisma.sql`to_char(${columnExpr} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD')`;
}

module.exports = { todayManila, yesterdayManila, manilaDateOf, manilaDaySql };
