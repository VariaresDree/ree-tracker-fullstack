// src/services/deviceFiles.isolation.test.js
//
// My files says it never uploads anything. A comment can't hold that as the code
// grows, so this walks everything My files can reach, at any depth, and fails if any
// of it can talk to a server.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SRC_ROOT, listFilesRecursive, walkImports } from '../test/importGraph';

const FORBIDDEN = [
  'store/useStore.js',
  'services/dbQueries.js',
  'services/analyticsSync.js',
  'services/writeOrQueue.js',
  'services/reportQuestion.js',
  'config/firebaseDb.js',
].map((p) => resolve(SRC_ROOT, p));

const ENTRIES = [...listFilesRecursive(join(SRC_ROOT, 'features/my-files')), join(SRC_ROOT, 'services/deviceFiles.js')];

describe('My files stays on the device', () => {
  const { visited, edges } = walkImports(ENTRIES);

  it('reaches no store or server module, at any depth', () => {
    const reached = FORBIDDEN.filter((f) => visited.has(f));
    const via = reached.map((f) => edges.filter(([, to]) => to === f).map(([from]) => `${from} -> ${f}`));
    expect(via.flat()).toEqual([]);
  });

  it('makes no network call of its own', () => {
    const calling = ENTRIES.filter((f) => /\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(readFileSync(f, 'utf-8')));
    expect(calling).toEqual([]);
  });

  it('the walker really walks: it does see what My files uses', () => {
    expect(visited.has(resolve(SRC_ROOT, 'services/deviceStore.js'))).toBe(true);
    expect(visited.has(resolve(SRC_ROOT, 'features/my-files/LocalFileViewer.jsx'))).toBe(true);
  });
});
