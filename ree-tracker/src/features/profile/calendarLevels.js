// src/features/profile/calendarLevels.js
//
// How full a day looks on the study calendar, by its share of the daily
// target. Each level mixes the success button fill into the card and carries
// the ink that reads on it: the body text on the two light levels, the
// success ink on the two dense ones. White on the brand green, which this
// replaced, read at about 2.3:1. themeContrast.test.js holds every level to
// 4.5:1 in all 13 themes.
export const SUCCESS_FILL = 'color-mix(in srgb, var(--accent-success) 88%, black)';

export const CALENDAR_LEVELS = [
  { below: 0.3, share: 15, ink: 'var(--text-main)' },
  { below: 0.7, share: 30, ink: 'var(--text-main)' },
  { below: 1, share: 85, ink: 'var(--on-success)' },
  { below: Infinity, share: 100, ink: 'var(--on-success)' },
];

/** The level for `count` questions against a daily `target`, or null for none. */
export function calendarLevel(count, target) {
  if (!count) return null;
  const pct = count / (target || 1);
  return CALENDAR_LEVELS.find((l) => pct < l.below);
}

/** A level's background: the success fill at `share`% over the card. */
export const levelFill = (share) => (share >= 100 ? SUCCESS_FILL : `color-mix(in srgb, ${SUCCESS_FILL} ${share}%, var(--bg-surface))`);
