// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Focus rings that survive Windows forced-colours mode. `outline-none` removes
// the outline outright, and the box-shadow ring most of those controls drew
// instead is dropped in forced colours, so the focused control showed nothing
// at all (QuestionCard's options and confidence radios, flashcards, formula
// tiles, the glossary terms, the quiz file picker). Tailwind v4's
// `outline-hidden` hides the outline the same way normally, and keeps a
// transparent one that forced colours paints. This scans every component so
// the next `outline-none` fails here.

// Vitest runs from the package root (as copyGuard.test does).
const SRC = resolve(process.cwd(), 'src');

function jsxFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return jsxFiles(path);
    return /\.jsx$/.test(name) && !/\.test\.jsx$/.test(name) ? [path] : [];
  });
}

// Comments are skipped: history notes may name the old class.
const withoutComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1');

describe('focus in forced-colours mode', () => {
  it('finds the components', () => {
    expect(jsxFiles(SRC).length).toBeGreaterThan(100);
  });

  it('no component removes its outline with outline-none (use outline-hidden)', () => {
    const hits = [];
    for (const file of jsxFiles(SRC)) {
      withoutComments(readFileSync(file, 'utf8')).split('\n').forEach((line, i) => {
        if (/(^|[\s"'`:])outline-none\b/.test(line)) hits.push(`${relative(SRC, file)}:${i + 1}  ${line.trim().slice(0, 100)}`);
      });
    }
    expect(hits).toEqual([]);
  });
});
