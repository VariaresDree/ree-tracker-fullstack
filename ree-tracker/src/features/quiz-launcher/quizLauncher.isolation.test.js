// src/features/quiz-launcher/quizLauncher.isolation.test.js
//
// The CAQ Quiz Launcher's core promise is total isolation from telemetry,
// scoring persistence, and sync: a CAQ session must not move a single number
// in the user's real assessment history. That's exactly the kind of
// constraint that survives a code review today and breaks silently six
// months from now when someone adds an innocuous-looking import to fix an
// unrelated bug in a file the launcher happens to reuse.
//
// A comment saying "don't import useStore here" doesn't stop that. This test
// does: it statically walks the ENTIRE import graph reachable from the
// launcher's own files plus the shared components it deliberately reuses
// (QuestionCard, ExamLayout), and fails if any forbidden module appears
// ANYWHERE in that graph, at any depth — not just at the launcher's own
// top level.
//
// This is deliberately a plain regex-based import walker, not a full AST
// parse or a dependency-cruiser install: the codebase's import style is
// consistently `import x from '...'` / `import {a,b} from '...'`, and a
// lightweight, dependency-free walker is easier to trust than a new tool
// with its own resolution quirks.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import process from 'node:process'; // explicit import so eslint's browser-globals config doesn't flag the bare identifier

const SRC_ROOT = resolve(process.cwd(), 'src');

const ALIASES = {
  '@': SRC_ROOT,
  '@ui': join(SRC_ROOT, 'components/ui'),
  '@motion': join(SRC_ROOT, 'motion'),
  '@features': join(SRC_ROOT, 'features'),
  '@services': join(SRC_ROOT, 'services'),
  '@store': join(SRC_ROOT, 'store'),
};

// Every module a CAQ session must never reach, because importing it (even
// transitively) risks pulling in a network call, a store write, or a
// telemetry/scoring side effect. Paths are relative to src/.
const FORBIDDEN = [
  'features/board-simulator/useSimulatorEngine.js',
  'store/useStore.js',
  'store/slices.js',
  'services/dbQueries.js',
  'services/analyticsSync.js',
  'hooks/useSyncLifecycle.js',
  'utils/irtMath.js',
].map((p) => resolve(SRC_ROOT, p));

// The launcher's own directory (walked in full, including files that don't
// exist yet as the feature grows — this test extends itself automatically)
// plus the specific outside files it's approved to reuse.
const ROOTS = [
  join(SRC_ROOT, 'features/quiz-launcher'),
  join(SRC_ROOT, 'features/quiz/QuestionCard.jsx'),
  join(SRC_ROOT, 'layouts/ExamLayout.jsx'),
];

const IMPORT_RE = /(?:import\s+(?:[\s\S]*?)\s+from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;

function listFilesRecursive(dir) {
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

function walkImports(entryFiles) {
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

describe('CAQ Quiz Launcher — isolation from telemetry/store/scoring', () => {
  it('reaches no forbidden module anywhere in its transitive import graph', () => {
    const entryFiles = ROOTS.flatMap((r) => (statSync(r).isDirectory() ? listFilesRecursive(r) : [r]));
    expect(entryFiles.length).toBeGreaterThan(0); // sanity: the walk actually has something to check

    const { visited, edges } = walkImports(entryFiles);

    const violations = FORBIDDEN.filter((f) => visited.has(f)).map((f) => {
      const path = edges.find(([, to]) => to === f);
      return path ? `${f}\n    (imported via ${path[0]} -> ${path[1]})` : f;
    });

    expect(violations, `Forbidden module(s) reachable from the CAQ launcher:\n${violations.join('\n')}`).toEqual([]);
  });

  it('the walker itself actually resolves real edges (guards against a silently-broken regex)', () => {
    // If this fails, the isolation test above could be passing for the wrong
    // reason — an import pattern the regex doesn't match at all, rather than
    // a genuinely clean graph. QuestionCard is known to import LatexRenderer.
    const qc = join(SRC_ROOT, 'features/quiz/QuestionCard.jsx');
    const { visited } = walkImports([qc]);
    expect(visited.has(join(SRC_ROOT, 'components/LatexRenderer.jsx'))).toBe(true);
  });
});
