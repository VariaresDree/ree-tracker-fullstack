#!/usr/bin/env node
/*
 * One-time repair for the ActivityLog / QuestionAttempt drift (tally-integrity
 * fix). ActivityLog.count used to be incremented by the INTENDED size of a
 * telemetry batch, but createMany({ skipDuplicates: true }) can insert fewer
 * rows than that when a race trims duplicates — so ActivityLog silently drifted
 * above the real QuestionAttempt count over time, and the Dashboard KPI (which
 * counts QuestionAttempt directly) permanently disagreed with the Profile
 * Consistency Matrix (which summed ActivityLog).
 *
 * analyticsRoutes now derives the calendar directly from QuestionAttempt, so
 * that display-side drift can't recur — but the ActivityLog table itself is
 * still the streak ledger (telemetryService's global-streak advance reads it),
 * so it needs to be brought back in line with reality rather than abandoned.
 *
 * This rebuilds every user's ActivityLog rows from a fresh rollup of their
 * actual QuestionAttempt history, bucketed the same way the dashboard route
 * now buckets it: COALESCE(answeredAt, createdAt), correctly converted to a
 * Manila calendar day (see utils/manilaDate.js's manilaDaySql).
 *
 * FIXED: this script previously used a single-step `AT TIME ZONE 'Asia/Manila'`
 * on the naive-UTC column, which LOCALIZES rather than CONVERTS — a 16-hour
 * error that misdated the majority of rows (confirmed live: 79%) in the
 * ActivityLog it wrote. Any ledger produced by a prior run of this script is
 * corrupted; re-running with the fix rebuilds it correctly from the
 * (unaffected) QuestionAttempt source of truth.
 *
 * Usage:
 *   node scripts/repairActivityLog.js            # apply
 *   node scripts/repairActivityLog.js --dry-run  # report only, no writes
 *
 * Idempotent: always rebuilds from the QuestionAttempt source of truth, so
 * re-running is a no-op once the ledger is correct.
 */
require('dotenv').config();
const prisma = require('../src/config/db');
const { Prisma } = require('@prisma/client');
const { manilaDaySql } = require('../src/utils/manilaDate');

function parseArgs(argv) {
  const out = { dryRun: false };
  for (const a of argv.slice(2)) if (a === '--dry-run') out.dryRun = true;
  return out;
}

async function main() {
  const { dryRun } = parseArgs(process.argv);
  const tStart = Date.now();
  console.log(`[repairActivityLog] start  dryRun=${dryRun}`);

  const rows = await prisma.$queryRaw`
    SELECT
      qa."userId" AS "userId",
      ${manilaDaySql(Prisma.sql`COALESCE(qa."answeredAt", qa."createdAt")`)} AS "day",
      COUNT(*)::int AS "count"
    FROM "QuestionAttempt" qa
    GROUP BY 1, 2
  `;

  const byUser = new Map();
  for (const r of rows) {
    if (!byUser.has(r.userId)) byUser.set(r.userId, []);
    byUser.get(r.userId).push({ day: r.day, count: r.count });
  }

  let usersProcessed = 0;
  let daysWritten = 0;
  let mismatchesFound = 0;

  for (const [userId, days] of byUser) {
    const existing = await prisma.activityLog.findMany({ where: { userId } });
    const existingByDay = new Map(existing.map((e) => [e.date, e.count]));
    const correctByDay = new Map(days.map((d) => [d.day, d.count]));

    const allDays = new Set([...existingByDay.keys(), ...correctByDay.keys()]);
    const userMismatches = [...allDays].filter(
      (d) => (existingByDay.get(d) || 0) !== (correctByDay.get(d) || 0),
    );

    if (userMismatches.length > 0) {
      mismatchesFound += userMismatches.length;
      if (dryRun) {
        console.log(`[repairActivityLog]   user=${userId}  ${userMismatches.length} day(s) drifted:`);
        for (const d of userMismatches.slice(0, 10)) {
          console.log(`[repairActivityLog]     ${d}: was ${existingByDay.get(d) || 0} -> correct ${correctByDay.get(d) || 0}`);
        }
      } else {
        await prisma.$transaction([
          prisma.activityLog.deleteMany({ where: { userId } }),
          ...(days.length > 0
            ? [prisma.activityLog.createMany({ data: days.map((d) => ({ userId, date: d.day, count: d.count })) })]
            : []),
        ]);
        daysWritten += days.length;
      }
    }
    usersProcessed += 1;
  }

  const ms = Date.now() - tStart;
  console.log(
    `[repairActivityLog] done  usersProcessed=${usersProcessed}  usersWithDrift=${mismatchesFound > 0 ? '(see above)' : 0}  mismatchedDays=${mismatchesFound}  daysWritten=${dryRun ? 0 : daysWritten}  ${ms}ms`,
  );
  if (dryRun && mismatchesFound > 0) {
    console.log('[repairActivityLog] dry run only — re-run without --dry-run to apply.');
  }
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('[repairActivityLog] failed', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { parseArgs };
