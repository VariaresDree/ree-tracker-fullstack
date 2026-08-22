// src/utils/manilaDate.js
// Asia/Manila calendar-day bucketing for the backend.
//
// The three JS-side helpers now come from @ree/shared, so "today" cannot mean
// two different things in the two packages. Each side used to own its own Intl
// formatter; they agreed, but nothing enforced it — and the locale (en-CA, which
// yields the ISO-like YYYY-MM-DD shape) and the zone are both load-bearing.
//
// manilaDaySql stays HERE, deliberately. It depends on Prisma.sql, and the bug
// it encodes has no client equivalent, so it is not shared code.
const { Prisma } = require('@prisma/client');
const { todayManila, yesterdayManila, manilaDateOf } = require('@ree/shared');

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
