#!/usr/bin/env node
/*
 * Destructive wipe of the LEGACY reference tables (EngineeringConstant +
 * EngineeringFormula), superseded by the ReferenceCard flashcard vault.
 *
 * Usage: node scripts/wipeReferenceLegacy.js --confirm=WIPE
 *        npm run wipe:reference-legacy -- --confirm=WIPE
 *
 * Deletes ROWS only. The tables themselves stay in the schema until a later
 * manual `prisma db push --accept-data-loss` (the deploy build's plain
 * `db push` intentionally fails on destructive schema changes, so dropping
 * them here would brick the deploy). Refuses to run without --confirm=WIPE.
 */
require('dotenv').config();
const prisma = require('../src/config/db');

const args = process.argv.slice(2).reduce((acc, a) => {
    const [k, v] = a.split('=');
    acc[k.replace(/^--/, '')] = v === undefined ? true : v;
    return acc;
}, {});

if (args.confirm !== 'WIPE') {
    console.error('\nRefusing to run without --confirm=WIPE.');
    console.error('Example: node scripts/wipeReferenceLegacy.js --confirm=WIPE\n');
    process.exit(1);
}

(async () => {
    try {
        const [constants, formulas] = await prisma.$transaction([
            prisma.engineeringConstant.deleteMany({}),
            prisma.engineeringFormula.deleteMany({}),
        ]);
        console.log(`Wiped ${constants.count} EngineeringConstant row(s) and ${formulas.count} EngineeringFormula row(s).`);
        console.log('Legacy tables are now empty. Drop them later with: prisma db push --accept-data-loss (after removing the models from schema.prisma).');
    } catch (err) {
        console.error('Wipe failed:', err.message);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
})();
