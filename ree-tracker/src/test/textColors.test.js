import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Colours used as TEXT (or icons) have text forms, and only those are held to
// the 4.5:1 floor in every theme (styles/themeContrast.test.js):
//   • the accent: --accent-text, never --accent / --accent-velocity (the brand
//     purple measures 1.5–4.4:1 as text across the 13 themes);
//   • the brand colours: text-ree*-text / var(--color-ree*-text), which the
//     dark colourful themes lighten; the base colours stay for fills.
// The 2026-10 passes moved 47 accent and 86 brand uses over, in several
// spellings, and found more reaching text through tone maps and props. This
// scans every source file outside tests so the next one fails here.
//
// Comments are skipped: history notes may quote the old spellings.

// Vitest runs from the package root (as copyGuard.test does).
const SRC = resolve(process.cwd(), 'src');

const HUES = '(Red|Purple|Green|Amber|Cyan|Blue)';

// Class names and inline `color:` styles: always text.
const AS_TEXT = [
  new RegExp(`\\btext-ree${HUES}\\b(?!-text)`),
  new RegExp(`\\bcolor:\\s*[^,}\\n]*'var\\(--color-ree${HUES}\\)'`),
  /\btext-accent\b(?!-text)/, // the @theme alias (accent-velocity)
  /\btext-velocity\b/,
  /\btext-\[var\(--accent(-velocity)?\)\]/,
  /\bcolor:\s*[^,}\n]*'var\(--accent(-velocity)?\)'/, // inline style={{ color: … }}
];

// A raw base colour as a value (a tone map entry, a prop, a variable) usually
// ends up as a text or icon colour somewhere. Allowed on a line that is about
// a fill (background, border, fill, stroke, a color-mix tint, a shadow), or in
// the places below, which only ever paint shapes.
const RAW_COLOUR = new RegExp(`['"]var\\(--(accent|accent-velocity|color-ree${HUES})\\)['"]`);
const FILL_CONTEXT = /background|border|[Ff]ill|stroke|color-mix|shadow/;
const GRAPHIC_ONLY = [
  ['components/ui/Button.jsx', 'button fills behind white text'],
  ['components/ui/ProgressIndicator.jsx', 'progress bar fills'],
  ['components/ui/Sparkline.jsx', 'a decorative line (aria-hidden)'],
  ['features/analytics/sections/shared.jsx', 'BarList bar fills'],
  ['features/analytics/sections/TimePerTopic.jsx', 'BarList bar fills'],
  ['features/analytics/TrajectoryCard.jsx', 'forecast range bar fills'],
  ['features/today/TodayPanel.jsx', "today's target bar fills"],
  ['features/board-simulator/SimulatorDiagnostics.jsx', 'subject score bar fills', /subjectScores/],
];

const graphicOnly = (file, line) => GRAPHIC_ONLY.some(([f, , only]) => file === f && (!only || only.test(line)));

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

export function textColorProblems(file, line) {
  const problems = AS_TEXT.filter((re) => re.test(line)).map(String);
  if (RAW_COLOUR.test(line) && !FILL_CONTEXT.test(line) && !graphicOnly(file, line)) problems.push('raw base colour as a value');
  return problems;
}

describe('colours as text', () => {
  it('no source file colours text or icons with a base colour', () => {
    const hits = [];
    for (const path of sourceFiles(SRC)) {
      const file = relative(SRC, path).replace(/\\/g, '/');
      withoutComments(readFileSync(path, 'utf8')).split('\n').forEach((line, i) => {
        for (const problem of textColorProblems(file, line)) hits.push(`${file}:${i + 1}  ${problem}  ${line.trim().slice(0, 80)}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it('catches each spelling, and leaves fills, borders, the text forms and the graphic-only places alone', () => {
    const flagged = (line, file = 'features/x/Y.jsx') => textColorProblems(file, line).length > 0;
    // accent
    expect(flagged('className="text-accent font-bold"')).toBe(true);
    expect(flagged('className="hover:text-[var(--accent)]"')).toBe(true);
    expect(flagged("style={{ color: 'var(--accent-velocity)' }}")).toBe(true);
    expect(flagged("color: selected ? 'var(--accent)' : 'var(--text-muted2)',")).toBe(true);
    // brand colours
    expect(flagged('className="text-reeRed font-bold"')).toBe(true);
    expect(flagged("style={{ color: 'var(--color-reeAmber)' }}")).toBe(true);
    // through a tone map, a prop or a variable
    expect(flagged("  amber: 'var(--color-reeAmber)',")).toBe(true);
    expect(flagged('<StatTile color="var(--color-reeCyan)" />')).toBe(true);
    expect(flagged("const modeColor = isWork ? 'var(--color-reeAmber)' : 'var(--accent-success)';")).toBe(true);
    // fine
    expect(flagged('className="text-reeRed-text bg-reeRed/10 border-reeRed/30"')).toBe(false);
    expect(flagged("background: 'color-mix(in srgb, var(--color-reeAmber) 10%, transparent)'")).toBe(false);
    expect(flagged('className="text-accent-text bg-accent border-[var(--accent)]"')).toBe(false);
    expect(flagged("style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}")).toBe(false);
    expect(flagged("backgroundColor: 'var(--accent)'")).toBe(false);
    expect(flagged("  amber: 'var(--color-reeAmber)',", 'components/ui/ProgressIndicator.jsx')).toBe(false);
  });
});
