#!/usr/bin/env node
/*
 * Nightly item calibration. Scans all Questions whose calibrationN has caught
 * up to the live attempt count, runs grid-search MLE on the (theta, correct)
 * pairs, and writes back the IRT parameters.
 *
 * Usage:
 *   node scripts/calibrate.js              # apply
 *   node scripts/calibrate.js --dry-run    # report only
 *   node scripts/calibrate.js --min-n=20   # lower the minimum-attempts gate
 *
 * Designed to be run by a daily cron (Render: 0 3 * * * Asia/Manila). Safe to
 * run repeatedly; idempotent given the same attempt history.
 */
require('dotenv').config();
const prisma = require('../src/config/db');
const { calibrateItem } = require('../src/engine/irt');

function parseArgs(argv) {
  const out = { dryRun: false, minN: 30 };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--min-n=')) out.minN = Number(a.slice(8)) || 30;
  }
  return out;
}

async function main() {
  const { dryRun, minN } = parseArgs(process.argv);
  const tStart = Date.now();
  console.log(`[calibrate] start  dryRun=${dryRun}  minN=${minN}`);

  // Pull every question that has at least minN attempts in total. We don't
  // filter by calibrationN here so that re-calibration happens when fresh
  // attempts arrive even after a prior run.
  const candidates = await prisma.question.findMany({
    where: { attempts: { some: {} } },
    select: { id: true, calibrationN: true },
  });

  let inspected = 0;
  let updated = 0;
  let skippedTooFew = 0;

  for (const q of candidates) {
    // Pull all attempts for this question with the user's then-current theta.
    // `User.thetaRating` is a single global summary — close enough for batch
    // calibration. Per-subject UserAbility will replace this when populated.
    const attempts = await prisma.questionAttempt.findMany({
      where: { questionId: q.id },
      select: {
        isCorrect: true,
        user: { select: { thetaRating: true } },
      },
    });

    if (attempts.length < minN) {
      skippedTooFew += 1;
      continue;
    }

    const samples = attempts.map((a) => ({
      theta: a.user?.thetaRating ?? 0,
      correct: !!a.isCorrect,
    }));

    const params = calibrateItem(samples, { minN });
    inspected += 1;
    if (!params) {
      skippedTooFew += 1;
      continue;
    }

    if (dryRun) {
      console.log(
        `[calibrate]   ${q.id}  a=${params.a.toFixed(2)} b=${params.b.toFixed(
          2,
        )} c=${params.c.toFixed(2)}  n=${samples.length}`,
      );
    } else {
      await prisma.question.update({
        where: { id: q.id },
        data: {
          irtA: params.a,
          irtB: params.b,
          irtC: params.c,
          calibrationN: samples.length,
          lastCalibratedAt: new Date(),
        },
      });
      updated += 1;
    }
  }

  const ms = Date.now() - tStart;
  console.log(
    `[calibrate] done  inspected=${inspected}  updated=${updated}  ` +
      `skippedTooFew=${skippedTooFew}  totalCandidates=${candidates.length}  ${ms}ms`,
  );
}

main()
  .catch((err) => {
    console.error('[calibrate] failed', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
