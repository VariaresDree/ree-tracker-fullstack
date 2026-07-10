import { describe, it, expect } from 'vitest';
const { mapAttemptRows } = require('../src/services/telemetryHelpers');

// mapAttemptRows is the server-canonical mapping step of recordAttempts:
// grading comes from the master answer, and (Phase 3.3) subject/subtopic come
// from the MASTER question first — a stale offline client may still send a
// pre-taxonomy label, and trusting it would split a topic's telemetry.
const qMap = {
  q1: { id: 'q1', answer: 'A', difficulty: 1.5, subject: 'EE', subtopic: 'DC Electric Circuits', irtA: 1.1, irtB: 0.4, irtC: 0.2 },
  q2: { id: 'q2', answer: 'B', difficulty: 0.5, subject: 'Mathematics', subtopic: 'Algebra', irtA: null, irtB: null, irtC: null },
};
const ctx = { userId: 'u1', sessionId: 's1', mode: 'BOARD_SIM' };

describe('mapAttemptRows — server-canonical naming', () => {
  it('master subtopic wins over the client-sent (stale offline pack) label', () => {
    const { mapped } = mapAttemptRows(
      [{ questionId: 'q1', isCorrect: true, subject: 'EE', subtopic: 'Electric Circuits 1' }],
      qMap, ctx,
    );
    expect(mapped[0].subtopic).toBe('DC Electric Circuits');
  });

  it('master subject wins and is normalized to the canonical spelling', () => {
    const { mapped } = mapAttemptRows(
      [{ questionId: 'q2', isCorrect: true, subject: 'EE', subtopic: 'Algebra' }],
      qMap, ctx,
    );
    expect(mapped[0].subject).toBe('Mathematics');
    expect(mapped[0].subtopic).toBe('Algebra');
  });

  it('falls back to the client label only when the master has none', () => {
    const bare = { q3: { id: 'q3', answer: 'C', subject: '', subtopic: '' } };
    const { mapped } = mapAttemptRows(
      [{ questionId: 'q3', isCorrect: false, subject: 'ESAS', subtopic: 'Thermodynamics' }],
      bare, ctx,
    );
    expect(mapped[0].subject).toBe('ESAS');
    expect(mapped[0].subtopic).toBe('Thermodynamics');
  });

  it('defaults to General when neither side has a label', () => {
    const bare = { q3: { id: 'q3', answer: 'C', subject: '', subtopic: '' } };
    const { mapped } = mapAttemptRows([{ questionId: 'q3', isCorrect: false }], bare, ctx);
    expect(mapped[0].subject).toBe('General');
    expect(mapped[0].subtopic).toBe('General');
  });
});

describe('mapAttemptRows — offline-credit hardening (Phase 4.1 gate)', () => {
  // Leaderboard integrity: theta (→ leaderboard rank) must derive exclusively
  // from server-verifiable evidence. An offline attempt without a re-gradable
  // userAnswer can never claim credit, no matter what the client asserts.
  it('an offline attempt claiming isCorrect WITHOUT a userAnswer is zeroed', () => {
    const { mapped } = mapAttemptRows(
      [{ questionId: 'q1', isCorrect: true, offline: true }], // tampered payload
      qMap, ctx,
    );
    expect(mapped[0].isCorrect).toBe(false);
  });

  it('an offline attempt WITH a userAnswer is server-graded normally', () => {
    const { mapped } = mapAttemptRows(
      [{ questionId: 'q1', userAnswer: 'A', isCorrect: false, offline: true }],
      qMap, ctx,
    );
    expect(mapped[0].isCorrect).toBe(true); // master answer is 'A'
  });

  it('an ONLINE attempt without a userAnswer keeps the legacy trust path', () => {
    const { mapped } = mapAttemptRows(
      [{ questionId: 'q1', isCorrect: true }],
      qMap, ctx,
    );
    expect(mapped[0].isCorrect).toBe(true); // unchanged for non-offline surfaces
  });

  it('an unanswered offline item stays wrong (legit-client behavior unchanged)', () => {
    const { mapped } = mapAttemptRows(
      [{ questionId: 'q1', isCorrect: false, offline: true }],
      qMap, ctx,
    );
    expect(mapped[0].isCorrect).toBe(false);
  });
});

describe('mapAttemptRows — grading + shape (unchanged behavior)', () => {
  it('re-grades from the master answer and reports client drift', () => {
    const { mapped, gradeDiscrepancies } = mapAttemptRows(
      [{ questionId: 'q1', userAnswer: 'B', isCorrect: true, offline: true }],
      qMap, ctx,
    );
    expect(mapped[0].isCorrect).toBe(false); // server grade is canonical
    expect(gradeDiscrepancies).toEqual([
      { questionId: 'q1', client: true, server: false, offline: true },
    ]);
  });

  it('drops attempts with no master question and threads context + IRT params', () => {
    const { mapped } = mapAttemptRows(
      [{ questionId: 'missing', isCorrect: true }, { questionId: 'q1', isCorrect: true, timeSpentMs: '4200', clientAttemptId: 'c-1' }],
      qMap, ctx,
    );
    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({
      userId: 'u1', sessionId: 's1', mode: 'BOARD_SIM',
      timeSpentMs: 4200, clientAttemptId: 'c-1',
      _difficulty: 1.5, _a: 1.1, _b: 0.4, _c: 0.2,
    });
  });
});
