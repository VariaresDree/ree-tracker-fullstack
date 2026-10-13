// Focus time: the Pomodoro's focus blocks, logged with what they were for, so
// Progress › Habits can show how the time splits across the board's subjects
// beside the PRC weights (Mathematics 25%, ESAS 30%, EE 45%).
//
// A finished focus block counts in full. One stopped early (reset, or
// switched to a break) counts if it ran at least FOCUS_MIN_PARTIAL_MINUTES.

'use strict';

const FOCUS_SUBJECTS = ['General', 'Mathematics', 'ESAS', 'EE'];
const FOCUS_MIN_PARTIAL_MINUTES = 5;
/** The longest block the timer allows (its settings cap at 120 minutes), with room. */
const FOCUS_MAX_MINUTES = 180;

module.exports = { FOCUS_SUBJECTS, FOCUS_MIN_PARTIAL_MINUTES, FOCUS_MAX_MINUTES };
