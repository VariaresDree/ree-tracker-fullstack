import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// The app's copy is plain and professional (the 2026-10 reorganization's
// wording sweep). The old sci-fi voice ("Global Matrix Ranking", "Security
// Breach: You lack the required telemetry to enter this sector") kept coming
// back one string at a time, because nothing checked for it. This scans every
// source file outside tests and fails on the exact phrases that were removed.
//
// Comments are skipped: history notes may quote the old wording.

// Vitest runs from the package root (as quizLauncher.isolation.test does).
const SRC = resolve(process.cwd(), 'src');

const BANNED = [
  /Global Matrix/i,
  /Operational Milestones/i,
  /Operational Readiness/i,
  /\bEncrypted\b/, // case-sensitive: the iframe permission "encrypted-media" is fine
  /\bDecrypting\b/i,
  /Security Breach/i,
  /Anomaly reported/i,
  /\bAI Core\b/, // case-sensitive: the "REE.ai Core" brand stays
  /Combat Terminal/i,
  /Assessment Core/i,
  /\bUplinking\b/i,
  /Agent-/,
  /Initiate Protocol/i,
  /Apex Agent/i,
  /into the Matrix/i,
  /Matrix API/i,
  // The 2026-10 polish pass: the app title, the update prompt, the Gauntlet
  // results and the error screens.
  /Tactical/i,
  /the matrix/i,
  /knowledge matrix/i,
  /Critical System Error/i,
  /Reload Engine/i,
  /Simulation Failed/i,
  /real-time penalties/i,
  /(^|[\s'"`>])[Vv]ault\b(?!\/)/, // a word in text; paths (features/vault/) and identifiers (CloudVaultTab) are fine
];

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(name) && !/\.test\.(js|jsx)$/.test(name) ? [path] : [];
  });
}

// Drop block comments and // comments that start a line or follow whitespace
// (so "https://" inside a string survives).
const withoutComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1');

// Emoji and pictographs in UI text. Icons come from components/ui/icons (they
// take the theme's colour and size, and are hidden from screen readers, which
// read an emoji out by name: "rocket", "cross mark"). The ✓ / ✗ / ✕ glyphs
// stood in for icons too. Typographic marks (– — · … ’ → ×) are fine.
// The variation selector (U+FE0F) sits outside the class: in one it reads as
// a combining mark.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{2B55}]|\u{FE0F}/u;

describe('copy guard', () => {
  it('finds the source tree', () => {
    expect(sourceFiles(SRC).length).toBeGreaterThan(100);
  });

  it('no source file uses the retired sci-fi phrases', () => {
    const hits = [];
    // Plus the page title and the PWA manifest: the first words people see.
    const extra = ['index.html', 'vite.config.js'].map((f) => resolve(process.cwd(), f));
    for (const file of [...sourceFiles(SRC), ...extra]) {
      const lines = withoutComments(readFileSync(file, 'utf8')).split('\n');
      lines.forEach((line, i) => {
        BANNED.forEach((re) => {
          if (re.test(line)) hits.push(`${relative(SRC, file)}:${i + 1}  ${re}  ${line.trim().slice(0, 80)}`);
        });
      });
    }
    expect(hits).toEqual([]);
  });

  it('catches "vault" as a word in text, not in paths or identifiers', () => {
    const vault = BANNED.find((re) => re.source.includes('ault'));
    expect(vault.test("label: 'Question vault'")).toBe(true);
    expect(vault.test('<h2>Vault overview</h2>'.replace('<h2>', '>'))).toBe(true);
    expect(vault.test("import X from '../features/vault/BookmarkVaultTab';")).toBe(false);
    expect(vault.test('const CloudVaultTab = lazy(() => null);')).toBe(false);
  });

  it('no source file puts an emoji or a glyph icon in the UI', () => {
    const hits = [];
    for (const file of sourceFiles(SRC)) {
      const lines = withoutComments(readFileSync(file, 'utf8')).split('\n');
      lines.forEach((line, i) => {
        if (EMOJI.test(line)) hits.push(`${relative(SRC, file)}:${i + 1}  ${line.trim().slice(0, 80)}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it('the emoji rule spares typographic marks', () => {
    expect(EMOJI.test('Next → · 3 × 4 — “done”…')).toBe(false);
    expect(EMOJI.test('✅ Saved')).toBe(true);
    expect(EMOJI.test('✕')).toBe(true);
  });

  it('would catch a reintroduced phrase', () => {
    const sample = withoutComments("toast.success('Anomaly reported.'); // Global Matrix is fine in a comment");
    expect(BANNED.some((re) => re.test(sample))).toBe(true);
    expect(/Global Matrix/i.test(sample)).toBe(false);
  });
});
