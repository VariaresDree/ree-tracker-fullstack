import { describe, it, expect } from 'vitest';
const { buildVersionSnapshot, toLiveQuestionData, CONTENT_FIELDS } = require('../src/services/reviewService');
const { reviewEditSchema, reviewApproveSchema, reviewRejectSchema } = require('../src/schemas/reviewSchemas');

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
