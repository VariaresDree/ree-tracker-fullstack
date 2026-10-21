// @vitest-environment node
// The layout standard (components/ui/Page.jsx, FEATURES.md › Layout
// standard), as far as a scan of the source can hold it:
//   - routed screens sit in <Page>: no hand-rolled `max-w-*xl mx-auto` page
//     frame, and no max-w-5xl (a width Page doesn't have)
//   - surfaces take the card radius, never Tailwind's rounded-xl/2xl
//   - page grids are <Grid>, sized by the room they have: a viewport
//     breakpoint for 3 or 4 columns ignored the 288px sidebar
// Each list of exceptions says why.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(process.cwd(), 'src');
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.jsx?$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name)) files.push(full);
  }
})(SRC);
const rel = (f) => path.relative(SRC, f).split(path.sep).join('/');
const scan = (pattern, allow = {}) => files.flatMap((f) => {
  if (allow[rel(f)]) return [];
  return fs.readFileSync(f, 'utf8').split('\n')
    .map((line, i) => (pattern.test(line) ? `${rel(f)}:${i + 1}  ${line.trim().slice(0, 140)}` : null))
    .filter(Boolean);
});

describe('layout standard', () => {
  it('pages sit in <Page>, not a hand-rolled frame', () => {
    expect(scan(/max-w-5xl/)).toEqual([]);
    expect(scan(/max-w-[3-6]xl[^'"`]*mx-auto|mx-auto[^'"`]*max-w-[3-6]xl/, {
      'components/ui/Page.jsx': 'the frame itself',
    })).toEqual([]);
  });

  it('surfaces take the card radius, not rounded-xl or rounded-2xl', () => {
    expect(scan(/\brounded-(xl|2xl)\b/)).toEqual([]);
  });

  it('small labels use the text-micro size, not an arbitrary 11px', () => {
    expect(scan(/text-\[11px\]/)).toEqual([]);
  });

  it('page grids follow the room they have (<Grid>), not the window', () => {
    expect(scan(/(?<![@\w-])(md|lg|xl):grid-cols-[3-6]\b/, {
      'components/ui/Grid.jsx': 'documents the rule it replaces',
      // Forms and dialogs: their width is the dialog's, not the page's.
      'features/library/QuestionEditModal.jsx': 'admin question editor (dialog)',
      'features/library/ManualIngestionForm.jsx': 'a form',
      'features/exams/HostBattleModal.jsx': 'a dialog',
      'features/reference/ReferenceAdminV2.jsx': 'admin forms',
      'features/admin/ai/QuestionGenerator.jsx': 'admin form',
      'features/admin/ai/AiStatusPanel.jsx': 'admin panel',
      'features/account/SecuritySettings.jsx': 'a form',
    })).toEqual([]);
  });
});

// Numbers that change in place (a countdown, a streak, a score, a count)
// keep their width when a digit changes, so a pill or tile doesn't jitter:
// the primitives that show them set tabular figures for everything inside.
describe('tabular figures', () => {
  it.each(['Badge', 'StatusPill', 'Stat', 'KpiTile'])('%s keeps tabular-nums', (name) => {
    expect(fs.readFileSync(path.join(SRC, `components/ui/${name}.jsx`), 'utf8')).toMatch(/\btabular-nums\b/);
  });
});

// The sidebar is glass like the page's cards, so the theme's texture runs
// behind it; its current page glows in the accent (a shadow, which forced
// colours drop, keeping the accent edge).
describe('sidebar surface', () => {
  const src = fs.readFileSync(path.join(SRC, 'layouts/Sidebar.jsx'), 'utf8');
  it('is a glass surface, not a solid card colour', () => {
    const aside = src.match(/<aside className=\{[^\n]*/)?.[0] ?? '';
    expect(aside).toMatch(/\bsurface-glass\b/);
    expect(aside).not.toMatch(/\bbg-surface\b/);
  });
  it('marks the current page with the accent edge and a glow', () => {
    const active = src.match(/const ACTIVE = '([^']*)'/)?.[1] ?? '';
    expect(active).toMatch(/border-l-\[var\(--accent\)\]/);
    expect(active).toMatch(/shadow-\[inset_0_0_0_1px_color-mix/);
  });
});
