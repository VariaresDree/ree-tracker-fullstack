import { describe, it, expect } from 'vitest';
const { buildVersionSnapshot, toLiveQuestionData, CONTENT_FIELDS, createLiveQuestion, isBulkEligible } = require('../src/services/reviewService');
const { reviewEditSchema, reviewApproveSchema, reviewRejectSchema, bulkIdsSchema } = require('../src/schemas/reviewSchemas');
const { normalizeSubject, SUBJECT_VARIANTS } = require('../src/utils/subject');

const reviewRow = {
  id: 'rev-1',
  subject: 'EE',
  subtopic: 'AC Electric Circuits',
  text: 'What is the impedance of a purely resistive 10-ohm load?',
  options: ['10 ohms', '0 ohms', 'Infinite', 'j10 ohms'],
  answer: '10 ohms',
  difficulty: 2.0,
  fixedExplanation: null,
  source: 'ai',
  type: 'calculation',
  bloomLevel: 'REMEMBER',
  difficultyTier: 1,
  status: 'PENDING',
  submittedBy: 'user-1',
  createdAt: new Date(),
};

describe('buildVersionSnapshot', () => {
  it('picks exactly the content fields (no ids/status/timestamps)', () => {
    const snap = buildVersionSnapshot(reviewRow);
    expect(Object.keys(snap).sort()).toEqual([...CONTENT_FIELDS].sort());
    expect(snap.id).toBeUndefined();
    expect(snap.status).toBeUndefined();
    expect(snap.createdAt).toBeUndefined();
  });

  it('omits fields the row does not carry (undefined stays out of the Json)', () => {
    const snap = buildVersionSnapshot({ subject: 'EE', text: 'x' });
    expect(Object.keys(snap).sort()).toEqual(['subject', 'text']);
  });
});

describe('toLiveQuestionData — reviewer edits over the AI submission', () => {
  it('with no edits, returns the reviewed row content unchanged', () => {
    expect(toLiveQuestionData(reviewRow)).toEqual(buildVersionSnapshot(reviewRow));
  });

  it('defined edit fields win; everything else survives', () => {
    const out = toLiveQuestionData(reviewRow, { answer: 'j10 ohms', text: 'Edited text' });
    expect(out.answer).toBe('j10 ohms');
    expect(out.text).toBe('Edited text');
    expect(out.subject).toBe('EE');
    expect(out.options).toEqual(reviewRow.options);
  });

  it('undefined edits do not clobber (partial-update semantics)', () => {
    const out = toLiveQuestionData(reviewRow, { answer: undefined });
    expect(out.answer).toBe('10 ohms');
  });

  it('ignores non-content edit keys (status/promotedQuestionId can never ride along)', () => {
    const out = toLiveQuestionData(reviewRow, { status: 'APPROVED', promotedQuestionId: 'q-9', isFlagged: true });
    expect(out.status).toBeUndefined();
    expect(out.promotedQuestionId).toBeUndefined();
    expect(out.isFlagged).toBeUndefined();
  });
});

describe('review schemas', () => {
  it('edit/approve accept partial payloads including {} and sanitize choice labels', () => {
    expect(reviewApproveSchema.parse({})).toEqual({});
    const parsed = reviewEditSchema.parse({ options: ['A. 10 ohms', 'B) 20 ohms'], answer: 'A. 10 ohms' });
    expect(parsed.options).toEqual(['10 ohms', '20 ohms']);
    expect(parsed.answer).toBe('10 ohms'); // exact-match grading invariant holds
  });

  it('edit rejects malformed fields (empty text, <2 options)', () => {
    expect(reviewEditSchema.safeParse({ text: '' }).success).toBe(false);
    expect(reviewEditSchema.safeParse({ options: ['only one'] }).success).toBe(false);
  });

  it('reject schema takes an optional bounded note', () => {
    expect(reviewRejectSchema.parse({})).toEqual({});
    expect(reviewRejectSchema.parse({ reviewNote: 'wrong answer key' }).reviewNote).toBe('wrong answer key');
    expect(reviewRejectSchema.safeParse({ reviewNote: 'x'.repeat(2001) }).success).toBe(false);
  });
});

// Phase 0 (Delta-Sync content delivery): a question cannot be promoted to LIVE
// without a recognized subject, or it enters syllabus-weighted Board Simulator
// selection with no/wrong weighting. The gate runs BEFORE any DB access, so
// these rejections need no database.
describe('createLiveQuestion — hard taxonomy gate', () => {
  const expectRejected = (data) =>
    expect(createLiveQuestion(data)).rejects.toMatchObject({ code: 'INVALID_TAXONOMY' });

  it('rejects a missing subject', () => expectRejected({ text: 'q', answer: 'a' }));
  it('rejects the "Unknown" default subject', () => expectRejected({ subject: 'Unknown', text: 'q' }));
  it('rejects an unrecognized subject', () => expectRejected({ subject: 'Chemistry', text: 'q' }));

  it('recognizes exactly the canonical live subjects (the gate predicate), incl. spelling variants', () => {
    const recognized = (s) => !!SUBJECT_VARIANTS[normalizeSubject(s)];
    expect(recognized('Mathematics')).toBe(true);
    expect(recognized('Math')).toBe(true);            // historical spelling normalizes
    expect(recognized('ESAS')).toBe(true);
    expect(recognized('Electrical Engineering')).toBe(true);
    expect(recognized('Unknown')).toBe(false);
    expect(recognized('Chemistry')).toBe(false);
    expect(recognized('')).toBe(false);
    expect(recognized(undefined)).toBe(false);
  });
});

// "Accept All" clean-item gate: bulk approval carries NO inline edits, so the
// row itself must satisfy the invariants the inline editor enforces one-by-one.
// Anything failing stays in the queue for individual review. (The approveBulk
// DB loop itself follows the untested-by-convention single-approve handler —
// this predicate is where the decision logic lives.)
describe('isBulkEligible — the Accept-All clean-item gate', () => {
  it('accepts a clean row', () => {
    expect(isBulkEligible(reviewRow)).toBe(true);
  });

  it('rejects null/undefined rows', () => {
    expect(isBulkEligible(null)).toBe(false);
    expect(isBulkEligible(undefined)).toBe(false);
  });

  it('rejects an unrecognized or missing subject (INVALID_TAXONOMY precheck)', () => {
    expect(isBulkEligible({ ...reviewRow, subject: 'Chemistry' })).toBe(false);
    expect(isBulkEligible({ ...reviewRow, subject: undefined })).toBe(false);
    expect(isBulkEligible({ ...reviewRow, subject: 'Unknown' })).toBe(false);
  });

  it('rejects empty/whitespace text', () => {
    expect(isBulkEligible({ ...reviewRow, text: '' })).toBe(false);
    expect(isBulkEligible({ ...reviewRow, text: '   ' })).toBe(false);
    expect(isBulkEligible({ ...reviewRow, text: null })).toBe(false);
  });

  it('rejects fewer than two options', () => {
    expect(isBulkEligible({ ...reviewRow, options: ['only one'] })).toBe(false);
    expect(isBulkEligible({ ...reviewRow, options: [] })).toBe(false);
    expect(isBulkEligible({ ...reviewRow, options: null })).toBe(false);
  });

  it('rejects an answer that matches no option (exact-match grading invariant)', () => {
    expect(isBulkEligible({ ...reviewRow, answer: '20 ohms' })).toBe(false);
    expect(isBulkEligible({ ...reviewRow, answer: '' })).toBe(false);
    expect(isBulkEligible({ ...reviewRow, answer: null })).toBe(false);
  });

  it('matches the answer AFTER choice-label sanitization on both sides', () => {
    // Raw AI output with baked-in "A."/"B)" labels — sanitizer strips both
    // sides, so this row IS clean even though the raw strings differ.
    expect(isBulkEligible({
      ...reviewRow,
      options: ['A. 10 ohms', 'B) 0 ohms', '(C) Infinite'],
      answer: 'a: 10 ohms',
    })).toBe(true);
  });
});

describe('bulkIdsSchema — bounded batch payload', () => {
  it('accepts 1..200 non-empty ids', () => {
    expect(bulkIdsSchema.safeParse({ ids: ['a'] }).success).toBe(true);
    expect(bulkIdsSchema.safeParse({ ids: Array.from({ length: 200 }, (_, i) => `id-${i}`) }).success).toBe(true);
  });

  it('rejects an empty array, over-cap batches, empty-string ids, and a missing field', () => {
    expect(bulkIdsSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(bulkIdsSchema.safeParse({ ids: Array.from({ length: 201 }, (_, i) => `id-${i}`) }).success).toBe(false);
    expect(bulkIdsSchema.safeParse({ ids: [''] }).success).toBe(false);
    expect(bulkIdsSchema.safeParse({}).success).toBe(false);
  });
});
