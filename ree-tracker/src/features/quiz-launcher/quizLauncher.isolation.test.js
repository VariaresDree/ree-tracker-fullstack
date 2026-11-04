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
import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SRC_ROOT, listFilesRecursive, walkImports } from '../../test/importGraph';

// Every module a CAQ session must never reach, because importing it (even
// transitively) risks pulling in a network call, a store write, or a
// telemetry/scoring side effect. Paths are relative to src/.
const FORBIDDEN = [
  'features/board-simulator/useSimulatorEngine.js',
  'store/useStore.js',
  'store/slices.js',
  'services/dbQueries.js',
  'services/analyticsSync.js',
  'services/writeOrQueue.js',
  'services/reportQuestion.js',
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

describe('CAQ Quiz Launcher — isolation from telemetry/store/scoring', () => {
  it('makes no network call of its own', () => {
    const files = listFilesRecursive(join(SRC_ROOT, 'features/quiz-launcher')).concat(join(SRC_ROOT, 'services/deviceStore.js'));
    const calling = files.filter((f) => /\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(readFileSync(f, 'utf-8')));
    expect(calling).toEqual([]);
  });

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
