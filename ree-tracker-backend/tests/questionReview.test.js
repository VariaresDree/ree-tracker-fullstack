import { describe, it, expect } from 'vitest';
const { questionCreateSchema, isPendingReview } = require('../src/schemas/questionSchemas');

// Regression guard for the AI-quarantine bug: AI/vision ingestion sends
// status:'quarantined', but the schema used to DROP the field so those questions
// were created live and immediately drawable. Now the field survives validation
// and drives isFlagged so they route into the /quarantine review queue.

const goodQuestion = {
  subject: 'EE',
  subtopic: 'AC Circuits',
  text: 'What is the reactance of a 1H inductor at 60Hz?',
  options: ['377 ohms', '60 ohms', '1 ohm', '0 ohms'],
  answer: '377 ohms',
};

describe('questionCreateSchema — status lifecycle field', () => {
  it('preserves status:"quarantined" through validation + transform', () => {
    const parsed = questionCreateSchema.parse({ ...goodQuestion, status: 'quarantined' });
    expect(parsed.status).toBe('quarantined');
  });

  it('accepts a question with no status (manual path)', () => {
    const parsed = questionCreateSchema.parse(goodQuestion);
    expect(parsed.status).toBeUndefined();
  });

  it('rejects an unknown status value', () => {
    expect(questionCreateSchema.safeParse({ ...goodQuestion, status: 'live-now' }).success).toBe(false);
  });
});

describe('isPendingReview — routes quarantined questions away from live', () => {
  it('flags quarantined submissions', () => {
    expect(isPendingReview({ status: 'quarantined' })).toBe(true);
  });

  it('does not flag live/manual submissions', () => {
    expect(isPendingReview({ status: 'live' })).toBe(false);
    expect(isPendingReview({})).toBe(false);
    expect(isPendingReview(null)).toBe(false);
  });

  it('the handler maps a quarantined create to isFlagged=true', () => {
    // Mirrors questionRoutes POST: isFlagged: isPendingReview(data) || data.isFlagged || false
    const data = questionCreateSchema.parse({ ...goodQuestion, status: 'quarantined' });
    const isFlagged = isPendingReview(data) || data.isFlagged || false;
    expect(isFlagged).toBe(true);
  });
});
