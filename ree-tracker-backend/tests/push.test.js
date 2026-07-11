import { describe, it, expect } from 'vitest';
const { partitionSendResults, DEAD_TOKEN_CODES } = require('../src/services/pushService');
const { selectReminderRecipients } = require('../scripts/sendStreakReminders');
const { deviceTokenSchema } = require('../src/schemas/userSchemas');

describe('pushService.partitionSendResults', () => {
  const ok = { success: true };
  const dead = { success: false, error: { code: 'messaging/registration-token-not-registered' } };
  const transient = { success: false, error: { code: 'messaging/internal-error' } };

  it('splits delivered / dead (prunable) / transient failures by position', () => {
    const tokens = ['t1', 't2', 't3', 't4'];
    const { delivered, dead: prunable, failed } = partitionSendResults(tokens, [ok, dead, transient, ok]);
    expect(delivered).toEqual(['t1', 't4']);
    expect(prunable).toEqual(['t2']);
    expect(failed).toEqual(['t3']);
  });

  it('treats every documented dead-token code as prunable', () => {
    for (const code of DEAD_TOKEN_CODES) {
      const { dead: prunable } = partitionSendResults(['t'], [{ success: false, error: { code } }]);
      expect(prunable, code).toEqual(['t']);
    }
  });

  it('handles empty/mismatched inputs without throwing', () => {
    expect(partitionSendResults([], [])).toEqual({ delivered: [], dead: [], failed: [] });
    // extra responses beyond the token list are ignored
    const out = partitionSendResults(['t1'], [ok, ok]);
    expect(out.delivered).toEqual(['t1']);
  });
});

describe('sendStreakReminders.selectReminderRecipients', () => {
  const user = (over = {}) => ({
    id: 'u1', displayName: 'Agent', globalStreak: 5,
    deviceTokens: [{ token: 'tok' }],
    activityLogs: [], // pre-filtered to today's Manila date by the query
    ...over,
  });

  it('picks a user with a token, an active streak, and no activity today', () => {
    expect(selectReminderRecipients([user()])).toEqual([
      { id: 'u1', displayName: 'Agent', streak: 5 },
    ]);
  });

  it('skips users who already studied today (Manila-keyed ActivityLog row)', () => {
    expect(selectReminderRecipients([user({ activityLogs: [{ date: '2026-07-11' }] })])).toEqual([]);
  });

  it('skips users with no streak to protect and users with no device', () => {
    expect(selectReminderRecipients([user({ globalStreak: 0 })])).toEqual([]);
    expect(selectReminderRecipients([user({ deviceTokens: [] })])).toEqual([]);
  });

  it('is safe on empty/missing input', () => {
    expect(selectReminderRecipients([])).toEqual([]);
    expect(selectReminderRecipients(null)).toEqual([]);
  });
});

describe('deviceTokenSchema', () => {
  const TOKEN = 'f'.repeat(152); // realistic FCM token length

  it('accepts a token with a platform default of android', () => {
    const parsed = deviceTokenSchema.parse({ token: TOKEN });
    expect(parsed.platform).toBe('android');
  });

  it('accepts ios/web platforms and trims the token', () => {
    const parsed = deviceTokenSchema.parse({ token: `  ${TOKEN}  `, platform: 'ios' });
    expect(parsed.token).toBe(TOKEN);
    expect(parsed.platform).toBe('ios');
  });

  it('rejects short junk, oversized tokens, and unknown platforms', () => {
    expect(deviceTokenSchema.safeParse({ token: 'short' }).success).toBe(false);
    expect(deviceTokenSchema.safeParse({ token: 'x'.repeat(5000) }).success).toBe(false);
    expect(deviceTokenSchema.safeParse({ token: TOKEN, platform: 'blackberry' }).success).toBe(false);
  });
});
