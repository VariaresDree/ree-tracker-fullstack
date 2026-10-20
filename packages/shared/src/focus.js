// Focus time: the Pomodoro's focus blocks, logged with what they were for, so
// Progress › Habits can show how the time splits across the board's subjects
// beside the PRC weights (Mathematics 25%, ESAS 30%, EE 45%).
//
// A finished focus block counts in full. One stopped early (reset, skipped, or
// switched to another mode) counts if it ran at least FOCUS_MIN_PARTIAL_MINUTES.
// A paper exam timed on the focus timer counts too, under its section's subject.

'use strict';

const { PRC_EXAM_FORMAT } = require('./exam');

const FOCUS_SUBJECTS = ['General', 'Mathematics', 'ESAS', 'EE'];
const FOCUS_MIN_PARTIAL_MINUTES = 5;
/**
 * The longest block the timer can log: the longest PRC section (EE, 6 hours),
 * timed as a paper exam. Focus and break lengths the learner sets stay 1-120
 * minutes (the timer's settings). The server refuses a block over this, and
 * the device drops a block the server refuses, so this must ship to the server
 * no later than to the app.
 */
const FOCUS_MAX_MINUTES = Math.max(...Object.values(PRC_EXAM_FORMAT).map((f) => f.minutes));

module.exports = { FOCUS_SUBJECTS, FOCUS_MIN_PARTIAL_MINUTES, FOCUS_MAX_MINUTES };
