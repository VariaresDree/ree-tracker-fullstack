// Unit tests for the local-reminder gate. On the web this module must be a
// guaranteed no-op — the pure guard enforces that, so it gets locked in here.
// Capacitor is mocked to a web platform so the test stays hermetic in jsdom.
import { describe, it, expect, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    isPluginAvailable: () => false,
    getPlatform: () => 'web',
  },
}));

import {
  shouldScheduleReminder,
  scheduleDailyReminder,
  cancelDailyReminder,
  DAILY_REMINDER_ID,
} from './localReminders';

describe('shouldScheduleReminder — the native/enabled gate', () => {
  it('requires BOTH a native platform and the reminder enabled', () => {
    expect(shouldScheduleReminder({ isNative: true, enabled: true })).toBe(true);
    expect(shouldScheduleReminder({ isNative: false, enabled: true })).toBe(false);
    expect(shouldScheduleReminder({ isNative: true, enabled: false })).toBe(false);
  });

  it('treats a missing/undefined enabled as off (fails closed)', () => {
    expect(shouldScheduleReminder({ isNative: true, enabled: undefined })).toBe(false);
  });
});

describe('local reminders on the web', () => {
  it('scheduleDailyReminder is a no-op (returns false)', async () => {
    await expect(scheduleDailyReminder({ hour: 8, minute: 0 })).resolves.toBe(false);
  });

  it('cancelDailyReminder is a no-op (returns false)', async () => {
    await expect(cancelDailyReminder()).resolves.toBe(false);
  });

  it('exposes a stable reminder id for schedule/cancel parity', () => {
    expect(DAILY_REMINDER_ID).toBe(1001);
  });
});
