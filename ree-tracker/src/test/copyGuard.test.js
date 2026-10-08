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

describe('copy guard', () => {
  it('finds the source tree', () => {
    expect(sourceFiles(SRC).length).toBeGreaterThan(100);
  });

  it('no source file uses the retired sci-fi phrases', () => {
    const hits = [];
    for (const file of sourceFiles(SRC)) {
      const lines = withoutComments(readFileSync(file, 'utf8')).split('\n');
      lines.forEach((line, i) => {
        BANNED.forEach((re) => {
          if (re.test(line)) hits.push(`${relative(SRC, file)}:${i + 1}  ${re}  ${line.trim().slice(0, 80)}`);
        });
      });
    }
    expect(hits).toEqual([]);
  });

  it('would catch a reintroduced phrase', () => {
    const sample = withoutComments("toast.success('Anomaly reported.'); // Global Matrix is fine in a comment");
    expect(BANNED.some((re) => re.test(sample))).toBe(true);
    expect(/Global Matrix/i.test(sample)).toBe(false);
  });
});
