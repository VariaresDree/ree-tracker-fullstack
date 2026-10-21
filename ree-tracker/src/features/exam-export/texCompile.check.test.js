// @vitest-environment node
// Compiles every LaTeX export with a real pdflatex: the three documents for a
// 100-item EE paper, the mixed paper and every tricky fixture, on A4, Letter
// and long bond, each run twice (for "Page X of Y") with -no-shell-escape and
// -halt-on-error. Dev only: TeX is not a dependency of the repo.
//
//   npm run check:tex                      (skipped without pdflatex on PATH)
//   TEX_OUT=/some/dir npm run check:tex    keep the .tex/.pdf files there
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildExamTex } from './buildExamTex';
import { CONFIGS, allTrickyDraw, fixtureDraw } from './__fixtures__/fixtureDraws';

const hasTex = (() => {
  try {
    return spawnSync('pdflatex', ['--version'], { encoding: 'utf8' }).status === 0;
  } catch {
    return false;
  }
})();
const enabled = !!process.env.TEX_COMPILE && hasTex;

const DRAWS = {
  ee100: () => fixtureDraw(CONFIGS.ee100),
  blended: () => fixtureDraw(CONFIGS.blended),
  tricky: allTrickyDraw,
};

describe.skipIf(!enabled)('pdflatex compiles every export', () => {
  const outRoot = process.env.TEX_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'ree-tex-'));

  for (const [name, make] of Object.entries(DRAWS)) {
    for (const paper of ['a4', 'letter', 'long']) {
      it(`${name} on ${paper}: questions, answer sheet and key`, async () => {
        const draw = await make();
        const { files } = await buildExamTex(draw, { paper, includeSolutions: true });
        expect(files).toHaveLength(3);
        const dir = path.join(outRoot, `${name}-${paper}`);
        fs.mkdirSync(dir, { recursive: true });
        for (const file of files) {
          fs.writeFileSync(path.join(dir, file.name), file.content);
          for (let run = 0; run < 2; run += 1) {
            const res = spawnSync('pdflatex', ['-no-shell-escape', '-halt-on-error', '-interaction=nonstopmode', file.name], {
              cwd: dir, encoding: 'utf8', timeout: 180000,
            });
            expect(res.status, `${file.name} (run ${run + 1})\n${String(res.stdout).slice(-4000)}`).toBe(0);
          }
          const log = fs.readFileSync(path.join(dir, file.name.replace(/\.tex$/, '.log')), 'utf8');
          expect(log, `${file.name}: references left undefined`).not.toMatch(/There were undefined references|Reference `[^']*' on page \d+ undefined/);
          expect(fs.existsSync(path.join(dir, file.name.replace(/\.tex$/, '.pdf')))).toBe(true);
        }
      }, 600000);
    }
  }
});
