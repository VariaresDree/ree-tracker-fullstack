// src/test/importGraph.js
//
// A static walk of what a file can reach, for tests that promise a feature never
// touches something. A plain regex walker, not a full parser: the codebase's import
// style is consistent, and something this small is easy to trust.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import process from 'node:process'; // explicit, so eslint's browser globals don't flag it

export const SRC_ROOT = resolve(process.cwd(), 'src');

const ALIASES = {
  '@': SRC_ROOT,
  '@ui': join(SRC_ROOT, 'components/ui'),
  '@motion': join(SRC_ROOT, 'motion'),
  '@features': join(SRC_ROOT, 'features'),
  '@services': join(SRC_ROOT, 'services'),
  '@store': join(SRC_ROOT, 'store'),
};

const IMPORT_RE = /(?:import\s+(?:[\s\S]*?)\s+from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;

export function listFilesRecursive(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else if (/\.(jsx?|tsx?)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

function resolveSpecifier(spec, fromFile) {
  let base;
  if (spec.startsWith('.')) {
    base = resolve(dirname(fromFile), spec);
  } else {
    const aliasKey = Object.keys(ALIASES).find((a) => spec === a || spec.startsWith(`${a}/`));
    if (!aliasKey) return null; // external package (react, lucide-react, fflate, ...) — not our graph
    base = spec === aliasKey ? ALIASES[aliasKey] : join(ALIASES[aliasKey], spec.slice(aliasKey.length + 1));
  }
  for (const candidate of [base, `${base}.js`, `${base}.jsx`, join(base, 'index.js'), join(base, 'index.jsx')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export function walkImports(entryFiles) {
  const visited = new Set();
  const queue = [...entryFiles];
  const edges = []; // for readable failure messages: [fromFile, toFile]

  while (queue.length) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    if (!existsSync(file)) continue;
    const source = readFileSync(file, 'utf-8');
    let match;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(source))) {
      const resolved = resolveSpecifier(match[1], file);
      if (!resolved) continue;
      edges.push([file, resolved]);
      if (!visited.has(resolved)) queue.push(resolved);
    }
  }
  return { visited, edges };
}
