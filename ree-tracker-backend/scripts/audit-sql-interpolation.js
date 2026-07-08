#!/usr/bin/env node
'use strict';

// Standing check (Phase 0 gate): fail the build if any raw Prisma/pg query is
// assembled by TEMPLATE-LITERAL INTERPOLATION — the exact SQL-injection vector a
// prior audit found and fixed. This converts "found once" into "cannot regress
// silently."
//
// Safe patterns (NOT flagged):
//   • Prisma tagged templates:  prisma.$queryRaw`... ${x} ...`   — interpolations
//     become BOUND params automatically.
//   • Unsafe raw with a fully-STATIC string + positional params:
//     prisma.$queryRawUnsafe('... $1 ...', x)
//
// Flagged (build fails):
//   • $queryRawUnsafe / $executeRawUnsafe  called with a backtick template that
//     contains ${...}
//   • a bare  .query(`... ${...} ...`)  (pg-style) with interpolation
//
// Scans backend src/ only (app code). Tests/scripts are out of scope.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// Each matcher locates a raw-query call; the template argument that follows is
// then inspected for ${} interpolation.
const CALL_MATCHERS = [
  /\$(?:queryRawUnsafe|executeRawUnsafe)\s*\(/g,
  /(?<![$\w.])\.query\s*\(/g, // pg-style client.query(`...`)
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// If the first argument (skipping whitespace after the '(') is a backtick
// template, return its raw body; otherwise null.
function readTemplateArg(src, fromIdx) {
  let i = fromIdx;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== '`') return null;
  i++;
  let body = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { body += c + (src[i + 1] || ''); i += 2; continue; }
    if (c === '`') return body;
    body += c;
    i++;
  }
  return body; // unterminated — treat as read
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

const violations = [];
for (const file of walk(SRC)) {
  const src = fs.readFileSync(file, 'utf8');
  for (const matcher of CALL_MATCHERS) {
    matcher.lastIndex = 0;
    let m;
    while ((m = matcher.exec(src)) !== null) {
      const template = readTemplateArg(src, m.index + m[0].length);
      if (template != null && template.includes('${')) {
        violations.push({
          file: path.relative(ROOT, file).replace(/\\/g, '/'),
          line: lineOf(src, m.index),
          call: m[0].replace(/[\s(]/g, ''),
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('\n✖ SQL interpolation check FAILED.');
  console.error('  Template-literal interpolation into a raw query is a SQL-injection risk.');
  console.error('  Fix: use a Prisma tagged template ($queryRaw/$executeRaw) or a fully-static');
  console.error('  string with positional params ($1, $2, ...).\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.call}(\`... \${...} ...\`)`);
  }
  console.error(`\n${violations.length} violation(s).\n`);
  process.exit(1);
}

console.log('✓ SQL interpolation check passed — no ${} interpolation in raw queries.');
