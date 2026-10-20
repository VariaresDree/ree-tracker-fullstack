// @vitest-environment node
// Motion that eases what changes and nothing else, and stops for people who
// ask it to:
//   - no `transition-all` (it animated layout and every property a class
//     touched); name the properties instead
//   - .btn-press names the colours it eases: its bare `transition: transform`
//     replaced transition-colors, so every button's hover colour snapped
//   - the sidebar snaps to its width (animating width re-laid out the page)
//   - motion/react components follow the reduced-motion setting
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(process.cwd(), 'src');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.jsx?$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name)) files.push(full);
  }
})(SRC);

describe('transitions', () => {
  it('no element transitions "all"', () => {
    const hits = files.filter((f) => /\btransition-all\b/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(SRC, f));
    expect(hits).toEqual([]);
  });

  it('button press feedback keeps the hover colour change', () => {
    const css = read('styles/index.css');
    const rule = css.match(/\.btn-press\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toMatch(/transition-property:[^;]*\bcolor\b[^;]*\bbackground-color\b[^;]*\btransform\b/);
    expect(rule).not.toMatch(/transition:\s*transform/);
  });

  it('the sidebar does not animate its width', () => {
    const aside = read('layouts/Sidebar.jsx').match(/<aside className=\{[^\n]*/)?.[0] ?? '';
    expect(aside).toMatch(/w-72/);
    expect(aside).not.toMatch(/transition-\[width\]|transition-all/);
  });

  it('motion/react components follow the reduced-motion setting', () => {
    const users = files.filter((f) => /from 'motion\/react'/.test(fs.readFileSync(f, 'utf8')));
    expect(users.length).toBeGreaterThan(0);
    for (const f of users) expect(fs.readFileSync(f, 'utf8'), path.relative(SRC, f)).toMatch(/<MotionConfig reducedMotion="user">/);
  });
});
