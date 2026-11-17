// Every formula in the formula-card data files renders (2026-11-17). The card
// pipeline (ree-tracker-backend/scripts/cardsByTopic.js) refuses LaTeX outside
// $…$, but only KaTeX knows whether what is inside renders; a card that fails
// shows its source to the learner. The data files are CommonJS on the backend,
// read here because the frontend has KaTeX.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import katex from 'katex';

const require = createRequire(import.meta.url);
const DIR = path.resolve(__dirname, '../../../../ree-tracker-backend/scripts/data/cards');
const files = fs.readdirSync(DIR).flatMap((subject) => fs.readdirSync(path.join(DIR, subject)).map((f) => path.join(DIR, subject, f)));

// Units and a constant's value too (ESAS cards carry SI units, 2026-11-17).
const fieldsOf = (c) => [c.symbol, c.f, c.d, c.tip, c.unit, c.value, ...(c.vars || []).flatMap((x) => [x.symbol, x.meaning, x.unit])];
const textsOf = (data) => [...data.drafts.flatMap(fieldsOf), ...data.revisions.flatMap(fieldsOf)];

describe('formula card data', () => {
  it('has data files to check', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const file of files) {
    it(`${path.basename(path.dirname(file))}/${path.basename(file)}: every formula renders`, () => {
      const broken = [];
      for (const text of textsOf(require(file))) {
        for (const m of String(text ?? '').matchAll(/\$([^$]+)\$/g)) {
          try { katex.renderToString(m[1], { throwOnError: true }); } catch (e) { broken.push(`${m[1].slice(0, 60)}: ${e.message.slice(0, 80)}`); }
        }
      }
      expect(broken).toEqual([]);
    });
  }
});
