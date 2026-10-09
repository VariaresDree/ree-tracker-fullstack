import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// The accent as TEXT (or an icon) is --accent-text, never --accent or
// --accent-velocity: the brand purple measures 1.5–4.4:1 as text across the
// 13 themes, under the 4.5:1 floor everywhere (themeContrast.test.js holds
// --accent-text to it). The 2026-10 fix found 47 call sites still using the
// plain accent as text, in four different spellings; nothing stopped the next
// one. This scans every source file outside tests for those spellings.
// Backgrounds, borders and tints (bg-, border-, color-mix) keep --accent.
//
// Comments are skipped: history notes may quote the old spellings.

// Vitest runs from the package root (as copyGuard.test does).
const SRC = resolve(process.cwd(), 'src');

const ACCENT_AS_TEXT = [
  // The brand colours, the same way: text and icons use the -text form,
  // which the dark colourful themes lighten (index.css).
  /\btext-ree(Red|Purple|Green|Amber|Cyan|Blue)\b(?!-text)/,
  /\bcolor:\s*[^,}\n]*'var\(--color-ree(Red|Purple|Green|Amber|Cyan|Blue)\)'/,
  /\btext-accent\b(?!-text)/, // the @theme alias (accent-velocity)
  /\btext-velocity\b/,
  /\btext-\[var\(--accent(-velocity)?\)\]/,
  /\bcolor:\s*[^,}\n]*'var\(--accent(-velocity)?\)'/, // inline style={{ color: … }}
];

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(name) && !/\.test\.(js|jsx)$/.test(name) ? [path] : [];
  });
}

const withoutComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1');

describe('accent as text', () => {
  it('no source file colours text or icons with the plain accent', () => {
    const hits = [];
    for (const file of sourceFiles(SRC)) {
      const lines = withoutComments(readFileSync(file, 'utf8')).split('\n');
      lines.forEach((line, i) => {
        ACCENT_AS_TEXT.forEach((re) => {
          if (re.test(line)) hits.push(`${relative(SRC, file)}:${i + 1}  ${re}  ${line.trim().slice(0, 80)}`);
        });
      });
    }
    expect(hits).toEqual([]);
  });

  it('catches each spelling, and leaves backgrounds, borders and the text token alone', () => {
    const flagged = (s) => ACCENT_AS_TEXT.some((re) => re.test(s));
    expect(flagged('className="text-accent font-bold"')).toBe(true);
    expect(flagged('className="hover:text-[var(--accent)]"')).toBe(true);
    expect(flagged("style={{ color: 'var(--accent-velocity)' }}")).toBe(true);
    expect(flagged("color: selected ? 'var(--accent)' : 'var(--text-muted2)',")).toBe(true);
    expect(flagged('className="text-reeRed font-bold"')).toBe(true);
    expect(flagged("style={{ color: 'var(--color-reeAmber)' }}")).toBe(true);
    expect(flagged('className="text-reeRed-text bg-reeRed/10 border-reeRed/30"')).toBe(false);
    expect(flagged("background: 'color-mix(in srgb, var(--color-reeAmber) 10%, transparent)'")).toBe(false);

    expect(flagged('className="text-accent-text bg-accent border-[var(--accent)]"')).toBe(false);
    expect(flagged("style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent-text)' }}")).toBe(false);
    expect(flagged("backgroundColor: 'var(--accent)'")).toBe(false);
  });
});
