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
//   npm run migrate:cutover           # check, then baseline if clean
//   npm run migrate:cutover -- --check   # check only, never writes

const { execFileSync } = require('child_process');

const BASELINE = '0_init';
const checkOnly = process.argv.includes('--check');

function prisma(args, { capture = true } = {}) {
    return execFileSync('npx', ['prisma', ...args], {
        encoding: 'utf8',
        stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
        shell: process.platform === 'win32',
    });
}

function fail(msg) {
    console.error(`\n✖ ${msg}\n`);
    process.exit(1);
}

if (!process.env.DATABASE_URL) {
    fail('DATABASE_URL is not set. Point it at the PRODUCTION database and re-run.');
}

// Never let this run against an obvious local database by accident — the whole
// point is that it mutates the _migrations table of a real deployment.
if (/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)) {
    fail('DATABASE_URL points at localhost. This is a production cutover; refusing.');
}

console.log('→ Comparing the live database against prisma/schema.prisma …');

let drift;
try {
    drift = prisma([
        'migrate', 'diff',
        '--from-url', process.env.DATABASE_URL,
        '--to-schema', 'prisma/schema.prisma',
        '--script',
    ]);
} catch (err) {
    fail(`Could not read the database:\n${err.stderr || err.message}`);
}

// `migrate diff` prints an informational header even when there is no delta, so
// judge on actual DDL rather than on output being empty.
const ddl = drift
    .split('\n')
    .filter((l) => /^\s*(CREATE|ALTER|DROP)\b/i.test(l))
    .join('\n');

if (ddl.trim()) {
    console.error('\n✖ The live database does NOT match schema.prisma. Baselining now would');
    console.error('  record a state that is not true, and the next `migrate deploy` would');
    console.error('  fail on the difference.\n');
    console.error('  Outstanding changes:\n');
    console.error(ddl.split('\n').map((l) => `    ${l}`).join('\n'));
    console.error('\n  Fix: run one final `npx prisma db push` to reconcile, then re-run this.\n');
    process.exit(1);
}

console.log('✓ The live database already matches schema.prisma — the baseline is accurate.');

if (checkOnly) {
    console.log('\n(--check given; nothing was written.)\n');
    process.exit(0);
}

console.log(`→ Recording ${BASELINE} as applied …`);
try {
    prisma(['migrate', 'resolve', '--applied', BASELINE], { capture: false });
} catch (err) {
    // Already-resolved is not a failure — this script is safe to re-run.
    const detail = String(err.stderr || err.message || '');
    if (/already recorded|already applied/i.test(detail)) {
        console.log(`✓ ${BASELINE} was already recorded as applied.`);
    } else {
        fail(`Baseline failed:\n${detail}`);
    }
}

console.log('\n✓ Cutover complete.\n');
console.log('  Verify:  npm run migrate:status');
console.log('  Then:    merge the render.yaml change that swaps');
console.log('           `prisma db push` -> `prisma migrate deploy`.\n');
console.log('  Until that swap is merged the deploy still uses db push, which is');
console.log('  harmless — the baseline just sits recorded and unused.\n');
