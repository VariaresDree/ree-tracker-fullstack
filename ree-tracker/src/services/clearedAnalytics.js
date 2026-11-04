// src/services/clearedAnalytics.js
//
// What deleting analytics leaves on a device, for the device that pressed it (the
// store) and any other that later hears of it (analyticsSync). On its own because those
// two import each other's neighbours. Settings such as the exam plan aren't in it.
export const clearedAnalytics = () => ({
  globalStreak: 0,
  lastActiveDate: null,
  dailyMath: 0,
  dailyESAS: 0,
  dailyEE: 0,
  matrix: { hc: 0, hw: 0, lc: 0, lw: 0 },
  blindSpots: [],
  microTopics: {},
  activityCalendar: {},
  thetaHistory: [],
  totalAnswered: 0,
  totalCorrect: 0,
  irt: { theta: 0, consecutiveCorrect: 0, consecutiveWrong: 0 },
});
