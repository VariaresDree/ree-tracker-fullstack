#!/usr/bin/env node
/*
 * Nightly item recalibration (Phase 3.4). Thin CLI over
 * services/calibrationService.runRecalibration — per-subject Bayesian-anchored
 * JMLE over each user's FIRST attempt per question, storing raw fits in
 * Question.empiricalA/empiricalB/empiricalN, the author-blended served params
 * in irtA/irtB (w = n/(n+30)), and per-subject ability in UserAbility.
 *
 * Usage:
 *   node scripts/calibrate.js              # apply
 *   node scripts/calibrate.js --dry-run    # report only
 *   node scripts/calibrate.js --min-n=20   # min first-attempts per item for an
 *                                          # empirical fit (default 10; below it
 *                                          # the item keeps serving the author blend)
 *
 * Designed to be run by a daily cron (Render: 0 3 * * * Asia/Manila). Safe to
 * run repeatedly; idempotent given the same attempt history (deterministic —
 * no RNG anywhere in the fit).
 */
require('dotenv').config();
const prisma = require('../src/config/db');
const { runRecalibration } = require('../src/services/calibrationService');

function parseArgs(argv) {
  const out = { dryRun: false, minN: 10 };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--min-n=')) out.minN = Number(a.slice(8)) || 10;
  }
  return out;
}

async function main() {
  const { dryRun, minN } = parseArgs(process.argv);
  console.log(`[calibrate] start  dryRun=${dryRun}  minN=${minN}`);

  const report = await runRecalibration({ dryRun, minN });

  for (const [subject, s] of Object.entries(report.subjects)) {
    console.log(
      `[calibrate] ${subject}: responses=${s.responses} persons=${s.persons} ` +
      `itemsFitted=${s.itemsFitted} skippedLowN=${s.itemsSkippedLowN}` +
      (s.thetaRange ? ` theta=[${s.thetaRange.min}, ${s.thetaRange.max}]` : ''),
    );
    for (const it of s.sample || []) {
      console.log(
        `[calibrate]   ${it.id}  n=${it.n}  empirical(a=${it.empiricalA}, b=${it.empiricalB})` +
        `  author(b=${it.authorB})  served(a=${it.servedA}, b=${it.servedB})  w=${it.w}`,
      );
    }
  }
  console.log(
    `[calibrate] done  responses=${report.totals.responses}  itemsFitted=${report.totals.itemsFitted}  ` +
    `skippedLowN=${report.totals.itemsSkippedLowN}  abilitiesUpserted=${report.totals.abilitiesUpserted}  ` +
    `${report.ms}ms  (dryRun=${dryRun})`,
  );
}

main()
  .catch((err) => {
    console.error('[calibrate] failed', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
