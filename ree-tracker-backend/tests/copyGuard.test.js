import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// The app shows a failed request's `error` (and a success `message`) to the
// learner: in a toast, in Sync issues, under a form. The frontend's copy guard
// (ree-tracker/src/test/copyGuard.test.js) keeps the old sci-fi voice out of
// the UI, but these strings come from here, and "Matrix sync transaction
// rejected." and "Admin clearance required." reached people that way. This
// scans every `error:` / `message:` string literal under src/ for the same
// retired words.

const SRC = resolve(__dirname, '..', 'src');

const BANNED = [
  /\bmatri(x|ces)\b/i,
  /\btelemetry\b/i,
  /clearance/i,
  /\buplink/i,
  /\bencrypted\b/i,
  /\bvault\b/i,
  /\bsector\b/i,
  /\bprotocol\b/i,
  /\btactical\b/i,
  /\bcompilation\b/i,
];

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith('.js') ? [path] : [];
  });
}

// `error: '…'`, `message: "…"` or a template literal, as an object property.
const RESPONSE_STRING = /\b(error|message)\s*:\s*(['"`])((?:\\.|(?!\2)[^\\])*)\2/g;

export const responseStrings = (text) => [...text.matchAll(RESPONSE_STRING)].map((m) => m[3]);

describe('backend copy guard', () => {
  it('finds the route files', () => {
    expect(sourceFiles(SRC).length).toBeGreaterThan(30);
  });

  it('no error or message string shown to learners uses the retired words', () => {
    const hits = [];
    for (const file of sourceFiles(SRC)) {
      for (const text of responseStrings(readFileSync(file, 'utf8'))) {
        const re = BANNED.find((r) => r.test(text));
        if (re) hits.push(`${relative(SRC, file)}  ${re}  ${text.slice(0, 80)}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('would catch a reintroduced phrase, and leaves log fields alone', () => {
    const found = responseStrings("res.status(500).json({ error: 'Matrix sync transaction rejected.' });");
    expect(found).toEqual(['Matrix sync transaction rejected.']);
    expect(BANNED.some((re) => re.test(found[0]))).toBe(true);
    // logger fields hold the caught error's own text, not copy
    expect(responseStrings("logger.error('x', { error: error.message })")).toEqual([]);
  });
});
