#!/usr/bin/env node
'use strict';

// One-time cutover from `prisma db push` to a real migration history.
//
// WHY THIS IS A SCRIPT AND NOT JUST `prisma migrate resolve`:
//
// `migrate resolve --applied 0_init` records the baseline as applied WITHOUT
// looking at the database. It is an assertion, not a check. This database was
// built by successive `db push` runs over months — any drift between it and
// schema.prisma (a column an old push added and a later one stopped declaring,
// a hand-applied index, an aborted push) would be baselined away silently, and
// the next `migrate deploy` would fail on a mismatch that is very hard to
// diagnose after the fact.
//
// So: diff production against the schema FIRST, and only baseline when they
// already agree. If they do not, print the exact drift and stop — the fix is a
// final `db push` to reconcile, then re-run this.
//
// Usage (from ree-tracker-backend/, with DATABASE_URL pointing at PRODUCTION):
//   npm run migrate:cutover              # check, then baseline if clean
//   npm run migrate:cutover:check        # check only, never writes

const { spawnSync } = require('child_process');

const BASELINE = '0_init';
const checkOnly = process.argv.includes('--check');

// npx resolves to npx.cmd on Windows, which needs a shell. No credential is
// ever passed as an argument (see the note on --from-config-datasource below),
// so there is nothing here for a shell to mangle or leak into a process list.
const runPrisma = (args) => spawnSync('npx', ['prisma', ...args], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
});

function fail(msg) {
    console.error(`\n✖ ${msg}\n`);
    process.exit(1);
}

if (!process.env.DATABASE_URL) {
    fail('DATABASE_URL is not set. Point it at the PRODUCTION database and re-run.');
}

// Never run against an obvious local database by accident — the whole point is
// that this mutates the _migrations table of a real deployment. This also traps
// the placeholder URL that prisma.config.ts falls back to when the env var is
// missing.
if (/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)) {
    fail('DATABASE_URL points at localhost. This is a production cutover; refusing.');
}

console.log('→ Comparing the live database against prisma/schema.prisma …');

// --from-config-datasource, NOT --from-url:
//   * --from-url does not exist in this Prisma version (the flags are
//     --from-empty / --from-schema / --from-migrations / --from-config-datasource);
//   * it reads the connection string from the environment via prisma.config.ts,
//     so the password never appears in argv, where it would show up in process
//     listings and shell history.
//
// --exit-code makes the result unambiguous: 0 = no difference, 2 = differences,
// 1 = error. Reading the exit code beats parsing DDL out of stdout, which is
// what an earlier version of this script did.
const diff = runPrisma([
    'migrate', 'diff',
    '--from-config-datasource',
    '--to-schema', 'prisma/schema.prisma',
    '--script',
    '--exit-code',
]);

if (diff.error) {
    fail(`Could not run prisma: ${diff.error.message}`);
}

if (diff.status === 1) {
    fail(`Could not read the database:\n${(diff.stderr || '').trim()}`);
}

if (diff.status === 2) {
    console.error('\n✖ The live database does NOT match schema.prisma. Baselining now would');
    console.error('  record a state that is not true, and the next `migrate deploy` would');
    console.error('  fail on the difference.\n');
    console.error('  Outstanding changes:\n');
    console.error((diff.stdout || '').split('\n').map((l) => `    ${l}`).join('\n'));
    console.error('  Fix: run one final `npx prisma db push` to reconcile, then re-run this.\n');
    process.exit(1);
}

if (diff.status !== 0) {
    fail(`Unexpected exit code ${diff.status} from prisma migrate diff.`);
}

console.log('✓ The live database already matches schema.prisma — the baseline is accurate.');

if (checkOnly) {
    console.log('\n(--check given; nothing was written.)\n');
    process.exit(0);
}

console.log(`→ Recording ${BASELINE} as applied …`);
const resolve = runPrisma(['migrate', 'resolve', '--applied', BASELINE]);
const resolveOut = `${resolve.stdout || ''}${resolve.stderr || ''}`;

if (resolve.status !== 0) {
    // Already-resolved is not a failure — this script is safe to re-run.
    if (/already recorded|already applied/i.test(resolveOut)) {
        console.log(`✓ ${BASELINE} was already recorded as applied.`);
    } else {
        fail(`Baseline failed:\n${resolveOut.trim()}`);
    }
} else {
    console.log(resolveOut.trim());
}

console.log('\n✓ Cutover complete.\n');
console.log('  Verify:  npm run migrate:status');
console.log('  Then:    merge the render.yaml change that swaps');
console.log('           `prisma db push` -> `prisma migrate deploy`.\n');
console.log('  Until that swap is merged the deploy still uses db push, which is');
console.log('  harmless — the baseline just sits recorded and unused.\n');
