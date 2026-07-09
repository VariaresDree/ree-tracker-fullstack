#!/usr/bin/env node
/*
 * One-time backfill for the theta-engine unification (roadmap 3.1). The live
 * User.thetaRating was historically written by the Rasch gradient step; the app
 * now estimates theta with the 3PL Bayesian MLE (engine/irt.updateTheta) on a
 * different scale. Left alone, INACTIVE users would keep a stale Rasch-scale
 * theta forever, so cross-user comparisons (leaderboard/forecast) would mix
 * scales. This replays each user's attempt history through the 3PL estimator to
 * set a clean thetaRating + standardError, and rebuilds ThetaHistory (one point
 * per Manila day) so the velocity chart has no scale discontinuity.
 *
 * Usage:
 *   node scripts/recomputeTheta.js            # apply
 *   node scripts/recomputeTheta.js --dry-run  # report only, no writes
 *
 * Idempotent: it always replays from a neutral prior, so re-running yields the
 * same result. Touches only derived fields (thetaRating/standardError/ThetaHistory);
 * ignores timing, so it's immune to any historical timing corruption. Run once
 * post-deploy.
 */
require('dotenv').config();
const prisma = require('../src/config/db');
const { updateTheta } = require('../src/engine/irt');

const MANILA = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });
const manilaDate = (d) => MANILA.format(new Date(d));
const HISTORY_DAYS = 30; // match what the velocity chart renders

function parseArgs(argv) {
  const out = { dryRun: false };
  for (const a of argv.slice(2)) if (a === '--dry-run') out.dryRun = true;
  return out;
}

// Replay one user's attempts (chronological) through the 3PL estimator from a
// weak neutral prior so the full history dominates. Returns the final posterior
// and one theta point per Manila day (last value of the day).
function replay(attempts) {
  let prior = { theta: 0, se: 1.0 };
  const dayTheta = new Map();   // manilaDate -> theta
  const dayStamp = new Map();   // manilaDate -> a real timestamp on that day
  for (const a of attempts) {
    const q = a.question || {};
    const item = { a: q.irtA ?? 1, b: q.irtB ?? q.difficulty ?? 0, c: q.irtC ?? 0.2 };
    prior = updateTheta(prior, [{ item, correct: !!a.isCorrect }]);
    const day = manilaDate(a.createdAt);
    dayTheta.set(day, prior.theta);       // last write per day wins
    dayStamp.set(day, a.createdAt);
  }
  // Keep the most recent HISTORY_DAYS points (insertion order = chronological).
  const days = [...dayTheta.keys()].slice(-HISTORY_DAYS);
  const history = days.map((d) => ({ theta: dayTheta.get(d), recordedAt: dayStamp.get(d) }));
  return { theta: prior.theta, se: prior.se, history };
}

async function main() {
  const { dryRun } = parseArgs(process.argv);
  const tStart = Date.now();
  console.log(`[recomputeTheta] start  dryRun=${dryRun}`);

  const users = await prisma.user.findMany({ select: { id: true } });
  let processed = 0;
  let skippedNoAttempts = 0;

  for (const u of users) {
    const attempts = await prisma.questionAttempt.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: 'asc' },
      select: {
        isCorrect: true,
        createdAt: true,
        question: { select: { irtA: true, irtB: true, irtC: true, difficulty: true } },
      },
    });
    if (attempts.length === 0) { skippedNoAttempts += 1; continue; }

    const { theta, se, history } = replay(attempts);

    if (dryRun) {
      console.log(`[recomputeTheta]   ${u.id}  theta=${theta.toFixed(3)} se=${se.toFixed(3)}  attempts=${attempts.length}  days=${history.length}`);
    } else {
      await prisma.$transaction([
        prisma.user.update({ where: { id: u.id }, data: { thetaRating: theta, standardError: se } }),
        prisma.thetaHistory.deleteMany({ where: { userId: u.id } }),
        prisma.thetaHistory.createMany({
          data: history.map((h) => ({ userId: u.id, theta: h.theta, recordedAt: h.recordedAt })),
        }),
      ]);
    }
    processed += 1;
  }

  const ms = Date.now() - tStart;
  console.log(`[recomputeTheta] done  processed=${processed}  skippedNoAttempts=${skippedNoAttempts}  totalUsers=${users.length}  ${ms}ms`);
}

// Exported for unit tests; only auto-run when invoked directly as a script.
module.exports = { replay };

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('[recomputeTheta] failed', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
