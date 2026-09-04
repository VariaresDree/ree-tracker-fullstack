#!/usr/bin/env node
'use strict';

// Standing check: fail the build if the boot payload grows past its budget.
//
// This exists because the same mistake has now been made three times in
// vite.config.js, each time costing real bytes on every route, and each time
// invisible until someone read the built index.html:
//
//   PR #90  pdf-export  183 kB  jspdf/html2canvas, reached only via await import()
//   PR #94  charts      117 kB  recharts, all four consumers behind React.lazy()
//   this PR latex       398 kB  KaTeX + markdown, reached only through lazy pages
//                       motion  128 kB  two importers, both under the lazy Dashboard
//
// The trap: naming a chunk in `manualChunks` makes rolldown emit it as a STATIC
// import of the entry, which CANCELS the laziness of every consumer. The source
// looks correct the whole time — the dynamic imports and React.lazy() calls are
// all still there — so review cannot catch it. Only the built HTML can.
//
// PR #90 additionally looked straight at the `charts` rule, reasoned about the
// import graph, and concluded the eager load was correct. It was not. That is
// why this measures instead of arguing.
//
// WHAT IT MEASURES: the bytes a browser must fetch before the app can boot —
// the entry chunk plus every modulepreload and stylesheet the built index.html
// links. Not total bundle size: moving code from eager to async is the entire
// point, and total emitted bytes barely move when it happens (-523 bytes on the
// change that added this file).

// .cjs, not .js: the frontend package is "type": "module", so a .js file here
// would be ESM and could not use require(). Same reason lighthouserc.cjs exists.
const fs = require('fs');
const path = require('path');

// Derived, not picked: the headroom must stay BELOW the smallest regression
// this guard exists to catch, or it would wave one through. Measured payload is
// 611,139 bytes and the smallest of the four offenders above was `charts` at
// ~117 kB, so the budget sits at 700,000 — 88,861 bytes of room for ordinary
// feature growth, comfortably less than 117 kB.
//
// Raising this is a decision, not a formality. If a change genuinely needs a
// bigger boot payload, say why in the commit rather than nudging the number,
// and re-derive the headroom against the smallest thing still worth catching.
const BUDGET_BYTES = 700_000;

const DIST = path.join(__dirname, '..', 'dist');
const HTML = path.join(DIST, 'index.html');

/**
 * Pull the boot-critical asset list out of a built index.html: the entry
 * script's `src`, plus every `href` that is a modulepreload or a stylesheet.
 * Split out from the file reads so it can be tested against fixture HTML.
 */
function eagerAssets(html) {
    const out = [];
    const script = html.match(/<script[^>]+src="\/assets\/([^"]+)"/);
    if (script) out.push(script[1]);
    const hrefs = html.matchAll(/href="\/assets\/([^"]+\.(?:js|css))"/g);
    for (const m of hrefs) out.push(m[1]);
    return [...new Set(out)];
}

if (require.main !== module) {
    module.exports = { eagerAssets, BUDGET_BYTES };
    return;
}

if (!fs.existsSync(HTML)) {
    console.error(`✗ No build found at ${HTML}. Run \`npm run build\` first.`);
    process.exit(1);
}

const assets = eagerAssets(fs.readFileSync(HTML, 'utf8'));
if (assets.length === 0) {
    // A parse that finds nothing must fail loudly. Silently "passing" on an
    // empty list is exactly how a broken guard hides a real regression.
    console.error('✗ Parsed the built index.html but found no eager assets.');
    console.error('  The markup shape changed; fix eagerAssets() rather than ignoring this.');
    process.exit(1);
}

let total = 0;
const rows = [];
for (const name of assets) {
    const size = fs.statSync(path.join(DIST, 'assets', name)).size;
    total += size;
    rows.push([name, size]);
}
rows.sort((a, b) => b[1] - a[1]);

const pct = ((total / BUDGET_BYTES) * 100).toFixed(1);
for (const [name, size] of rows) {
    console.log(`  ${String(size).padStart(8)}  ${name}`);
}
console.log(`  ${String(total).padStart(8)}  TOTAL (${pct}% of ${BUDGET_BYTES} budget)\n`);

if (total > BUDGET_BYTES) {
    console.error(`✗ Boot payload ${total} bytes exceeds the ${BUDGET_BYTES} budget by ${total - BUDGET_BYTES}.\n`);
    console.error('  Most likely cause: a new `manualChunks` rule naming code that is only');
    console.error('  reached lazily. Naming it makes rolldown emit it as a static import of');
    console.error('  the entry, cancelling every React.lazy() and await import() below it.');
    console.error('  Check the largest row above against vite.config.js, and confirm by');
    console.error('  removing the rule and rebuilding — the chunk should leave this list.\n');
    process.exit(1);
}
console.log('✓ Boot payload within budget.');
