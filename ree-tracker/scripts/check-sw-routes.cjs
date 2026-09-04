#!/usr/bin/env node
'use strict';

// Standing check: run the service worker's route matcher, as built, against
// real API paths.
//
// This exists because the same rule shipped broken twice in one sitting, and
// neither break was visible in the source or in a grep of the output:
//
//  1. A regex whose escaping produced `\/` instead of `\/`. That asks for a
//     literal backslash in the pathname, so it matched NOTHING and the caching
//     rule silently did nothing at all. Grepping sw.js still found the endpoint
//     names — sitting inside a regex that could never fire.
//
//  2. Replacing it with an imported predicate. Workbox STRINGIFIES urlPattern
//     into sw.js, so the built worker referenced `isUserDataApiPath` without
//     ever defining it: a ReferenceError on every fetch event, which would have
//     taken down the whole service worker rather than just this rule.
//
// A matcher that matches nothing fails silently and looks exactly like one that
// works. So assert both directions — what must match AND what must not — by
// pulling the function out of the built file and calling it.

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const SW = path.join(DIST, 'sw.js');
const CACHE_NAME = 'api-user-data';

// Paths the analytics cache must handle, and paths it must leave alone. The
// negative list is the half that catches an over-broad matcher — /api/config
// has its own NetworkFirst rule with different expiry, and caching /healthz
// would make the keep-alive ping meaningless.
const MUST_MATCH = [
    '/api/analytics/dashboard/3H85pFRd7XWFkabcdefghij',
    '/api/analytics/deep/time-analysis',
    '/api/readiness',
    '/api/readiness/history',
    '/api/forecast',
    '/api/leaderboard/me',
];
const MUST_NOT_MATCH = [
    '/api/config/tos',
    '/api/config/flags',
    '/api/questions',
    '/api/reference-cards',
    '/healthz',
    '/api/readinessX',      // segment equality, not a prefix test
    '/api',
    '/',
];

function fail(msg) {
    console.error(`\n✗ ${msg}\n`);
    process.exit(1);
}

if (!fs.existsSync(SW)) fail(`No service worker at ${SW}. Run \`npm run build\` first.`);
const sw = fs.readFileSync(SW, 'utf8');

// Find the registerRoute(...) call whose handler names our cache, and take the
// matcher that is its first argument.
const idx = sw.indexOf(`cacheName:"${CACHE_NAME}"`);
if (idx === -1) {
    fail(`The built sw.js declares no route for cacheName "${CACHE_NAME}".\n`
       + `  Either the runtimeCaching entry was dropped from vite.config.js, or the\n`
       + `  cache name diverged from services/apiCache.js — which owns and purges it,\n`
       + `  and can only purge a name it agrees on.`);
}
const call = sw.lastIndexOf('registerRoute(', idx);
if (call === -1) fail('Found the cache name but no registerRoute( before it.');

const body = sw.slice(call + 'registerRoute('.length, idx);
const cut = body.indexOf(',new ');
if (cut === -1) fail('Could not separate the matcher from its handler.');
const source = body.slice(0, cut).trim();

let matcher;
try {
    // eslint-disable-next-line no-eval
    matcher = eval(`(${source})`);
} catch (err) {
    fail(`The matcher does not even parse: ${err.message}\n  source: ${source}`);
}
if (typeof matcher !== 'function') fail(`Extracted matcher is not a function: ${source}`);

const problems = [];
const call1 = (p) => {
    try {
        return !!matcher({ url: new URL(`https://api.example.com${p}`), request: { destination: '' } });
    } catch (err) {
        // This is failure (2) above: a matcher referencing something the worker
        // does not define throws here instead of returning false.
        problems.push(`  ${p} -> THREW ${err.message}`);
        return null;
    }
};

for (const p of MUST_MATCH) { if (call1(p) === false) problems.push(`  ${p} -> should MATCH, did not`); }
for (const p of MUST_NOT_MATCH) { if (call1(p) === true) problems.push(`  ${p} -> should NOT match, did`); }

// The cache is written by the SW under this name and purged by the app under
// its own constant. If they drift, sign-out stops clearing one user's analytics
// before the next signs in — see services/apiCache.js.
const appSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'apiCache.js'), 'utf8');
const appName = appSrc.match(/API_CACHE_NAME\s*=\s*'([^']+)'/);
if (!appName) problems.push('  services/apiCache.js: could not read API_CACHE_NAME');
else if (appName[1] !== CACHE_NAME) {
    problems.push(`  cache name drift: sw.js "${CACHE_NAME}" vs apiCache.js "${appName[1]}"`);
}

if (problems.length) {
    console.error(`\n✗ Service-worker route check FAILED:\n${problems.join('\n')}\n`);
    console.error(`  matcher as built: ${source}\n`);
    process.exit(1);
}

console.log(`✓ SW route matcher correct — ${MUST_MATCH.length} matched, ${MUST_NOT_MATCH.length} correctly skipped.`);
