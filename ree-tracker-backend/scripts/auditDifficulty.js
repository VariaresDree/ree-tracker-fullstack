#!/usr/bin/env node
/*
 * Read-only audit of the question bank's difficulty scale — run BEFORE deploying
 * the item-parameter fix (engine/irt.itemParams), and again before
 * `npm run recompute:theta`.
 *
 * Why: uncalibrated items (irtB IS NULL) are now placed on the θ scale by
 * mapping their author rating 1/2/3 → b −1/0/+1, where they used to be read RAW
 * as b. That mapping assumes `difficulty` really is the 1/2/3 ordinal the AI
 * prompt and both authoring forms produce. This prints the actual distribution
 * so the assumption is checked against production data rather than trusted.
 *
 * Writes nothing.
 *
 * Usage: node scripts/auditDifficulty.js
 */
require('dotenv').config();
const prisma = require('../src/config/db');
const { authorB } = require('../src/engine/irt');

async function main() {
    const rows = await prisma.$queryRaw`
        SELECT "subject",
               ("irtB" IS NOT NULL) AS "calibrated",
               "difficulty",
               COUNT(*)::int AS "n"
        FROM "Question"
        WHERE "isFlagged" = false
        GROUP BY 1, 2, 3
        ORDER BY 1, 2, 3`;

    const total = rows.reduce((acc, r) => acc + r.n, 0);
    const uncal = rows.filter((r) => !r.calibrated);
    const uncalN = uncal.reduce((acc, r) => acc + r.n, 0);
    const ordinalN = uncal.filter((r) => [1, 2, 3].includes(Number(r.difficulty))).reduce((acc, r) => acc + r.n, 0);

    console.log(`[auditDifficulty] live questions: ${total}  calibrated (irtB set): ${total - uncalN}  uncalibrated: ${uncalN}`);
    console.log(`[auditDifficulty] uncalibrated on the 1/2/3 ordinal: ${ordinalN} (${uncalN ? Math.round((ordinalN / uncalN) * 100) : 0}%)`);
    console.log('');
    console.log('subject            calibrated  difficulty  ->  served b   count');
    for (const r of rows) {
        const served = r.calibrated ? '(irtB)' : authorB(r.difficulty).toFixed(2);
        console.log(`${String(r.subject).padEnd(18)} ${String(r.calibrated).padEnd(11)} ${String(r.difficulty).padEnd(11)} ->  ${served.padEnd(9)} ${r.n}`);
    }
    if (uncalN > 0 && ordinalN / uncalN < 0.9) {
        console.log('\n[auditDifficulty] WARNING: under 90% of uncalibrated items use the 1/2/3 ordinal.');
        console.log('Review the non-ordinal values above before running recompute:theta.');
    }
}

main()
    .catch((err) => { console.error('[auditDifficulty] failed:', err.message); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
