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

describe('mapAttemptRows — leaderboard-integrity gate (SEC-2)', () => {
  // Theta (→ leaderboard rank) must derive exclusively from server-verifiable
  // evidence. Rather than zeroing an ungradable attempt's isCorrect at mapping
  // time (which also corrupted the user's own mastery signals), we now stamp
  // `_serverGraded`: any attempt without a re-gradable userAnswer is marked
  // NOT server-graded, and telemetryService excludes those rows from the theta
  // estimator — regardless of the `offline` flag a client may or may not send.
  it('an attempt claiming isCorrect WITHOUT a userAnswer is excluded from theta (offline flag irrelevant)', () => {
    const { mapped } = mapAttemptRows(
      [{ questionId: 'q1', isCorrect: true, offline: true }], // tampered/self-graded payload
      qMap, ctx,
    );
    expect(mapped[0]._serverGraded).toBe(false); // never reaches the ranked estimator
  });

  it('the same holds when the offline flag is omitted entirely (the old bypass)', () => {
    const { mapped } = mapAttemptRows(
      [{ questionId: 'q1', isCorrect: true }], // no userAnswer, no offline flag
      qMap, ctx,
    );
    expect(mapped[0]._serverGraded).toBe(false);
  });

  it('an attempt WITH a userAnswer is server-graded and eligible for theta', () => {
    const { mapped } = mapAttemptRows(
      [{ questionId: 'q1', userAnswer: 'A', isCorrect: false, offline: true }],
      qMap, ctx,
    );
    expect(mapped[0].isCorrect).toBe(true);      // master answer is 'A'
    expect(mapped[0]._serverGraded).toBe(true);
  });

  it('an unanswered item stays wrong (legit-client behavior unchanged)', () => {
    const { mapped } = mapAttemptRows(
      [{ questionId: 'q1', isCorrect: false, offline: true }],
      qMap, ctx,
    );
    expect(mapped[0].isCorrect).toBe(false);
    expect(mapped[0]._serverGraded).toBe(false);
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
