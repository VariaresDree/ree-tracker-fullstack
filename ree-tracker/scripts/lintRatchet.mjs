#!/usr/bin/env node
// scripts/lintRatchet.mjs — ESLint as a ratchet, not a cliff.
//
// `eslint .` reports 162 errors in code that predates the lint config, so a
// plain `npm run lint` CI gate would be red on day one, and clearing them in one
// sweep means touching 64 files, some for rules (react-hooks/set-state-in-effect)
// whose fix changes behaviour. Instead CI holds the line: the error count per
// rule may never rise above eslint-baseline.json. New code is held to the full
// config; old code is paid down when it is touched, and the baseline only goes
// down.
//
//   npm run lint:ratchet                 check (CI)
//   npm run lint:ratchet -- --update     rewrite the baseline after paying some down
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'eslint-baseline.json');

/** Errors (severity 2) per rule across ESLint results. */
export function countByRule(results) {
    const counts = {};
    for (const file of results || []) {
        for (const m of file.messages || []) {
            if (m.severity !== 2) continue;
            const rule = m.ruleId || '(parse error)';
            counts[rule] = (counts[rule] || 0) + 1;
        }
    }
    return counts;
}

/** Rules whose count rose above the baseline, and rules that fell below it. */
export function compareCounts(current, baseline) {
    const rules = new Set([...Object.keys(current || {}), ...Object.keys(baseline || {})]);
    const regressions = [];
    const improvements = [];
    for (const rule of [...rules].sort()) {
        const now = current?.[rule] || 0;
        const was = baseline?.[rule] || 0;
        if (now > was) regressions.push({ rule, now, was });
        else if (now < was) improvements.push({ rule, now, was });
    }
    return { regressions, improvements };
}

async function main() {
    const { ESLint } = await import('eslint');
    const eslint = new ESLint({ cwd: ROOT });
    const results = await eslint.lintFiles(['.']);
    const current = countByRule(results);

    if (process.argv.includes('--update')) {
        const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
        fs.writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + '\n');
        console.log(`[lint-ratchet] baseline written: ${Object.values(current).reduce((a, b) => a + b, 0)} errors`);
        return;
    }

    const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    const { regressions, improvements } = compareCounts(current, baseline);
    const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    console.log(`[lint-ratchet] ${total(current)} errors (baseline ${total(baseline)})`);

    for (const { rule, now, was } of improvements) {
        console.log(`  ↓ ${rule}: ${now} (baseline ${was})`);
    }
    if (improvements.length) console.log('  Paid some down? Lock it in: npm run lint:ratchet -- --update');

    if (regressions.length) {
        console.error('\n[lint-ratchet] new lint errors:');
        for (const { rule, now, was } of regressions) {
            console.error(`  ✗ ${rule}: ${now} (baseline ${was})`);
            for (const file of results) {
                for (const m of file.messages) {
                    if (m.severity === 2 && (m.ruleId || '(parse error)') === rule) {
                        console.error(`      ${path.relative(ROOT, file.filePath)}:${m.line}  ${m.message}`);
                    }
                }
            }
        }
        process.exitCode = 1;
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((err) => { console.error('[lint-ratchet] failed:', err); process.exitCode = 1; });
}
