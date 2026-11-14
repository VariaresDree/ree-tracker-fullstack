// src/utils/scoreTone.js
//
// A score's colour against the board's two marks: at the pass average, under
// it, or under the subject floor. Four screens each spelled this with their
// own 70 and 50 (Session complete twice, an imported quiz's results, a mock's
// subject bars); the marks themselves live in @ree/shared (verdict.js).
import { GENERAL_AVERAGE, SUBJECT_FLOOR } from '@ree/shared';

/** 'success' | 'amber' | 'danger' for a percentage. */
export const scoreTone = (pct) => (pct >= GENERAL_AVERAGE ? 'success' : pct >= SUBJECT_FLOOR ? 'amber' : 'danger');
