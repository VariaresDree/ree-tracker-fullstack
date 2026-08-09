// src/features/quiz-launcher/caqParser.test.js
//
// The format spec this parser implements was independently re-verified
// against three real sample files rather than trusted from documentation.
// The documentation got three things wrong, each locked here:
//
//   1. additionalInfo.inf per-record content is the literal string '<>' when
//      "empty", not ''. A naive `if (value)` check treats it as real content.
//   2. Real files contain questions with a byte-identical correct AND wrong
//      choice (an authoring defect) — unanswerable as scored unless the
//      duplicate is collapsed.
//   3. times.inf has one MORE element than there are questions (N+1), and
//      every value observed is '0' — there is no real per-question timing.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process'; // explicit import so eslint's browser-globals config doesn't flag the bare identifier
import { zipSync, strToU8 } from 'fflate';
import { parseCaqText, parseCaqArchive, CaqParseError } from './caqParser';

// import.meta.url under Vitest's jsdom transform doesn't resolve to a real
// filesystem path the way plain Node ESM does — process.cwd() is reliably
// the project root during a test run, so build the fixture path from there.
const fixturePath = (name) => join(process.cwd(), 'src/features/quiz-launcher/__fixtures__', name);
const readFixture = (name) => readFileSync(fixturePath(name));

// Builds a minimal valid quiz archive from a list of raw tempQuz.quz records
// (already `<>`-joined), so edge cases can be expressed as one record instead
// of reconstructing a whole realistic file.
function buildArchive(records, { explanations, additionalInfo, version = '2', settings = '1>><<false' } = {}) {
  const quz = records.join('>><<');
  const n = records.length;
  const files = {
    'tempQuz.quz': strToU8(quz),
    'explanations.inf': strToU8(explanations ?? Array(n).fill('').join('>><<')),
    'additionalInfo.inf': strToU8(additionalInfo ?? Array(n).fill('<>').join('>><<')),
    'times.inf': strToU8(Array(n + 1).fill('0').join('>><<')), // real files are N+1
    'tempSizeInf.inf': strToU8(Array(n).fill('21<>16').join('>><<')),
    'quizSettings.set': strToU8(settings),
    '.version': strToU8(version),
  };
  return zipSync(files);
}

const goodRecord = (stem, correctText, wrongTexts) =>
  ['multipleChoiceV2', stem, 'OR', `C${correctText}`, ...wrongTexts.map((w) => `W${w}`)].join('<>');

describe('parseCaqText (pure field-level parsing)', () => {
  it('parses a well-formed record into the normalized shape', () => {
    const quz = goodRecord('what is 2+2?', '4', ['3', '5', '22']);
    const result = parseCaqText({ quz, explanations: '', additionalInfo: '<>', version: '2', settings: '1>><<false' });
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]).toMatchObject({
      text: 'what is 2+2?',
      options: expect.arrayContaining(['4', '3', '5', '22']),
      answer: '4',
      defects: [],
    });
    expect(result.meta).toMatchObject({ totalRecords: 1, loadedCount: 1, skippedCount: 0 });
  });

  it("treats additionalInfo's '<>' record as empty, not as content — the documentation's blind spot", () => {
    const quz = goodRecord('q', 'a', ['b', 'c', 'd']);
    const result = parseCaqText({ quz, explanations: '', additionalInfo: '<>', version: '2', settings: '' });
    expect(result.questions[0].additionalInfo).toBeNull();
  });

  it('preserves genuine sidecar content when a future file actually has it', () => {
    const quz = goodRecord('q', 'a', ['b', 'c', 'd']);
    const result = parseCaqText({
      quz,
      explanations: 'because Ohm\'s law says so',
      additionalInfo: 'see fig. 3<>appendix B',
      version: '2',
      settings: '',
    });
    expect(result.questions[0].explanation).toBe("because Ohm's law says so");
    expect(result.questions[0].additionalInfo).toBe('see fig. 3<>appendix B');
  });

  it('collapses a byte-identical correct+wrong duplicate choice and flags it — the real authoring defect', () => {
    // Mirrors AC Circuits Q1 exactly: correct and one wrong choice share text.
    const quz = ['multipleChoiceV2', 'q', 'OR', 'Cleads, between 0° to 90°', 'Wlags, 90°', 'Wlags, between 0°to 90°', 'Wleads, between 0° to 90°'].join('<>');
    const result = parseCaqText({ quz, explanations: '', additionalInfo: '<>', version: '2', settings: '' });
    const q = result.questions[0];
    expect(q.options).toHaveLength(3); // 4 raw choices, one pair collapsed
    expect(q.answer).toBe('leads, between 0° to 90°');
    expect(q.options).toContain(q.answer); // genuinely answerable
    expect(q.defects).toContain('duplicate-option-removed');
  });

  it('degree signs and other UTF-8 survive intact', () => {
    const quz = goodRecord('0° to 90°', 'μ0', ['b', 'c', 'd']);
    const result = parseCaqText({ quz, explanations: '', additionalInfo: '<>', version: '2', settings: '' });
    expect(result.questions[0].text).toBe('0° to 90°');
    expect(result.questions[0].answer).toBe('μ0');
  });

  it('skips a record with the wrong field count and counts it, without failing the batch', () => {
    const good = goodRecord('good one', 'a', ['b', 'c', 'd']);
    const bad = 'multipleChoiceV2<>missing fields<>OR';
    const result = parseCaqText({ quz: [good, bad].join('>><<'), explanations: '', additionalInfo: '', version: '2', settings: '' });
    expect(result.questions).toHaveLength(1);
    expect(result.meta).toMatchObject({ totalRecords: 2, loadedCount: 1, skippedCount: 1 });
    expect(result.warnings[0]).toMatch(/expected 7 fields/);
  });

  it('skips a record with zero correct choices', () => {
    const bad = ['multipleChoiceV2', 'q', 'OR', 'Wa', 'Wb', 'Wc', 'Wd'].join('<>');
    const good = goodRecord('good', 'a', ['b', 'c', 'd']);
    const result = parseCaqText({ quz: [bad, good].join('>><<'), explanations: '', additionalInfo: '', version: '2', settings: '' });
    expect(result.meta).toMatchObject({ loadedCount: 1, skippedCount: 1 });
  });

  it('throws (no valid questions) rather than silently returning empty when every record is malformed', () => {
    const bad = ['multipleChoiceV2', 'q', 'OR', 'Wa', 'Wb', 'Wc', 'Wd'].join('<>');
    expect(() => parseCaqText({ quz: bad, explanations: '', additionalInfo: '', version: '2', settings: '' }))
      .toThrow(CaqParseError);
  });

  it('skips a record with two correct choices', () => {
    const bad = ['multipleChoiceV2', 'q', 'OR', 'Ca', 'Cb', 'Wc', 'Wd'].join('<>');
    const good = goodRecord('good', 'a', ['b', 'c', 'd']);
    const result = parseCaqText({ quz: [bad, good].join('>><<'), explanations: '', additionalInfo: '', version: '2', settings: '' });
    expect(result.meta).toMatchObject({ loadedCount: 1, skippedCount: 1 });
    expect(result.warnings[0]).toMatch(/exactly 1 correct/);
  });

  it('skips a record with a choice count other than 4', () => {
    const bad = ['multipleChoiceV2', 'q', 'OR', 'Ca', 'Wb', 'Wc'].join('<>'); // only 3 choices
    const good = goodRecord('good', 'a', ['b', 'c', 'd']);
    const result = parseCaqText({ quz: [bad, good].join('>><<'), explanations: '', additionalInfo: '', version: '2', settings: '' });
    expect(result.meta.skippedCount).toBe(1);
  });

  it('skips an unsupported question type without misreporting it as a field-count error', () => {
    const bad = ['fillInTheBlank', 'q', 'OR', 'a', 'b'].join('<>');
    const good = goodRecord('good', 'a', ['b', 'c', 'd']);
    const result = parseCaqText({ quz: [bad, good].join('>><<'), explanations: '', additionalInfo: '', version: '2', settings: '' });
    expect(result.meta.skippedCount).toBe(1);
    expect(result.warnings[0]).toMatch(/unsupported question type "fillInTheBlank"/);
  });

  it('skips a record with blank (whitespace-only) question text', () => {
    const bad = goodRecord('   ', 'a', ['b', 'c', 'd']);
    const good = goodRecord('real question', 'a', ['b', 'c', 'd']);
    const result = parseCaqText({ quz: [bad, good].join('>><<'), explanations: '', additionalInfo: '', version: '2', settings: '' });
    expect(result.meta).toMatchObject({ loadedCount: 1, skippedCount: 1 });
  });

  it('throws on an entirely empty question payload', () => {
    expect(() => parseCaqText({ quz: '', explanations: '', additionalInfo: '', version: '2', settings: '' }))
      .toThrow(CaqParseError);
    expect(() => parseCaqText({ quz: null, explanations: '', additionalInfo: '', version: '2', settings: '' }))
      .toThrow(CaqParseError);
  });
});

describe('parseCaqArchive (real files + synthetic archives)', () => {
  it('loads the real AC Circuits sample: 36 questions, correct answers, defect flagged', async () => {
    const result = await parseCaqArchive(readFixture('ac-circuits.quiz'));
    expect(result.meta.loadedCount).toBe(36);
    expect(result.meta.skippedCount).toBe(0);
    const q1 = result.questions[0];
    expect(q1.text).toBe('the total voltage in a series RL circuit ____ the current by angle _____');
    expect(q1.answer).toBe('leads, between 0° to 90°');
    expect(q1.defects).toContain('duplicate-option-removed'); // the real Q1 defect
    // No question should carry the sidecar-punctuation-as-content bug.
    expect(result.questions.every((q) => q.additionalInfo === null)).toBe(true);
  });

  it('loads the real Alternators sample: 49 questions', async () => {
    const result = await parseCaqArchive(readFixture('alternators.quiz'));
    expect(result.meta.loadedCount).toBe(49);
    expect(result.questions.some((q) => q.defects.includes('duplicate-option-removed'))).toBe(true);
  });

  it('rejects non-ZIP bytes cleanly, never throwing synchronously', async () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    await expect(parseCaqArchive(garbage)).rejects.toThrow(CaqParseError);
  });

  it('rejects a truncated archive cleanly', async () => {
    const full = readFixture('ac-circuits.quiz');
    const truncated = full.subarray(0, Math.floor(full.length * 0.6));
    await expect(parseCaqArchive(truncated)).rejects.toThrow(CaqParseError);
  });

  it('rejects an empty file', async () => {
    await expect(parseCaqArchive(new Uint8Array(0))).rejects.toThrow(CaqParseError);
  });

  it('rejects an archive with no tempQuz.quz entry', async () => {
    const archive = zipSync({ 'readme.txt': strToU8('not a quiz') });
    await expect(parseCaqArchive(archive)).rejects.toThrow(/missing its question data/);
  });

  it('parses a minimal synthetic archive built from scratch', async () => {
    const archive = buildArchive([goodRecord('2+2=?', '4', ['1', '2', '3'])]);
    const result = await parseCaqArchive(archive);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].answer).toBe('4');
  });

  it('accepts an ArrayBuffer as well as a Uint8Array', async () => {
    const archive = buildArchive([goodRecord('q', 'a', ['b', 'c', 'd'])]);
    const ab = archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength);
    const result = await parseCaqArchive(ab);
    expect(result.questions).toHaveLength(1);
  });
});
