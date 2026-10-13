// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, parse } from 'node:path';

// Imports leave the extension off ('./CauseTrend'), and the resolver tries
// `.js` before `.jsx`. On a case-insensitive disk (macOS, Windows) a
// `causeTrend.js` next to `CauseTrend.jsx` answers for both, so the component
// import silently loaded the helper module there, while Linux and CI were
// fine. Two modules in one folder may not differ only by case.
const SRC = resolve(process.cwd(), 'src');

function modules(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return modules(path);
    return /\.(js|jsx|ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

describe('module names', () => {
  it('no two modules in a folder differ only by letter case', () => {
    const seen = new Map();
    const clashes = [];
    for (const path of modules(SRC)) {
      const { dir, name } = parse(path);
      const key = join(dir, name.toLowerCase());
      if (seen.has(key)) clashes.push(`${relative(SRC, seen.get(key))} / ${relative(SRC, path)}`);
      else seen.set(key, path);
    }
    expect(clashes).toEqual([]);
  });
});
