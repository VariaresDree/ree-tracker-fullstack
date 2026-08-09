// src/features/quiz-launcher/caqParser.js
//
// Parses a third-party "CAQ" quiz archive (.quiz / .caq — a ZIP, deflate) into
// a normalized in-memory shape the launcher's exam runner consumes. Pure:
// Uint8Array/ArrayBuffer in, { questions, meta, warnings } out. No React, no
// store, no network — this file must stay importable and testable in total
// isolation from the rest of the app (see quiz-launcher.isolation.test.js).
//
// Format verified directly against three real sample files (April 2020 AC
// Circuits, Alternators, Chemistry) — not assumed from documentation. See the
// header of caqParser.test.js for the specific things that documentation got
// wrong that this parser corrects for.
import { unzip } from 'fflate';

const RECORD_SEP = '>><<';
const FIELD_SEP = '<>';
const KNOWN_TYPE = 'multipleChoiceV2';
const EXPECTED_FIELD_COUNT = 7;
const EXPECTED_CHOICE_COUNT = 4;

// Defensive caps — this parser runs on arbitrary user-selected files, including
// potentially hostile ones (zip bombs, deeply malformed archives). None of the
// real samples come close to these; they exist purely so a bad file can't hang
// the tab or exhaust memory.
const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024; // 20MB compressed
const MAX_ENTRY_BYTES = 20 * 1024 * 1024; // 20MB per inflated entry
const MAX_QUESTIONS = 2000;

export class CaqParseError extends Error {}

/**
 * Split a sidecar .inf file into its per-question parallel array. Trims each
 * part but does NOT treat a merely-punctuation record ('<>' with no content
 * either side of the field separator) as non-empty — additionalInfo.inf in
 * every real sample is genuinely empty per-record, but its raw text is the
 * literal string '<>', not ''. A naive `if (value)` check would treat that as
 * real content and render a blank info box on every single question.
 */
function splitSidecar(raw) {
  if (!raw) return [];
  return raw.split(RECORD_SEP).map((rec) => {
    const fields = rec.split(FIELD_SEP).map((f) => f.trim());
    const joined = fields.join('').trim();
    return joined ? fields.join(FIELD_SEP) : '';
  });
}

/**
 * De-duplicate choices with identical trimmed text. Real sample data contains
 * questions where the correct choice and a wrong choice are byte-identical
 * (an authoring defect, not a parser bug) — e.g. "leads, between 0° to 90°"
 * appears twice, once marked C and once W. Scoring by option TEXT (see
 * parseRecord) already makes either copy count as correct, but rendering both
 * would show two visually-identical options where clicking either "should"
 * work — confusing. Collapse to one, keep it correct if any copy was, and
 * record the defect so it's visible rather than silently corrected.
 */
function dedupeChoices(choices) {
  const seen = new Map(); // trimmed text -> { text, correct }
  for (const { text, correct } of choices) {
    const key = text.trim();
    const existing = seen.get(key);
    if (existing) {
      existing.correct = existing.correct || correct;
    } else {
      seen.set(key, { text, correct });
    }
  }
  return {
    deduped: [...seen.values()],
    removedCount: choices.length - seen.size,
  };
}

/**
 * Parse one tempQuz.quz record into a normalized question, or return null
 * with a reason if the record doesn't match the expected shape. Never throws
 * — malformed records are the expected/handled case, not an error path.
 */
function parseRecord(record, index) {
  const fields = record.split(FIELD_SEP);
  // Type first, independent of field count: an unsupported question type
  // (e.g. a future fill-in-the-blank format) should be reported as exactly
  // that, not misreported as a field-count mismatch just because it happens
  // to carry a different number of fields.
  const type = fields[0];
  if (type !== KNOWN_TYPE) {
    return { question: null, reason: `record ${index + 1}: unsupported question type "${type}"` };
  }
  if (fields.length !== EXPECTED_FIELD_COUNT) {
    return { question: null, reason: `record ${index + 1}: expected ${EXPECTED_FIELD_COUNT} fields, got ${fields.length}` };
  }
  const [, stem, , ...rawChoices] = fields;
  if (rawChoices.length !== EXPECTED_CHOICE_COUNT) {
    return { question: null, reason: `record ${index + 1}: expected ${EXPECTED_CHOICE_COUNT} choices, got ${rawChoices.length}` };
  }

  const choices = rawChoices.map((c) => ({ correct: c[0] === 'C', text: c.slice(1).trim() }));
  const correctCount = choices.filter((c) => c.correct).length;
  if (correctCount !== 1) {
    return { question: null, reason: `record ${index + 1}: expected exactly 1 correct choice, found ${correctCount}` };
  }

  const stemTrimmed = stem.trim();
  if (!stemTrimmed) {
    return { question: null, reason: `record ${index + 1}: empty question text` };
  }

  const defects = [];
  const { deduped, removedCount } = dedupeChoices(choices);
  if (removedCount > 0) defects.push('duplicate-option-removed');
  if (deduped.length < 2) {
    return { question: null, reason: `record ${index + 1}: fewer than 2 distinct choices after de-duplication` };
  }

  const correct = deduped.find((c) => c.correct);
  return {
    question: {
      id: `q${index}`,
      text: stemTrimmed,
      options: deduped.map((c) => c.text),
      answer: correct.text,
      explanation: null,
      additionalInfo: null,
      defects,
    },
    reason: null,
  };
}

/**
 * Core text-processing step, separated from the ZIP/async layer so it's
 * trivially unit-testable with plain strings.
 * @returns {{ questions: object[], meta: object, warnings: string[] }}
 */
export function parseCaqText({ quz, explanations, additionalInfo, version, settings }) {
  if (!quz || !quz.trim()) {
    throw new CaqParseError('This archive has no question data.');
  }

  const records = quz.split(RECORD_SEP).filter((r) => r.trim().length > 0);
  const explanationList = splitSidecar(explanations);
  const infoList = splitSidecar(additionalInfo);

  const questions = [];
  const warnings = [];
  let skipped = 0;

  records.slice(0, MAX_QUESTIONS).forEach((record, i) => {
    const { question, reason } = parseRecord(record, i);
    if (!question) {
      skipped += 1;
      warnings.push(reason);
      return;
    }
    question.explanation = explanationList[i] || null;
    question.additionalInfo = infoList[i] || null;
    questions.push(question);
  });

  if (records.length > MAX_QUESTIONS) {
    warnings.push(`archive contains ${records.length} records; only the first ${MAX_QUESTIONS} were loaded`);
  }

  if (questions.length === 0) {
    throw new CaqParseError('No valid questions could be read from this file.');
  }

  return {
    questions,
    meta: {
      version: version ? version.trim() : null,
      settings: settings ? settings.trim() : null,
      totalRecords: records.length,
      loadedCount: questions.length,
      skippedCount: skipped,
    },
    warnings,
  };
}

/**
 * Full entry point: raw archive bytes -> normalized quiz. Uses fflate's
 * ASYNC unzip (not unzipSync) specifically so a large/hostile file inflates
 * off the main thread's synchronous call stack — unzipSync on a big archive
 * would freeze the tab for its whole duration.
 * @param {ArrayBuffer|Uint8Array} bytes
 * @returns {Promise<{questions: object[], meta: object, warnings: string[]}>}
 */
export function parseCaqArchive(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  if (data.byteLength === 0) {
    return Promise.reject(new CaqParseError('This file is empty.'));
  }
  if (data.byteLength > MAX_ARCHIVE_BYTES) {
    return Promise.reject(new CaqParseError('This file is larger than a quiz archive should be.'));
  }

  return new Promise((resolve, reject) => {
    let oversizeEntry = null;
    unzip(
      data,
      {
        filter(file) {
          if (file.originalSize > MAX_ENTRY_BYTES) {
            oversizeEntry = file.name;
            return false;
          }
          return true;
        },
      },
      (err, files) => {
        if (oversizeEntry) {
          reject(new CaqParseError('This archive contains an unexpectedly large file and was rejected.'));
          return;
        }
        if (err) {
          reject(new CaqParseError("This doesn't look like a valid quiz file."));
          return;
        }
        try {
          const decoder = new TextDecoder('utf-8');
          const read = (name) => (files[name] ? decoder.decode(files[name]) : null);
          const quz = read('tempQuz.quz');
          if (!quz) {
            reject(new CaqParseError('This archive is missing its question data (tempQuz.quz).'));
            return;
          }
          const result = parseCaqText({
            quz,
            explanations: read('explanations.inf'),
            additionalInfo: read('additionalInfo.inf'),
            version: read('.version'),
            settings: read('quizSettings.set'),
          });
          resolve(result);
        } catch (e) {
          reject(e instanceof CaqParseError ? e : new CaqParseError("This doesn't look like a valid quiz file."));
        }
      },
    );
  });
}
