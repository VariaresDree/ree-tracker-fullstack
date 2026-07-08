import { describe, it, expect } from 'vitest';
const { telemetryBulkSchema } = require('../src/schemas/telemetrySchemas');
const { gradeSchema } = require('../src/schemas/examSchemas');

describe('telemetryBulkSchema — clientAttemptId dedupe handle', () => {
  it('accepts and preserves clientAttemptId on attempts', () => {
    const parsed = telemetryBulkSchema.parse({
      mode: 'ACTIVE_REVIEW',
      attempts: [{ questionId: 'q1', clientAttemptId: 'sess1:q1', isCorrect: true }],
    });
    expect(parsed.attempts[0].clientAttemptId).toBe('sess1:q1');
  });

  it('still works without clientAttemptId (optional)', () => {
    const parsed = telemetryBulkSchema.parse({ attempts: [{ questionId: 'q1' }] });
    expect(parsed.attempts[0].clientAttemptId).toBeUndefined();
  });

  it('accepts and preserves the offline flag (defaults false)', () => {
    const on = telemetryBulkSchema.parse({ attempts: [{ questionId: 'q1', offline: true }] });
    expect(on.attempts[0].offline).toBe(true);
    const off = telemetryBulkSchema.parse({ attempts: [{ questionId: 'q1' }] });
    expect(off.attempts[0].offline).toBe(false);
  });
});

describe('telemetryBulkSchema — payload bounds', () => {
  it('accepts a full 500-item batch', () => {
    const attempts = Array.from({ length: 500 }, (_, i) => ({ questionId: `q${i}` }));
    expect(telemetryBulkSchema.safeParse({ attempts }).success).toBe(true);
  });

  it('rejects an oversized (>500) attempts array', () => {
    const attempts = Array.from({ length: 501 }, (_, i) => ({ questionId: `q${i}` }));
    expect(telemetryBulkSchema.safeParse({ attempts }).success).toBe(false);
  });

  it('rejects a multi-KB userAnswer (per-field cap)', () => {
    const r = telemetryBulkSchema.safeParse({
      attempts: [{ questionId: 'q1', userAnswer: 'x'.repeat(501) }],
    });
    expect(r.success).toBe(false);
  });
});

describe('gradeSchema — must not strip gauntlet confidence/time', () => {
  it('preserves confidenceLevel and timeSpentMs (validate() replaces req.body)', () => {
    const parsed = gradeSchema.parse({
      answers: [{ questionId: 'q1', userAnswer: 'A', confidenceLevel: 'HIGH', timeSpentMs: 4200, clientAttemptId: 'sess-abc:q1' }],
      mode: 'GAUNTLET',
    });
    expect(parsed.answers[0]).toMatchObject({
      confidenceLevel: 'HIGH',
      timeSpentMs: 4200,
      clientAttemptId: 'sess-abc:q1',
    });
  });

  it('rejects an out-of-enum confidence', () => {
    const r = gradeSchema.safeParse({
      answers: [{ questionId: 'q1', userAnswer: 'A', confidenceLevel: 'SUPER' }],
    });
    expect(r.success).toBe(false);
  });
});
